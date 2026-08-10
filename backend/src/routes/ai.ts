import express, { Request, Response } from 'express';
import Book from '../models/Book.js';
import Author from '../models/Author.js';
import Publisher from '../models/Publisher.js';
import UpcomingBook from '../models/UpcomingBook.js';
import BookFair from '../models/BookFair.js';
import Booth from '../models/Booth.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// ─── GEMINI AI SETUP ────────────────────────────────────────────────────────
const getGeminiApiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

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
const SYSTEM_PROMPT = `You are "BookBot", the expert AI assistant for BookVerse, an online bookstore based in India.

Your personality:
- Warm, helpful, and knowledgeable about books
- Concise — your replies should be short and to the point (3-5 sentences max)
- You always recommend books available in the store when relevant
- You speak with enthusiasm about books

Rules you MUST follow:
1. ONLY answer questions related to books, reading, the BookVerse store, purchases, orders, shipping, or returns.
2. If someone asks something completely unrelated, politely redirect them.
3. Always use ₹ (Indian Rupee) for prices.
4. If a user asks for recommendations, use the BOOK CATALOG provided below.
5. For store policy questions:
   - Shipping: Free on all orders, 3-5 business days
   - Returns: 7-day return policy for undamaged books
   - Payment: PhonePe, Credit/Debit Card (Stripe), and Cash on Delivery

BOOK CATALOG (current inventory):
{BOOK_CATALOG}

Always be helpful. If you don't find an exact match, suggest the closest alternatives.`;

// ─── ROUTE ───────────────────────────────────────────────────────────────────
router.post('/chat', [
    body('message').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters.'),
    body('history').optional().isArray({ max: 10 }).withMessage('History must contain no more than 10 messages.')
], async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ success: false, message: errors.array()[0].msg });
        
        const geminiApiKey = getGeminiApiKey();
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

        // Fetch book catalog
        const books = await Book.find()
            .select('title author genres price description')
            .limit(50);
        
        const bookCatalog = books.length > 0
            ? books.map(b => `- "${b.title}" by ${b.author} | Genres: ${(b.genres || []).join(', ')} | Price: ₹${b.price}${b.description ? ` | About: ${b.description.substring(0, 80)}` : ''}`).join('\n')
            : "The catalog is currently empty.";

        const systemPromptWithCatalog = SYSTEM_PROMPT.replace('{BOOK_CATALOG}', bookCatalog);

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

        // Try Gemini AI
        if (useGemini) {
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });

                const chatHistory = Array.isArray(history) ? history.filter((h: any) => typeof h?.text === 'string' && h.text.length <= 500).map((h: any) => ({
                    role: h.isBot ? 'model' : 'user',
                    parts: [{ text: h.text }]
                })) : [];

                const response = await ai.models.generateContent({
                    model: 'gemini-3.6-flash',
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
            }
        } else {
            isGeminiFallback = true;
        }

        // Fallback: local search
        const stopWords = ['i', 'want', 'a', 'book', 'books', 'about', 'some', 'the', 'is', 'are', 'do', 'you',
            'have', 'any', 'can', 'get', 'show', 'me', 'recommend', 'suggest', 'please', 'find', 'based', 'on', 'for'];
        const words = message.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/);
        const searchTerms = words.filter((w: string) => !stopWords.includes(w) && w.length > 2);

        const regexQueries = searchTerms.length > 0
            ? searchTerms.map((term: string) => ({
                $or: [
                    { title: { $regex: term, $options: 'i' } },
                    { author: { $regex: term, $options: 'i' } },
                    { genres: { $regex: term, $options: 'i' } },
                    { description: { $regex: term, $options: 'i' } }
                ]
            }))
            : [];

        let booksFound: any[] = [];
        if (regexQueries.length > 0) {
            booksFound = await Book.find({ $or: regexQueries }).limit(5);
        }

        let isSearchFallback = false;
        if (booksFound.length === 0) {
            booksFound = await Book.find().limit(5);
            isSearchFallback = true;
        }

        let reply = '';
        if (booksFound.length > 0) {
            reply = isSearchFallback
                ? "I couldn't find exact matches, but here are some great books from our collection:\n\n"
                : "Here are some great books from our collection:\n\n";

            booksFound.forEach(book => {
                reply += `📚 "${book.title}" by ${book.author} — ₹${book.price}\n`;
            });

            if (isGeminiFallback) {
                reply += "\nThese results are from the local catalog.";
            }
        } else {
            reply = "I'm sorry, our store is currently empty. Please check back soon!";
        }

        return res.json({
            success: true,
            reply,
            intent: 'books',
            results: booksFound.map(book => ({ type: 'book', data: book.toObject(), actions: ['view', 'add_to_cart', 'wishlist'] })),
            powered_by: 'fallback'
        });

    } catch (error: any) {
        console.error("AI Chat Error:", error.message);
        res.status(500).json({ success: false, message: "Error processing your request" });
    }
});

export default router;