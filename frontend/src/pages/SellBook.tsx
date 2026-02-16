import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { API_URL } from '../config';

interface BookFormData {
    title: string;
    author: string;
    price: string | number;
    genre: string;
    image: string;
    reviews: number;
    rating: number;
}

const SellBook: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<BookFormData>({
        title: '',
        author: '',
        price: '',
        genre: '',
        image: '',
        reviews: 0,
        rating: 4.5
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Basic Validation
        if (!formData.title || !formData.author || !formData.price || !formData.genre) {
            alert("Please fill in all required fields.");
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert("You must be logged in to sell a book.");
                navigate('/login');
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/api/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    price: Number(formData.price),
                    id: Date.now()
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadData = new FormData();
        uploadData.append('image', file);

        try {
            setIsLoading(true);
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: uploadData
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
    };

    return (
        <div className="min-h-screen pt-28 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="max-w-2xl mx-auto px-5">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-xl border border-slate-200 dark:border-slate-800">
                    <h1 className="font-outfit text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent text-center mb-8">
                        Sell Your Book
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Book Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. The Alchemist"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Author *</label>
                            <input
                                type="text"
                                name="author"
                                value={formData.author}
                                onChange={handleChange}
                                placeholder="e.g. Paulo Coelho"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                required
                            />
                        </div>

                        <div className="flex gap-6">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Price (₹) *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="499"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    required
                                    min="1"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Genre *</label>
                                <select
                                    name="genre"
                                    value={formData.genre}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Cover Image *</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-slate-400">SVG, PNG, JPG (MAX. 5MB)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </label>

                            {formData.image && (
                                <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl inline-block">
                                    <img src={formData.image} alt="Preview" className="h-24 rounded-lg object-cover" />
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Listing...
                                </span>
                            ) : 'List Book for Sale'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SellBook;
