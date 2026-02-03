import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const SellBook = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        price: '',
        genre: '',
        image: '',
        reviews: 0,
        rating: 4.5
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Basic Validation
        if (!formData.title || !formData.author || !formData.price || !formData.genre) {
            alert("Please fill in all required fields.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    price: Number(formData.price),
                    id: Date.now() // Temporary ID generation on client if server doesn't handle it well, but server logic adds one too. 
                    // Actually server logic adds id: count + 1 + Date.now(). Let's send basic data.
                })
            });

            if (response.ok) {
                alert("Book listed successfully!");
                navigate('/marketplace');
            } else {
                const data = await response.json();
                alert(`Failed to list book: ${data.message}`);
            }
        } catch (error) {
            console.error("Error listing book:", error);
            alert("Error listing book. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ paddingTop: '100px', minHeight: '90vh', display: 'flex', justifyContent: 'center', paddingBottom: '50px' }} className="container">
            <div className="glass" style={{ width: '100%', maxWidth: '600px', padding: '40px', borderRadius: '20px' }}>
                <h1 style={{ marginBottom: '30px', textAlign: 'center', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sell Your Book</h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Book Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g. The Alchemist"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Author *</label>
                        <input
                            type="text"
                            name="author"
                            value={formData.author}
                            onChange={handleChange}
                            placeholder="e.g. Paulo Coelho"
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Price (₹) *</label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="499"
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                                required
                                min="1"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Genre *</label>
                            <select
                                name="genre"
                                value={formData.genre}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                                required
                            >
                                <option value="">Select Genre</option>
                                <option value="Fiction">Fiction</option>
                                <option value="Non-Fiction">Non-Fiction</option>
                                <option value="Sci-Fi">Sci-Fi</option>
                                <option value="Mystery">Mystery</option>
                                <option value="Fantasy">Fantasy</option>
                                <option value="Biography">Biography</option>
                                <option value="History">History</option>
                                <option value="Tech">Tech</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Cover Image *</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                const formData = new FormData();
                                formData.append('image', file);

                                try {
                                    setIsLoading(true);
                                    const res = await fetch(`${API_URL}/api/upload`, {
                                        method: 'POST',
                                        body: formData
                                    });
                                    const data = await res.json();
                                    if (data.imageUrl) {
                                        setFormData(prev => ({ ...prev, image: data.imageUrl }));
                                    }
                                } catch (err) {
                                    console.error("Upload error:", err);
                                    alert("Failed to upload image");
                                } finally {
                                    setIsLoading(false);
                                }
                            }}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                        />
                        {formData.image && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'success', marginBottom: '5px' }}>Image Uploaded!</p>
                                <img src={formData.image} alt="Preview" style={{ height: '100px', borderRadius: '8px', border: '1px solid var(--border)' }} />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{ marginTop: '10px', padding: '15px' }}
                    >
                        {isLoading ? 'Listing...' : 'List Book for Sale'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SellBook;
