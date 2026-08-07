import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { API_URL } from '../config';

interface Message {
    id: string;
    text: string;
    isBot: boolean;
    meta?: string;
}

const AIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Hello! I am your BookVerse AI assistant. How can I help you today?', isBot: true }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [botStatus, setBotStatus] = useState<string>('Ready to answer your BookVerse questions');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
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

        try {
            const res = await fetch(`${API_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: textToSubmit,
                    history: updatedMessages.slice(-10) // Send last 10 messages as context
                })
            });
            const data = await res.json();
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
                if (data.gemini_error) {
                    metaParts.push('Error: ' + data.gemini_error);
                }

                const statusLabel = metaParts.length ? metaParts.join(' · ') : 'Replied successfully';
                setBotStatus(statusLabel);

                setMessages(prev => [...prev, {
                    id: Date.now().toString(),
                    text: data.reply,
                    isBot: true,
                    meta: metaParts.length ? metaParts.join(' · ') : undefined
                }]);
            } else {
                setBotStatus('Server error');
                setMessages(prev => [...prev, { id: Date.now().toString(), text: "Sorry, I couldn't process that request.", isBot: true, meta: 'Error' }]);
            }
        } catch (error: any) {
            setIsTyping(false);
            setBotStatus('Unable to connect');
            setMessages(prev => [...prev, { id: Date.now().toString(), text: error.message || "Network error. Please try again later.", isBot: true, meta: 'Error' }]);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white dark:bg-slate-900 w-80 sm:w-96 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 mb-4 overflow-hidden flex flex-col transition-all duration-300">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-pink-500 p-4 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <div>
                                <h3 className="font-bold text-lg">BookVerse AI</h3>
                                <p className="text-xs text-indigo-100">{botStatus}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-slate-200 focus:outline-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 h-80 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isBot 
                                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm' 
                                    : 'bg-indigo-600 text-white rounded-tr-none shadow-md'}`}>
                                    {msg.text}
                                    {msg.meta && (
                                        <div className="text-[10px] mt-2 text-slate-400 dark:text-slate-500">
                                            {msg.meta}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1 items-center h-10">
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2">
                            {recognitionRef.current && (
                                <button 
                                    onClick={toggleListen}
                                    className={`focus:outline-none transition-colors ${isListening ? 'text-pink-500 animate-pulse' : 'text-slate-400 hover:text-indigo-500 dark:text-slate-500'}`}
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
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                            />
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={!input.trim()}
                                className={`flex items-center justify-center w-8 h-8 rounded-full ${input.trim() ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} transition-colors`}
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
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' : 'bg-gradient-to-r from-indigo-600 to-pink-500 text-white animate-bounce-slow'}`}
            >
                {isOpen ? '✕' : '🤖'}
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
