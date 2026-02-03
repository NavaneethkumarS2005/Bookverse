import React from 'react';
import { Link } from 'react-router-dom';
import { FaXTwitter, FaInstagram, FaGithub, FaLinkedin } from 'react-icons/fa6';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Column 1: Brand */}
                    <div className="footer-brand">
                        <Link to="/" className="logo text-gradient" style={{ fontSize: '1.8rem', marginBottom: '16px', display: 'inline-block' }}>
                            BookVerse
                        </Link>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '300px' }}>
                            Your premier destination for discovering, buying, and selling books. Join our community of readers today.
                        </p>
                    </div>



                    {/* Column 4: Socials */}
                    <div className="footer-col">
                        <h4>Connect</h4>
                        <div className="social-links">
                            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="X (Twitter)"><FaXTwitter /></a>
                            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Instagram"><FaInstagram /></a>
                            <a href="https://github.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="GitHub"><FaGithub /></a>
                            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn"><FaLinkedin /></a>
                        </div>
                        <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <a href="mailto:support@bookverse.com" style={{ color: 'var(--primary)' }}>support@bookverse.com</a>
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} BookVerse. All rights reserved.</p>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
