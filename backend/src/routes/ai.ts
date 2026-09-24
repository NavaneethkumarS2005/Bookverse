import express, { Request, Response } from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';
import { body, validationResult } from 'express-validator';
import { generateEmbedding } from '../utils/embeddings.js';

const router = express.Router();

// ─── MODEL PROVIDER SETUP ─────────────────────────────────────────────────────
const getOpenRouterApiKey = () => process.env.OPENROUTER_API_KEY?.trim() || process.env.OPENROUTER_KEY?.trim();
const getOpenRouterModel = () => process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini';
const getGeminiApiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
const getGeminiModel = () => process.env.GEMINI_MODEL?.trim() || 'gemini-2.0-flash';

type DiscoveryIntent = 'books' | 'upcoming_books' | 'authors' | 'publishers' | 'fairs' | 'booths';

const detectIntent = (message: string): DiscoveryIntent => {
    const text = message.toLowerCase();
    if (/upcoming|pre[ -]?order|releas(e|ing|es)/.test(text)) return 'upcoming_books';
    if (/author|writer|novelist/.test(text)) return 'authors';
    if (/publisher|publishing house|imprint/.test(text)) return 'publishers';
    if (/fair|festival|expo|exhibition/.test(text)) return 'fairs';
    if (/booth|stall|where.*available|availability at/.test(text)) return 'booths';
    return 'books';
};

const toSafeSearchRegex = (message: string) => {
    const ignored = new Set(['show', 'find', 'book', 'books', 'about', 'with', 'from', 'that', 'this', 'please', 'where', 'available', 'availability']);
    const words = message.replace(/[^\w\s-]/g, '').split(/\s+/).filter(word => word.length > 2 && !ignored.has(word.toLowerCase())).slice(0, 6);
    return words.length ? new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i') : /.*/i;
};

const extractBudget = (message: string): number | null => {
    const normalized = message.toLowerCase();
    const priceMatch = normalized.match(/(?:under|below|within|upto|up to|less than|\<=)\s*₹?\s*(\d{2,6})/i)
        || normalized.match(/₹\s*(\d{2,6})/i);

    if (!priceMatch) return null;
    const value = Number(priceMatch[1]);
    return Number.isFinite(value) ? value : null;
};

const extractKeywords = (message: string): string[] => {
    const stopWords = new Set(['recommend', 'recommendation', 'suggest', 'suggestion', 'book', 'books', 'read', 'reader', 'please', 'show', 'find', 'me', 'want', 'good', 'best', 'under', 'budget', 'for', 'about', 'novel', 'story', 'from', 'with', 'that', 'this', 'i', 'a', 'an', 'the', 'and', 'or']);
    return message
        .toLowerCase()
        .replace(/[^a-z0-9\s₹]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.has(word))
        .slice(0, 8);
};

const inferPreferredMood = (message: string, history: any[] = []): string => {
    const combined = `${message} ${history.map((entry: any) => entry?.text || '').join(' ')}`.toLowerCase();
    const moodMap: Array<[RegExp, string]> = [
        [/fantasy|magic|dragons|myth|epic/, 'fantasy'],
        [/thriller|suspense|mystery|detective|crime/, 'thriller'],
        [/romance|love|heartwarming|feel-good/, 'romance'],
        [/self-help|motivation|growth|mindset|productivity/, 'self-help'],
        [/non-fiction|history|biography|science|business/, 'non-fiction'],
        [/horror|scary|spooky|dark/, 'horror'],
        [/humor|funny|comedy|light/, 'lighthearted'],
        [/poetry|literature|classic|philosophy/, 'literary'],
        [/tech|ai|startup|programming|coding/, 'tech'],
    ];

    for (const [pattern, label] of moodMap) {
        if (pattern.test(combined)) return label;
    }

    const keywords = extractKeywords(message);
    return keywords[0] || 'popular';
};

const GENRE_ALIASES: Record<string, string[]> = {
    fantasy: ['fantasy', 'magic', 'dragon', 'myth', 'epic', 'adventure'],
    thriller: ['thriller', 'suspense', 'mystery', 'detective', 'crime', 'whodunit'],
    romance: ['romance', 'love', 'lovestory', 'heartwarming', 'feel good', 'relationship'],
    'self-help': ['self help', 'self-help', 'motivation', 'mindset', 'growth', 'productivity'],
    'non-fiction': ['non-fiction', 'non fiction', 'history', 'biography', 'science', 'business', 'essay', 'memoir'],
    horror: ['horror', 'scary', 'spooky', 'dark', 'ghost', 'haunting'],
    literary: ['poetry', 'literature', 'classic', 'philosophy', 'literary', 'poem'],
    tech: ['technology', 'tech', 'ai', 'artificial intelligence', 'coding', 'programming', 'startup', 'software'],
    'sci-fi': ['sci-fi', 'scifi', 'science fiction', 'future', 'space', 'dystopian', 'cyberpunk'],
    fiction: ['fiction', 'novel', 'story', 'contemporary', 'drama'],
    mystery: ['mystery', 'murder', 'intrigue', 'puzzle', 'secret'],
    history: ['history', 'historical', 'ancient', 'war', 'empire'],
    classic: ['classic', 'timeless', 'literary classic'],
};

const getGenreSignals = (message: string): string[] => {
    const normalized = message.toLowerCase();
    const hits = new Set<string>();

    Object.entries(GENRE_ALIASES).forEach(([canonical, aliases]) => {
        const matched = aliases.some(alias => normalized.includes(alias));
        if (matched) hits.add(canonical);
    });

    return Array.from(hits);
};

const scoreBookForQuery = (book: any, message: string, queryTerms: string[] = []): number => {
    const text = `${book.title || ''} ${book.author || ''} ${(book.genre || '')} ${(book.genres || []).join(' ')} ${book.description || ''} ${book.metadata?.publisherSummary || ''}`.toLowerCase();
    const signals = [...new Set([...(queryTerms.length ? queryTerms : getGenreSignals(message)), ...getGenreSignals(message)])];

    let score = 0;

    for (const term of signals) {
        const aliases = new Set([term, ...(GENRE_ALIASES[term] || [])]);
        const matches = [...aliases].some(alias => text.includes(alias.toLowerCase()));
        if (matches) score += 30;

        if ((book.genre || '').toLowerCase().includes(term) || (book.genres || []).some((g: string) => g.toLowerCase().includes(term))) {
            score += 20;
        }

        if ((book.title || '').toLowerCase().includes(term)) score += 12;
        if ((book.author || '').toLowerCase().includes(term)) score += 8;
    }

    for (const term of queryTerms) {
        if (!term) continue;
        if (text.includes(term.toLowerCase())) score += 10;
    }

    if (typeof book.price === 'number' && Number(book.price) <= 1500) score += 3;
    if (typeof book.rating === 'number' && book.rating >= 4.5) score += 2;

    return score;
};

const rankBooksForMessage = async (message: string, budget: number | null) => {
    const allBooks = await Book.find()
        .select('title author genre genres price description rating metadata')
        .lean();

    const requestedTerms = extractKeywords(message);
    const genreSignals = getGenreSignals(message);
    const signalTerms = [...new Set([...requestedTerms, ...genreSignals])];

    const ranked = allBooks
        .map((book: any) => ({
            book,
            score: scoreBookForQuery(book, message, signalTerms) + (budget && Number(book.price) <= budget ? 8 : 0)
        }))
        .filter((entry) => entry.score > 0 || signalTerms.length === 0)
        .sort((a, b) => (b.score - a.score) || (Number(b.book.rating || 0) - Number(a.book.rating || 0)))
        .map((entry) => entry.book)
        .slice(0, 6);

    return ranked;
};

const buildRecommendationReply = (books: any[], message: string, budget: number | null, history: any[] = []) => {
    const mood = inferPreferredMood(message, history);
    const budgetText = budget ? ` under ₹${budget}` : '';

    if (!books.length) {
        return `I couldn’t find an exact ${mood}${budgetText} match, but I can still point you toward some strong picks from our bestselling shelf.`;
    }

    const top = books.slice(0, 3).map((book) => {
        const title = book.title || 'Untitled book';
        const author = book.author || 'Unknown author';
        const price = typeof book.price === 'number' ? `₹${book.price}` : 'Price available';
        return `${title} by ${author} (${price})`;
    }).join(', ');

    return `I’d go with ${top}. They match the ${mood} vibe you’re looking for${budgetText}, and I can narrow it even more if you want something darker, lighter, or more emotional.`;
};

const queryDiscovery = async (intent: DiscoveryIntent, message: string) => {
    const regex = toSafeSearchRegex(message);
    
    if (intent === 'upcoming_books') {
        return {
            type: 'upcoming_book',
            items: await UpcomingBook.find({
                $or: [
                    { title: regex },
                    { 'metadata.publisherSummary': regex },
                    { 'metadata.teaser': regex }
                ]
            }).limit(6),
            actions: ['view', 'preorder', 'wishlist']
        };
    }
    
    if (intent === 'authors') {
        return {
            type: 'author',
            items: await Author.find({
                $or: [
                    { name: regex },
                    { genres: regex },
                    { bio: regex },
                    { nationality: regex }
                ]
            }).limit(6),
            actions: ['view_author']
        };
    }
    
    if (intent === 'publishers') {
        return {
            type: 'publisher',
            items: await Publisher.find({
                $or: [
                    { name: regex },
                    { genres: regex },
                    { description: regex },
                    { country: regex }
                ]
            }).limit(6),
            actions: ['view_publisher']
        };
    }
    
    if (intent === 'fairs') {
        return {
            type: 'fair',
            items: await BookFair.find({
                $or: [
                    { name: regex },
                    { 'location.city': regex },
                    { 'location.country': regex },
                    { description: regex }
                ]
            }).limit(6),
            actions: ['view_fair']
        };
    }
    
    if (intent === 'booths') {
        return {
            type: 'booth',
            items: await Booth.find({
                $or: [
                    { boothNumber: regex },
                    { section: regex },
                    { floor: regex },
                    { specialNotes: regex }
                ]
            }).populate('fairId').populate('publisherId').limit(6),
            actions: ['view_booth']
        };
    }
    
    // Default: books
    return {
        type: 'book',
        items: await Book.find({
            $or: [
                { title: regex },
                { author: regex },
                { genres: regex },
                { 'metadata.publisherSummary': regex }
            ]
        }).limit(6),
        actions: ['view', 'add_to_cart', 'wishlist']
    };
};

// ─── BOOKSTORE SYSTEM PROMPT ──────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite, highly conversational, deeply knowledgeable AI Book Concierge for BookVerse in India.

Your intelligence profile matches frontier assistants like ChatGPT and Gemini.

USER PROFILE:
- Current logged-in customer: {USER_NAME}
- If the customer name is "Guest", politely ask for their name early in the conversation so you can personalize the experience.

KNOWLEDGE BASE & LIVE INVENTORY:
Here is the real-time catalog fetched directly from our store's database:
{BOOK_CATALOG}

OPERATIONAL CAPABILITIES:
1. EXPLAIN & ANSWER: If a user asks about literary themes, genres, writing styles, or cultural ideas, provide deep, insightful, and easy-to-read explanations.
2. RECOMMENDATION ENGINE: Actively analyze the user's preferences. Cross-reference their taste with the provided inventory list's descriptions, genres, ratings, and price points to find the best matches.
3. INVENTORY AWARENESS: Recommend only books that exist in the live inventory above. Never invent books, pricing, stock, or facts. If a title is low in stock, subtlely mention it without making up numbers.

RESPONSE GUIDELINES:
- Maintain a warm, intellectual, and helpful tone.
- Never invent books or facts not present in the inventory list.
- Use clean Markdown formatting for titles and lists so it renders perfectly on the screen.
- Keep replies concise but rich, usually 2-6 sentences or a short bullet list.
- Use a personal, human touch: "I’d recommend...", "This one fits your vibe...", "If you like..."
- Use ₹ currency formatting.
- If the user asks a non-book question, gently redirect back to books, reading experience, or store policies.

STORE POLICIES:
- Shipping: Free on all orders, 3-5 business days
- Returns: 7-day return policy for undamaged books
- Payment: PhonePe, Credit/Debit Card via Stripe, and Cash on Delivery

Always greet the customer warmly by their name if it is provided.`;

// ─── ROUTE ───────────────────────────────────────────────────────────────────
router.post('/chat', [
    body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters.'),
    body('customerName').optional().isString().trim().isLength({ min: 1, max: 80 }).withMessage('Customer name must be between 1 and 80 characters.'),
    body('history').optional().isArray({ max: 10 }).withMessage('History must contain no more than 10 messages.')
], async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const customerName = typeof req.body?.customerName === 'string' && req.body.customerName.trim()
            ? req.body.customerName.trim()
            : (typeof req.body?.userName === 'string' && req.body.userName.trim() ? req.body.userName.trim() : 'Guest');
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
        
        const openRouterApiKey = getOpenRouterApiKey();
        const geminiApiKey = getGeminiApiKey();
        const useOpenRouter = Boolean(openRouterApiKey);
        const useGemini = Boolean(geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here');

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const intent = detectIntent(message);
        
        if (intent !== 'books') {
            const result = await queryDiscovery(intent, message);
            const items = result.items.map((item: any) => item.toObject ? item.toObject() : item);
            return res.json({
                success: true,
                reply: items.length ? `Here are ${items.length} ${intent.replace('_', ' ')} I found.` : `I couldn't find matching ${intent.replace('_', ' ')} yet.`,
                intent,
                results: items.map((data: any) => ({ type: result.type, data, actions: result.actions })),
                powered_by: 'catalog'
            });
        }

        let booksFound: any[] = [];
        let bookCatalog = "The catalog is currently empty.";

        try {
            // Generate embedding for user query
            const queryVector = await generateEmbedding(message);
            
            // Perform vector search
            if (queryVector && queryVector.length > 0 && queryVector.some(v => v !== 0)) {
                booksFound = await Book.aggregate([
                    {
                        $vectorSearch: {
                            index: 'vector_index',
                            path: 'embedding',
                            queryVector: queryVector,
                            numCandidates: 100,
                            limit: 10
                        }
                    }
                ]);
            }
        } catch (err) {
            console.warn('Vector search failed in AI chat (missing index?), falling back to classic search.', err);
        }

        if (booksFound.length === 0) {
            booksFound = await rankBooksForMessage(message, extractBudget(message));
            if (booksFound.length === 0) {
                booksFound = await Book.find().limit(10);
            }
        }

        if (booksFound.length > 0) {
            bookCatalog = booksFound.map(b => `- "${b.title}" by ${b.author} | Genres: ${(b.genres || []).join(', ')} | Price: ₹${b.price}${b.description ? ` | About: ${b.description.substring(0, 80)}` : ''}`).join('\n');
        }

        const systemPromptWithCatalog = SYSTEM_PROMPT
            .replace('{USER_NAME}', customerName || 'Guest')
            .replace('{BOOK_CATALOG}', bookCatalog);

        // FAQ responses
        const faqResponses: { [key: string]: string } = {
            'shipping': 'Shipping is free on all orders and takes 3-5 business days across India.',
            'return': 'We offer a 7-day return policy for undamaged books. Contact our support team to start a return.',
            'payment': 'BookVerse accepts PhonePe, Credit/Debit Card payments through Stripe, and Cash on Delivery.',
            'order': 'You can view your orders in the Orders page once you are logged in.',
            'sell': 'You can sell books through the Sell page. Just fill in the details and submit your book for listing.'
        };

        const lowerMessage = message.toLowerCase();
        let faqReply = null;
        for (const [key, value] of Object.entries(faqResponses)) {
            if (lowerMessage.includes(key)) {
                faqReply = value;
                break;
            }
        }

        if (faqReply) {
            return res.json({ success: true, reply: faqReply, intent: 'faq', results: [], powered_by: 'catalog' });
        }

        let isGeminiFallback = false;
        let fallbackReason: string | undefined;

        // Try OpenRouter first, because it is the active key configured for this project.
        if (useOpenRouter) {
            try {
                const providerHistory = Array.isArray(history)
                    ? history.filter((h: any) => typeof h?.text === 'string' && h.text.length <= 500).map((h: any) => ({
                        role: h.isBot ? 'assistant' : 'user',
                        content: h.text
                    }))
                    : [];

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openRouterApiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
                        'X-Title': 'LuminaBook AI'
                    },
                    body: JSON.stringify({
                        model: getOpenRouterModel(),
                        messages: [
                            { role: 'system', content: systemPromptWithCatalog },
                            ...providerHistory,
                            { role: 'user', content: message }
                        ],
                        temperature: 0.7,
                        max_tokens: 700
                    })
                });

                const payload = await response.json();
                if (!response.ok) {
                    throw new Error(payload?.error?.message || 'OpenRouter request failed');
                }

                const reply = payload?.choices?.[0]?.message?.content;
                if (!reply || typeof reply !== 'string' || !reply.trim()) {
                    throw new Error('OpenRouter returned an empty response');
                }

                const result = await queryDiscovery('books', message);
                return res.json({
                    success: true,
                    reply,
                    intent: 'books',
                    results: result.items.map((book: any) => ({ type: 'book', data: book.toObject(), actions: result.actions })),
                    powered_by: 'openrouter'
                });

            } catch (openRouterError: any) {
                console.error('OpenRouter API Error:', openRouterError.message);
                isGeminiFallback = true;
                fallbackReason = 'gemini_unavailable';
            }
        } else if (useGemini) {
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const geminiModel = getGeminiModel();

                const chatHistory = Array.isArray(history) ? history.filter((h: any) => typeof h?.text === 'string' && h.text.length <= 500).map((h: any) => ({
                    role: h.isBot ? 'model' : 'user',
                    parts: [{ text: h.text }]
                })) : [];

                const response = await ai.models.generateContent({
                    model: geminiModel,
                    contents: [
                        ...chatHistory,
                        { role: 'user', parts: [{ text: message }] }
                    ],
                    config: {
                        systemInstruction: systemPromptWithCatalog,
                        maxOutputTokens: 2048,
                    }
                });

                const extractText = (payload: any): string => {
                    if (!payload) return "I'm sorry, I couldn't generate a response.";
                    if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim();
                    if (typeof payload.outputText === 'string' && payload.outputText.trim()) return payload.outputText.trim();
                    if (Array.isArray(payload.output)) {
                        for (const item of payload.output) {
                            if (item?.content && Array.isArray(item.content)) {
                                for (const part of item.content) {
                                    if (typeof part?.text === 'string' && part.text.trim()) return part.text.trim();
                                }
                            }
                        }
                    }
                    return "I'm sorry, I couldn't generate a response.";
                };

                const reply = extractText(response);
                const result = await queryDiscovery('books', message);
                return res.json({
                    success: true,
                    reply,
                    intent: 'books',
                    results: result.items.map((book: any) => ({ type: 'book', data: book.toObject(), actions: result.actions })),
                    powered_by: 'gemini'
                });

            } catch (geminiError: any) {
                console.error("Gemini API Error:", geminiError.message);
                isGeminiFallback = true;
                fallbackReason = 'gemini_unavailable';
            }
        } else {
            isGeminiFallback = true;
            fallbackReason = 'gemini_unavailable';
        }

        // Fallback if LLM failed
        let fallbackBooksFound = booksFound;

        let isSearchFallback = false;
        if (fallbackBooksFound.length === 0) {
            const broadQuery: any = {};
            const budget = extractBudget(message);
            if (budget) broadQuery.price = { $lte: budget };
            fallbackBooksFound = await Book.find(broadQuery).sort({ rating: -1, price: 1 }).limit(5);
            isSearchFallback = true;
        }

        let reply = '';
        if (fallbackBooksFound.length > 0) {
            reply = buildRecommendationReply(fallbackBooksFound, message, extractBudget(message), history || []);
            if (isGeminiFallback) {
                reply += "\n\nThese are local catalog suggestions for you right now.";
            }
        } else {
            reply = "I'm sorry, our store is currently empty. Please check back soon!";
        }

        return res.json({
            success: true,
            reply,
            intent: 'books',
            results: fallbackBooksFound.map(book => ({ type: 'book', data: typeof book.toObject === 'function' ? book.toObject() : book, actions: ['view', 'add_to_cart', 'wishlist'] })),
            powered_by: 'fallback',
            fallback_reason: fallbackReason || 'local_search'
        });

    } catch (error: any) {
        console.error("AI Chat Error:", error.message);
        res.status(500).json({ success: false, message: "Error processing your request" });
    }
});

export default router;