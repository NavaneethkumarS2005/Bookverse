import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaGithub, FaLinkedin } from 'react-icons/fa6';

const Footer: React.FC = () => {
    return (
        <footer className="mt-20 py-20 border-t border-slate-200 bg-slate-100 dark:bg-slate-950 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
                    {/* Column 1: Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="inline-block font-outfit text-3xl font-extrabold tracking-tighter bg-gradient-to-br from-indigo-600 to-pink-500 bg-clip-text text-transparent mb-4">
                            BookVerse
                        </Link>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs transition-colors">
                            Your premier destination for discovering, buying, and selling books. Join our community of readers today.
                        </p>
                    </div>



                    {/* Column 3: Connect */}
                    <div>
                        <h4 className="font-outfit font-bold text-lg text-slate-800 dark:text-white mb-6">Connect</h4>
                        <div className="flex gap-4 mb-6">
                            <a
                                href="https://www.linkedin.com/in/navaneeth-kumar-98751b399"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="LinkedIn"
                            >
                                <FaLinkedin />
                            </a>
                            <a
                                href="https://github.com/NavaneethkumarS2005"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-900 hover:border-slate-900 hover:text-white dark:hover:bg-white dark:hover:border-white dark:hover:text-slate-900 transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="GitHub"
                            >
                                <FaGithub />
                            </a>
                            <a
                                href="https://www.instagram.com/s_navaneethkumar?igsh=ZWY1YXzYXcxY25m"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="Instagram"
                            >
                                <FaInstagram />
                            </a>
                            <a
                                href="https://leetcode.com/u/Navaneeth_kumar_2005/"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-amber-500 hover:border-amber-500 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="LeetCode"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                    className="w-5 h-5"
                                >
                                    <path
                                        d="M15.5 3.25a.75.75 0 0 1 0 1.06L10.06 9.75l2.69 2.69a.75.75 0 1 1-1.06 1.06l-3.22-3.22a.75.75 0 0 1 0-1.06l6.97-6.97a.75.75 0 0 1 1.06 0Z"
                                        fill="currentColor"
                                    />
                                    <path
                                        d="M18.75 14a3.75 3.75 0 1 1-3.75-3.75.75.75 0 0 1 0 1.5 2.25 2.25 0 1 0 2.25 2.25.75.75 0 0 1 1.5 0Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </a>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Questions? <a href="mailto:support@bookverse.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@bookverse.com</a>
                        </p>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500 dark:text-slate-400 gap-5">
                    <p>© {new Date().getFullYear()} BookVerse. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
