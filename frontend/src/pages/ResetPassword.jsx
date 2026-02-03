import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            await axios.post(`${API_URL}/api/auth/reset-password`, { token, newPassword });
            setMessage('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
            <div className="glass" style={{ padding: '40px', maxWidth: '450px', width: '100%', height: 'fit-content', borderRadius: '16px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Set New Password 🔑</h2>

                {message && <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{message}</div>}
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
