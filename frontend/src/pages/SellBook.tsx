import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import InlineAlert from '../components/InlineAlert';
// @ts-ignore
import { API_URL } from '../config';

interface BookFormData {
    title: string;
    author: string;
    price: string | number;
    genre: string;
    image: string;
    images: string[];
    isbn?: string;
    condition?: string;
    description?: string;
    reviews: number;
    rating: number;
}

type SellMessageType = 'success' | 'error' | 'info';

const SellBook: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [pageMessage, setPageMessage] = useState<{ type: SellMessageType; text: string } | null>(null);
    const [formData, setFormData] = useState<BookFormData>({
        title: '',
        author: '',
        price: '',
        genre: '',
        image: '',
        images: [],
        isbn: '',
        condition: 'Good',
        description: '',
        reviews: 0,
        rating: 4.5
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setPageMessage(null);

        if (!formData.title || !formData.author || !formData.price || !formData.genre) {
            setPageMessage({ type: 'error', text: 'Please fill in all required fields.' });
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setPageMessage({ type: 'error', text: 'You must be logged in to sell a book. Redirecting to login...' });
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
                    condition: formData.condition || 'Good',
                    description: formData.description || `Used copy of ${formData.title} by ${formData.author}`,
                    image: formData.image || '/images/bookstore-hero-editorial.png',
                    images: formData.images.length ? formData.images : [formData.image || '/images/bookstore-hero-editorial.png']
                })
            });

            if (response.ok) {
                setPageMessage({ type: 'success', text: 'Book listed successfully!' });
                navigate('/marketplace');
            } else {
                const data = await response.json();
                setPageMessage({ type: 'error', text: `Failed to list book: ${data.message}` });
            }
        } catch (error) {
            console.error('Error listing book:', error);
            setPageMessage({ type: 'error', text: 'Error listing book. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const uploadData = new FormData();
        files.forEach((file) => {
            uploadData.append('images', file);
        });

        try {
            setIsLoading(true);
            setPageMessage({ type: 'info', text: files.length > 1 ? 'Uploading condition photos...' : 'Uploading used-book image...' });
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();

            const uploaded = data.images || data.imageUrls || [data.imageUrl];
            if (uploaded?.length) {
                setFormData(prev => ({
                    ...prev,
                    image: uploaded[0],
                    images: uploaded
                }));
                setPageMessage({ type: 'success', text: files.length > 1 ? 'Condition photos uploaded successfully.' : 'Image uploaded successfully.' });
            } else {
                setPageMessage({ type: 'error', text: 'Upload succeeded but no image URL was returned.' });
            }
        } catch (err) {
            console.error('Upload error:', err);
            setPageMessage({ type: 'error', text: 'Failed to upload image. Please try another file.' });
        } finally {
            setIsLoading(false);
            e.target.value = '';
        }
    };

    const handleISBNFetch = async () => {
        if (!formData.isbn) {
            setPageMessage({ type: 'info', text: 'Enter an ISBN to auto-fill the cover image.' });
            return;
        }

        try {
            setIsLoading(true);
            setPageMessage({ type: 'info', text: 'Finding the official book cover...' });
            const res = await fetch(`${API_URL}/api/upload/isbn-cover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isbn: formData.isbn })
            });

            const data = await res.json();
            if (data.imageUrl) {
                setFormData(prev => ({ ...prev, image: data.imageUrl }));
                setPageMessage({ type: 'success', text: 'Official cover fetched successfully.' });
            } else {
                setPageMessage({ type: 'error', text: data.message || 'No cover found for this ISBN.' });
            }
        } catch (err) {
            console.error('ISBN fetch error:', err);
            setPageMessage({ type: 'error', text: 'Could not fetch cover for this ISBN.' });
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

                    {pageMessage && (
                        <InlineAlert
                            type={pageMessage.type}
                            message={pageMessage.text}
                            onClose={() => setPageMessage(null)}
                            className="mb-6"
                        />
                    )}

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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">ISBN (Optional)</label>
                                <input
                                    type="text"
                                    name="isbn"
                                    value={formData.isbn}
                                    onChange={handleChange}
                                    placeholder="9780000000000"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Condition</label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="Like New">Like New</option>
                                    <option value="Good">Good</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Damaged">Damaged</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Book Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Briefly describe the book condition and edition"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Cover & Condition Images *</label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-slate-400">Upload 1 cover photo + up to 5 condition photos (PNG, JPG, WEBP; MAX. 5MB each)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                />
                            </label>

                            {formData.images.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                    {formData.images.map((img, index) => (
                                        <div key={`${img}-${index}`} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl inline-block">
                                            <img src={img} alt={`Condition ${index + 1}`} className="h-20 w-20 rounded-lg object-cover" onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = '/images/bookstore-hero-editorial.png';
                                            }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex gap-3 items-center">
                                <button
                                    type="button"
                                    onClick={handleISBNFetch}
                                    className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-semibold"
                                >
                                    Fetch official cover
                                </button>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Uses ISBN lookup when available.</span>
                            </div>

                            {formData.image && (
                                <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl inline-block">
                                    <img src={formData.image} alt="Preview" className="h-24 rounded-lg object-cover" onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = '/images/bookstore-hero-editorial.png';
                                    }} />
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
