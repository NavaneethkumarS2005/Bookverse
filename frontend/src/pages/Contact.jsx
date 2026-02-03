import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [popup, setPopup] = useState({ show: false, message: '', type: 'success' }); // type: success | error

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const showPopupMessage = (msg, type) => {
        setPopup({ show: true, message: msg, type });
        setTimeout(() => {
            setPopup({ ...popup, show: false });
        }, 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        showPopupMessage("Sending...", "info");

        try {
            // Using axios with proxy configured in vite.config.js for dev, and env var for prod
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const res = await axios.post(`${apiUrl}/api/contact`, formData);

            if (res.status === 201 || res.status === 200) {
                showPopupMessage("Message sent successfully ✔", "success");
                setFormData({ name: '', email: '', message: '' });
            }
        } catch (error) {
            console.error(error);
            showPopupMessage("Server error. Try again later ❌", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // Inline styles for the specific popup logic we verified earlier
    const popupStyle = {
        position: 'fixed !important',
        bottom: '20px !important',
        right: '20px !important',
        top: 'auto !important',
        background: 'white',
        padding: '15px 25px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 9999,
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        color: popup.type === 'error' ? '#dc2626' : (popup.type === 'info' ? '#d97706' : '#16a34a')
    };

    return (
        <>
            {/* Navbar handled by App layout */}

            <header className="hero" style={{ minHeight: '25vh', paddingBottom: '10px' }}>
                <div className="container hero-inner" style={{ display: 'block', textAlign: 'center' }}>

                    <div className="hero-text animate-fade-in visible" style={{ margin: 'auto' }}>
                        <h1>Get in <span className="text-gradient">Touch</span></h1>
                        <p style={{ marginInline: 'auto' }}>Have a question about an order or a listing? We're here to help.</p>
                    </div>
                </div>
            </header>

            <section className="section" style={{ paddingTop: '10px' }}>
                <div className="container form-container">

                    {popup.show && (
                        <div className="toast-popup" style={popupStyle}>
                            {popup.message}
                        </div>
                    )}

                    <form id="contactForm" className="glass" style={{ padding: '40px', borderRadius: '20px' }} onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                id="name"
                                className="form-input"
                                placeholder="Your Name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="form-input"
                                placeholder="your@email.com"
                                required
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Message</label>
                            <textarea
                                id="message"
                                className="form-textarea"
                                placeholder="How can we help?"
                                required
                                value={formData.message}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
                            disabled={isLoading}
                        >
                            {isLoading ? "Sending..." : "Send Message"}
                        </button>
                        <div style={{ marginTop: '20px', textAlign: 'center' }}>
                            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>
                                ← Back to Home
                            </Link>
                        </div>
                    </form>

                </div>
            </section>
        </>
    );
};

export default Contact;
