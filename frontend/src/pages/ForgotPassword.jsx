import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
            setMessage('Password reset link has been sent to your email.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset link. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
            <div className="glass" style={{ padding: '40px', maxWidth: '450px', width: '100%', height: 'fit-content', borderRadius: '16px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Forgot Password? 🔒</h2>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '30px' }}>
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {message && <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{message}</div>}
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Back to Login</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
