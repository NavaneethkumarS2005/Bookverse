import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { FiBook, FiShoppingCart, FiSun, FiMoon, FiMenu, FiX, FiUser, FiLogOut, FiShoppingBag, FiGrid, FiPhone, FiPackage, FiCompass, FiChevronDown } from 'react-icons/fi';

interface User {
    name: string;
    email: string;
    role: 'user' | 'admin';
}

const Navbar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const { cart, toggleCart } = useCart();
    const { theme, toggleTheme } = useTheme();
    const user = JSON.parse(localStorage.getItem('user') || 'null') as User | null;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);



    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 font-outfit
                ${scrolled
                    ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm h-[72px]'
                    : 'bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-transparent h-[80px]'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">

                {/* Logo Section */}
                <Link to="/" className="flex items-center gap-2.5 group shrink-0" onClick={closeMenu}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                        <FiBook className="text-xl" />
                    </div>
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight">
                        BookVerse
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex min-w-0 items-center justify-center gap-1">
                    <NavLink to="/" icon={<FiBook />} label="Home" active={location.pathname === '/'} />
                    <NavLink to="/marketplace" icon={<FiShoppingBag />} label="Marketplace" active={location.pathname === '/marketplace'} />
                    <NavLink to="/categories" icon={<FiGrid />} label="Categories" active={location.pathname === '/categories'} />
                    <details className="group relative">
                        <summary className="list-none cursor-pointer px-3 py-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center gap-2"><FiCompass /><span>Discover</span><FiChevronDown className="transition-transform group-open:rotate-180" /></summary>
                        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-xl">
                            <ExploreLink to="/upcoming-books" label="Upcoming books" /><ExploreLink to="/authors" label="Authors" /><ExploreLink to="/publishers" label="Publishers" /><ExploreLink to="/book-fairs" label="Book fairs" />
                        </div>
                    </details>
                    <NavLink to="/contact" icon={<FiPhone />} label="Contact" active={location.pathname === '/contact'} />
                </div>

                {/* Right Actions */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? <FiMoon className="text-xl" /> : <FiSun className="text-xl" />}
                    </button>

                    <button
                        onClick={toggleCart}
                        className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        aria-label="Open cart"
                    >
                        <FiShoppingCart className="text-xl" />
                        {cart.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
                                {cart.length}
                            </span>
                        )}
                    </button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

                    {user ? (
                        <details className="group relative">
                            <summary className="list-none cursor-pointer rounded-full p-1 outline-none ring-offset-2 transition hover:ring-2 hover:ring-indigo-500/30">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md" title="Account menu">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            </summary>
                            <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
                                <AccountLink to="/profile" icon={<FiUser />} label="My profile" />
                                <AccountLink to="/orders" icon={<FiPackage />} label="My orders" />
                                <button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); window.location.href = '/login'; }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><FiLogOut /> Log out</button>
                            </div>
                        </details>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="hidden sm:flex px-5 py-2.5 rounded-full font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all text-sm shadow-md shadow-indigo-500/20 active:scale-95 items-center gap-2">
                                <FiUser /> <span>Login</span>
                            </Link>
                        </div>
                    )}

                    <button
                        type="button"
                        className="lg:hidden p-2.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={toggleMenu}
                    >
                        {isMenuOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <div className={`fixed inset-x-0 top-[72px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl lg:hidden transition-all duration-300 ease-in-out origin-top ${isMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden'}`}>
                <div className="px-4 py-6 space-y-2">
                    <MobileNavLink to="/" icon={<FiBook />} label="Home" onClick={closeMenu} />
                    <MobileNavLink to="/marketplace" icon={<FiShoppingBag />} label="Marketplace" onClick={closeMenu} />
                    <MobileNavLink to="/categories" icon={<FiGrid />} label="Categories" onClick={closeMenu} />
                    <MobileNavLink to="/upcoming-books" icon={<FiBook />} label="Upcoming books" onClick={closeMenu} />
                    <MobileNavLink to="/authors" icon={<FiUser />} label="Authors" onClick={closeMenu} />
                    <MobileNavLink to="/publishers" icon={<FiPackage />} label="Publishers" onClick={closeMenu} />
                    <MobileNavLink to="/book-fairs" icon={<FiGrid />} label="Book fairs" onClick={closeMenu} />
                    <MobileNavLink to="/contact" icon={<FiPhone />} label="Contact" onClick={closeMenu} />

                    {user && (
                        <>
                            <div className="my-4 border-t border-slate-100 dark:border-slate-800"></div>
                            <MobileNavLink to="/profile" icon={<FiUser />} label="My Profile" onClick={closeMenu} />
                            <MobileNavLink to="/orders" icon={<FiPackage />} label="My Orders" onClick={closeMenu} />
                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('user');
                                        localStorage.removeItem('token');
                                        window.location.href = '/login';
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 font-medium transition-colors"
                                >
                                    <FiLogOut className="text-lg" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </>
                    )}

                    {!user && (
                        <div className="pt-4">
                            <Link to="/login" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20" onClick={closeMenu}>
                                <FiUser />
                                <span>Login / Register</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

// Sub-components for cleaner code
const NavLink = ({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) => (
    <Link
        to={to}
        className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group
            ${active
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
    >
        <span className={`${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{icon}</span>
        {label}
    </Link>
);

const MobileNavLink = ({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) => (
    <Link
        to={to}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
    >
        <span className="text-lg text-slate-400">{icon}</span>
        {label}
    </Link>
);

const ExploreLink = ({ to, label }: { to: string; label: string }) => <Link to={to} className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800">{label}</Link>;

const AccountLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => <Link to={to} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800">{icon}{label}</Link>;

export default Navbar;
