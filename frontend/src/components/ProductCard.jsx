import React from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ book }) => {
    return (
        <div className="card product-card">
            <div className="card-image-wrapper">
                <img
                    src={book.image}
                    alt={book.title}
                    className="product-image"
                    loading="lazy"
                />
                <span className="badge" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', backdropFilter: 'blur(4px)' }}>
                    {book.genre}
                </span>
            </div>

            <div className="product-info">
                <h3>{book.title}</h3>
                <p className="author">by {book.author}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span className="product-price">
                        {book.price === 0 ? 'Free' : `₹${book.price}`}
                    </span>
                    <Link to={`/book/${book.id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                        View
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
