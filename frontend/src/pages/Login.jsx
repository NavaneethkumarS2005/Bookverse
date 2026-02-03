import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

const Login = () => {
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

    const validatePassword = (password) => {
        // Regex: At least one uppercase, one lowercase, one number, one special char, min 8 chars
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return regex.test(password);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // Forgot Password Flow


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
                setTimeout(() => navigate('/marketplace'), 1500);
            } else {
                setMessage('Registration successful! Please login.');
                setIsLogin(true);
                setFormData({ name: '', email: '', password: '' });
            }
        } catch (err) {
            console.error(err);
            // Show specific error from backend if available (e.g., "E11000 duplicate key")
            const backendError = err.response?.data?.error;
            const backendMessage = err.response?.data?.message;

            if (backendError && backendError.includes('E11000')) {
                setMessage('Email already registered. Please login instead.');
            } else {
                // If we have a specific error details, show that. Otherwise show the generic message.
                // Or show both: "Error registering user: <details>"
                setMessage(backendError ? `${backendMessage}: ${backendError}` : (backendMessage || 'Something went wrong'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ paddingTop: '100px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="container">
            <div className="glass" style={{ padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '450px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '2rem' }}>
                    {isLogin ? 'Welcome Back' : 'Join the Community'}
                </h2>

                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        background: message.includes('success') || message.includes('sent') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: message.includes('success') || message.includes('sent') ? '#10B981' : '#EF4444',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                    }}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                value={formData.name}
                                onChange={handleChange}
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ position: 'relative' }}>
                        <label className="form-label">Password</label>
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            className="form-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '15px',
                                top: '38px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '1.2rem'
                            }}
                        >
                            {showPassword ? '👁️' : '🔒'}
                        </button>
                        {!isLogin && <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '5px', display: 'block' }}>
                            Use 8+ chars, upper, lower, number, special symbol.
                        </small>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '10px' }}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                    </button>

                    {isLogin && (
                        <Link
                            to="/forgot-password"
                            style={{ display: 'block', width: '100%', marginTop: '15px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'underline' }}
                        >
                            Forgot Password?
                        </Link>
                    )}
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setMessage(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                    >
                        {isLogin ? 'Sign Up' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
