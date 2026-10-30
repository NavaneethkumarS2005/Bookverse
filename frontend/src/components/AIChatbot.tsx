import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMessageCircle, FiX } from 'react-icons/fi';
import { useCart } from '../context/CartContext';
import BookCover from './BookCover';
// @ts-ignore
import { API_URL } from '../config';

interface Message {
    id: string;
    text: string;
    isBot: boolean;
    meta?: string;
    results?: DiscoveryResult[];
}

interface DiscoveryResult { type: 'book' | 'upcoming_book' | 'author' | 'publisher' | 'fair' | 'booth'; data: any; actions: string[]; }

const AIChatbot: React.FC = () => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const getCustomerName = () => {
        try {
            const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
            return savedUser?.name?.trim() || 'Guest';
        } catch {
            return 'Guest';
        }
    };
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: getCustomerName() === 'Guest'
                ? 'Hi! I’m your LuminaBook reading buddy. Tell me your name and what kind of book mood you’re in today, and I’ll suggest something worth your time.'
                : `Hi ${getCustomerName()}! I’m your LuminaBook reading buddy. Tell me what kind of book mood you’re in today, and I’ll suggest something worth your time.`,
            isBot: true
        }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [botStatus, setBotStatus] = useState<string>('Ready to help you discover your next favorite read');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const shouldAutoScroll = container.scrollHeight - (container.scrollTop + container.clientHeight) <= 80;
        if (shouldAutoScroll) {
            scrollToBottom();
        }
    }, [messages, isTyping]);

    // Initialize Speech Recognition
    useEffect(() => {
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onstart = () => {
                setIsListening(true);
            };

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                // Optionally auto-send after voice input
                // handleSendMessage(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    };

    const handleSendMessage = async (textToSubmit: string = input) => {
        if (!textToSubmit.trim()) return;

        const newUserMsg: Message = { id: Date.now().toString(), text: textToSubmit, isBot: false };
        const updatedMessages = [...messages, newUserMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsTyping(true);
        setBotStatus('Thinking...');

        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        try {
            const res = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    message: textToSubmit,
                    customerName: getCustomerName(),
                    history: updatedMessages.slice(-8).map((entry) => ({
                        text: entry.text,
                        isBot: entry.isBot
                    }))
                })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.message || 'The chatbot service is unavailable.');
            }

            setIsTyping(false);
            if (data.success) {
                const metaParts: string[] = [];
                if (data.powered_by === 'gemini') {
                    metaParts.push('Gemini AI');
                } else if (data.powered_by === 'fallback') {
                    if (data.fallback_reason === 'faq') {
                        metaParts.push('FAQ fallback');
                    } else if (data.fallback_reason === 'gemini_unavailable') {
                        metaParts.push('Gemini unavailable');
                    } else if (data.fallback_reason === 'local_search') {
                        metaParts.push('Local catalog fallback');
                    }
                }
                const statusLabel = metaParts.length ? metaParts.join(' · ') : 'Replied successfully';
                setBotStatus(statusLabel);

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    text: data.reply,
                    isBot: true,
                    meta: metaParts.length ? metaParts.join(' · ') : undefined,
                    results: Array.isArray(data.results) ? data.results : undefined
                }]);
            } else {
                setBotStatus('Server error');
                setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I couldn't process that request.", isBot: true, meta: 'Error' }]);
            }
        } catch (error: any) {
            setIsTyping(false);
            const timedOut = error?.name === 'AbortError';
            setBotStatus(timedOut ? 'Response timed out' : 'Unable to connect');
            setMessages(prev => [...prev, { id: Date.now().toString(), text: timedOut ? 'The assistant took too long to respond. Please try again.' : "I couldn’t connect right now. Please try again shortly.", isBot: true, meta: 'Connection issue' }]);
        } finally {
            window.clearTimeout(timeout);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white  w-80 sm:w-96 rounded-2xl shadow-2xl border border-slate-200  mb-4 overflow-hidden flex flex-col transition-all duration-300 min-h-0 max-h-[70vh] h-[min(70vh,32rem)]">
                    {/* Header */}
                    <div className="shrink-0 bg-[#171713] p-4 text-[#f4efe5] flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <FiMessageCircle className="text-2xl" aria-hidden="true" />
                            <div>
                                <h3 className="font-bold text-lg">LuminaBook AI</h3>
                                <p className="text-xs text-[#cec5b7]">{botStatus}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-slate-200 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-slate-50 ">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isBot
                                    ? 'bg-white  text-slate-800  rounded-tl-none border border-slate-100  shadow-sm'
                                    : 'bg-[#171713] text-[#f4efe5] rounded-tr-none shadow-md'}`}>
                                    {msg.text}
                                    {msg.meta && (
                                        <div className="text-[10px] mt-2 text-slate-400 ">
                                            {msg.meta}
                                        </div>
                                    )}
                                    {msg.results?.map((result, index) => {
                                        const item = result.data;
                                        const id = item._id || item.id;
                                        const target = result.type === 'book' ? `/book/${id}`
                                            : result.type === 'upcoming_book' ? '/upcoming-books'
                                            : result.type === 'author' ? `/authors/${id}`
                                            : result.type === 'publisher' ? `/publishers/${id}`
                                            : result.type === 'fair' ? `/book-fairs/${id}` : `/booths/${id}`;
                                        const title = item.title || item.name || item.boothNumber || 'Discovery result';
                                        const subtitle = item.author || item.city || item.publisherId?.name || item.fairId?.name || item.genre;
                                        const image = item.image || item.coverImage || item.profileImage || item.logo;
                                        return <div key={`${id}-${index}`} className="mt-3 overflow-hidden rounded-xl border border-slate-200  bg-slate-50 ">
                                            <div className="flex gap-2 p-2">
                                                {image && result.type === 'book' ? (
                                                    <BookCover image={image} title={title} author={subtitle} className="h-14 w-10 flex-shrink-0" alt="" />
                                                ) : image ? (
                                                    <img src={image} alt="" className="h-14 w-10 rounded object-cover" />
                                                ) : null}
                                                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{title}</div><div className="truncate text-xs text-slate-500">{subtitle}{item.price || item.expectedPrice ? ` · ₹${item.price || item.expectedPrice}` : ''}</div></div>
                                            </div>
                                            <div className="flex gap-2 border-t border-slate-200  p-2">
                                                <button onClick={() => { navigate(target); setIsOpen(false); }} className="rounded-[2px] bg-[#171713] px-2 py-1 text-xs font-semibold text-[#fffdf8]">View</button>
                                                {result.type === 'book' && item.fulfillment !== 'external' && <button onClick={() => addToCart(item).catch(() => setBotStatus('Could not add to cart'))} className="rounded-lg border border-[#cec5b7] px-2 py-1 text-xs font-semibold text-[#171713] hover:border-[#7d2428] hover:text-[#7d2428]">Add to cart</button>}
                                                {result.type === 'upcoming_book' && <button onClick={() => navigate('/upcoming-books')} className="rounded-lg border border-[#cec5b7] px-2 py-1 text-xs font-semibold text-[#171713] hover:border-[#7d2428] hover:text-[#7d2428]">Pre-order</button>}
                                            </div>
                                        </div>;
                                    })}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white  p-3 rounded-2xl rounded-tl-none border border-slate-100  shadow-sm flex gap-1 items-center h-10">
                                    <div className="w-2 h-2 bg-[#78806a] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-[#78806a] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-[#78806a] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-3 bg-white  border-t border-slate-200 ">
                        <div className="flex items-center gap-2 bg-slate-100  rounded-full px-4 py-2">
                            {recognitionRef.current && (
                                <button
                                    onClick={toggleListen}
                                    className={`focus:outline-none transition-colors ${isListening ? 'text-[#7d2428] animate-pulse' : 'text-slate-400 hover:text-[#171713] '}`}
                                    title="Click to speak"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={isListening ? "Listening..." : "Ask me anything..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800  placeholder-slate-400  outline-none"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!input.trim()}
                                className={`flex items-center justify-center w-8 h-8 rounded-full ${input.trim() ? 'bg-[#171713] text-[#fffdf8] shadow-md hover:bg-[#7d2428]' : 'bg-slate-200  text-slate-400'} transition-colors`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`lumina-chat-toggle flex h-14 w-14 items-center justify-center rounded-full text-xl transition hover:-translate-y-1 active:translate-y-0 ${isOpen ? 'lumina-chat-toggle-open' : ''}`}
                aria-label={isOpen ? 'Close LuminaBook AI chat' : 'Open LuminaBook AI chat'}
                aria-pressed={isOpen}
            >
                {isOpen ? <FiX aria-hidden="true" /> : <FiMessageCircle aria-hidden="true" />}
            </button>
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(-5%); }
                    50% { transform: translateY(0); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite;
                }
            `}} />
        </div>
    );
};

export default AIChatbot;
