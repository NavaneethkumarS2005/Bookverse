import express, { Request, Response } from 'express';
import Book from '../models/Book';

const router = express.Router();

// ─── GEMINI AI SETUP ────────────────────────────────────────────────────────
const getGeminiApiKey = () => process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

// ─── BOOKSTORE SYSTEM PROMPT (Persona Training) ──────────────────────────────
const SYSTEM_PROMPT = `You are "BookBot", the expert AI assistant for BookVerse, an online bookstore based in India.

Your personality:
- Warm, helpful, and knowledgeable about books
- Concise — your replies should be short and to the point (3-5 sentences max)
- You always recommend books available in the store when relevant
- You speak with enthusiasm about books

Rules you MUST follow:
1. ONLY answer questions related to books, reading, the BookVerse store, purchases, orders, shipping, or returns.
2. If someone asks something completely unrelated (e.g., politics, coding, sports), politely redirect them: "I'm specialized in books! Can I help you find a great read?"
3. Always use ₹ (Indian Rupee) for prices.
4. If a user asks for recommendations, use the BOOK CATALOG provided below to suggest specific books.
5. You can suggest multiple books and describe them briefly.
6. If a book from the catalog matches, always mention its title, author, and price.
7. For store policy questions:
   - Shipping: Free on all orders, 3-5 business days
   - Returns: 7-day return policy for undamaged books
   - Payment: PhonePe, Credit/Debit Card (Stripe), and Cash on Delivery

BOOK CATALOG (current inventory):
{BOOK_CATALOG}

Always be helpful. If you don't find an exact match, suggest the closest alternatives from the catalog.`;

// ─── ROUTE ───────────────────────────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const geminiApiKey = getGeminiApiKey();
        const useGemini = Boolean(geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here');

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        // 1. Fetch the current book catalog from DB to give AI full context
        const books = await Book.find().select('title author genre price description').limit(50);
        const bookCatalog = books.length > 0
            ? books.map(b => `- "${b.title}" by ${b.author} | Genre: ${b.genre} | Price: ₹${b.price}${b.description ? ` | About: ${b.description.substring(0, 80)}` : ''}`).join('\n')
            : "The catalog is currently empty.";

        const systemPromptWithCatalog = SYSTEM_PROMPT.replace('{BOOK_CATALOG}', bookCatalog);

        const buildFaqReply = (text: string) => {
            const normalized = text.toLowerCase();
            const faqMap = [
                {
                    keywords: ['shipping', 'deliver', 'delivery'],
                    answer: 'Shipping is free on all orders and takes 3-5 business days across India.'
                },
                {
                    keywords: ['return', 'returns', 'refund'],
                    answer: 'We offer a 7-day return policy for undamaged books. Contact our support team to start a return.'
                },
                {
                    keywords: ['payment', 'stripe', 'phonepe', 'cod', 'cash on delivery'],
                    answer: 'BookVerse accepts PhonePe, Credit/Debit Card payments through Stripe, and Cash on Delivery.'
                },
                {
                    keywords: ['order status', 'track order', 'my order', 'order history'],
                    answer: 'You can view your orders in the Orders page once you are logged in. Order updates appear there.'
                },
                {
                    keywords: ['selling', 'sell book', 'upload book'],
                    answer: 'You can sell books through the Sell page. Just fill in the details and submit your book for listing.'
                }
            ];

            const matched = faqMap.find(entry => entry.keywords.some(k => normalized.includes(k)));
            return matched ? matched.answer : null;
        };

        const faqResponse = buildFaqReply(message);
        if (faqResponse) {
            return res.json({ success: true, reply: faqResponse, powered_by: 'fallback', fallback_reason: 'faq' });
        }

        let geminiErrorMessage = '';
        let isGeminiFallback = false;

        // 2. Use Gemini AI if API key is configured
        if (useGemini) {
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });

                // Build conversation history for context
                const chatHistory = Array.isArray(history) ? history.map((h: any) => ({
                    role: h.isBot ? 'model' : 'user',
                    parts: [{ text: h.text }]
                })) : [];

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [
                        ...chatHistory,
                        { role: 'user', parts: [{ text: message }] }
                    ],
                    config: {
                        systemInstruction: systemPromptWithCatalog,
                        temperature: 0.7,
                        maxOutputTokens: 500,
                    }
                });

                const extractGeminiText = (payload: any): string => {
                    if (!payload) return "";
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
                    if (Array.isArray(payload.results)) {
                        for (const result of payload.results) {
                            if (result?.content && Array.isArray(result.content)) {
                                for (const part of result.content) {
                                    if (typeof part?.text === 'string' && part.text.trim()) return part.text.trim();
                                }
                            }
                        }
                    }
                    return "I'm sorry, I couldn't generate a response.";
                };

                const reply = extractGeminiText(response);
                return res.json({ success: true, reply, powered_by: 'gemini' });

            } catch (geminiError: any) {
                console.error("Gemini API Error:", geminiError.message);
                console.error("Gemini API Full Error:", JSON.stringify(geminiError, null, 2));
                geminiErrorMessage = geminiError.message || 'Unknown Gemini error';
                isGeminiFallback = true;
            }
        } else {
            console.warn('Gemini is not configured or is using a placeholder API key. Falling back to local search.');
            isGeminiFallback = true;
        }

        // 3. Smart fallback (no API key or Gemini failed): search the DB intelligently
        const stopWords = [
            'i', 'want', 'a', 'book', 'books', 'about', 'some', 'the', 'is', 'are', 'do', 'you',
            'have', 'any', 'can', 'get', 'show', 'me', 'recommend', 'suggest', 'please', 'find', 'based', 'on', 'for'
        ];
        const words = message.toLowerCase().replace(/[^\w\s-]/g, '').split(/\s+/);
        const searchTerms = words.filter((w: string) => !stopWords.includes(w) && w.length > 2);

        const regexQueries = searchTerms.length > 0
            ? searchTerms.map((term: string) => ({
                $or: [
                    { title: { $regex: term, $options: 'i' } },
                    { author: { $regex: term, $options: 'i' } },
                    { genre: { $regex: term, $options: 'i' } },
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
                if (useGemini) {
                    reply += "\nGemini is configured, but it was unavailable. These results are from the local catalog instead.";
                    if (geminiErrorMessage) {
                        reply += `\n(Error: ${geminiErrorMessage})`;
                    }
                } else {
                    reply += "\nGemini AI is not configured on the backend. This answer is generated from the local store data.";
                }
            } else {
                reply += "\nYou can find these in our Marketplace.";
            }
        } else {
            reply = "I'm sorry, our store is currently empty. Please check back soon!";
        }

        const responsePayload: any = {
            success: true,
            reply,
            powered_by: 'fallback',
            fallback_reason: isGeminiFallback ? 'gemini_unavailable' : 'local_search'
        };
        if (geminiErrorMessage) {
            responsePayload.gemini_error = geminiErrorMessage;
        }

        return res.json(responsePayload);

    } catch (error: any) {
        console.error("AI Chat Error:", error.message);
        res.status(500).json({ success: false, message: "Error processing your request" });
    }
});

export default router;
