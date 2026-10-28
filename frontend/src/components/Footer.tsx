import React from 'react';
import { Link } from 'react-router-dom';
import { FaInstagram, FaGithub, FaLinkedin, FaWhatsapp } from 'react-icons/fa6';

const Footer: React.FC = () => {
    return (
        <footer className="lumina-footer mt-20 border-t border-[#E7E1D8] bg-[#F7F3EC] py-16 transition-colors duration-300  ">
            <div className="max-w-7xl mx-auto px-5">
                <div className="mb-14 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
                    {/* Column 1: Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <Link to="/" className="mb-4 inline-block font-serif text-3xl font-bold tracking-tight text-[#29243A] ">
                            Lumina Book AI
                        </Link>
                        <p className="mb-2 max-w-xs text-sm font-medium text-[#716B7E] ">
                            Stories worth keeping close.
                        </p>
                        <p className="max-w-xs leading-relaxed text-[#716B7E]  transition-colors">
                            Discover books by mood, trade used treasures, and read with a thoughtful AI-native bookstore built for modern readers.
                        </p>
                    </div>



                    {/* Column 3: Connect */}
                    <div>
                        <h4 className="font-outfit font-bold text-lg text-slate-800  mb-6">Connect</h4>
                        <div className="flex gap-4 mb-6">
                            <a href="https://wa.me/918015050605?text=Hello%20Lumina%20Book%20AI%2C%20I%20need%20help%20finding%20a%20book." target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white  border border-slate-200  flex items-center justify-center text-slate-600  hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm" aria-label="WhatsApp support"><FaWhatsapp /></a>
                            <a
                                href="https://www.linkedin.com/in/navaneeth-kumar-s-98751b399/"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white  border border-slate-200  flex items-center justify-center text-slate-600  hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="LinkedIn"
                            >
                                <FaLinkedin />
                            </a>
                            <a
                                href="https://github.com/NavaneethkumarS2005"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white  border border-slate-200  flex items-center justify-center text-slate-600  hover:bg-slate-900 hover:border-slate-900 hover:text-white    transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="GitHub"
                            >
                                <FaGithub />
                            </a>
                            <a
                                href="https://www.instagram.com/s_navaneethkumar?igsh=ZWY1YXzYXcxY25m"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white  border border-slate-200  flex items-center justify-center text-slate-600  hover:bg-pink-600 hover:border-pink-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
                                aria-label="Instagram"
                            >
                                <FaInstagram />
                            </a>
                            <a
                                href="https://leetcode.com/u/Navaneeth_kumar_2005/"
                                target="_blank"
                                rel="noreferrer"
                                className="w-10 h-10 rounded-full bg-white  border border-slate-200  flex items-center justify-center text-slate-600  hover:bg-amber-500 hover:border-amber-500 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm"
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
                        <p className="text-sm text-slate-500 ">
                            Questions? <a href="mailto:support@bookverse.com" className="text-indigo-600  hover:underline">support@bookverse.com</a>
                        </p>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200  flex flex-col md:flex-row justify-between items-center text-sm text-slate-500  gap-5">
                    <p>© {new Date().getFullYear()} Lumina Book AI. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-indigo-600  transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-indigo-600  transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
