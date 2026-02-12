import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
// @ts-ignore
import { API_URL } from '../config';

const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validatePassword = (password: string) => {
        // Regex: At least one uppercase, one lowercase, one number, one special char, min 8 chars
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // Password Validation for Sign Up
        if (!isLogin && !validatePassword(formData.password)) {
            setMessage('Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.');
            setLoading(false);
            return;
        }

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const url = `${API_URL}${endpoint}`;

        try {
            const payload = isLogin
                ? { email: formData.email, password: formData.password }
                : formData;

            const response = await axios.post(url, payload);

            if (isLogin) {
                // Save user info/token
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
                setMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    navigate('/marketplace');
                    window.location.reload(); // Force reload to update Navbar state
                }, 1000);
            } else {
                setMessage('Registration successful! Please login.');
                setIsLogin(true);
                setFormData({ name: '', email: '', password: '' });
            }
        } catch (err: any) {
            console.error(err);
            const backendError = err.response?.data?.error;
            const backendMessage = err.response?.data?.message;

            if (backendError && backendError.includes('E11000')) {
                setMessage('Email already registered. Please login instead.');
            } else {
                setMessage(backendError ? `${backendMessage}: ${backendError}` : (backendMessage || 'Something went wrong'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-20 px-5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                {/* Decorative background blur */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <h2 className="text-center mb-8 text-3xl font-outfit font-bold text-slate-900 dark:text-white relative z-10">
                    {isLogin ? 'Welcome Back' : 'Join the BookVerse'}
                </h2>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 text-center text-sm font-medium relative z-10 ${message.includes('success') || message.includes('sent')
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                value={formData.name}
                                onChange={handleChange}
                                required={!isLogin}
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-12"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-[34px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                            {showPassword ? '👁️' : '🔒'}
                        </button>
                        {!isLogin && <p className="text-xs text-slate-500 mt-2 ml-1">
                            Use 8+ chars, upper, lower, number, special symbol.
                        </p>}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 to-indigo-600 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm shadow-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>

                    {isLogin && (
                        <div className="text-center mt-4">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                    )}
                </form>

                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-slate-600 dark:text-slate-400 text-sm relative z-10">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                        className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline bg-transparent border-none cursor-pointer"
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
