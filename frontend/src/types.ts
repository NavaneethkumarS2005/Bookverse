/**
 * @fileoverview Shared Type Definitions for MERN E-commerce Book Store
 * This file acts as the single source of truth for data models across Frontend and Backend.
 */

// --- ENUMS ---

/**
 * Defines the role of a user in the system.
 */
export enum UserRole {
    /** A standard customer who can browse and purchase books. */
    USER = 'user',
    /** An administrator with full access to manage products, orders, and users. */
    ADMIN = 'admin',
}

/**
 * Represents the current status of an order.
 */
export enum OrderStatus {
    /** Order has been placed but not yet processed. */
    PENDING = 'Pending',
    /** Order has been confirmed and is being prepared. */
    PROCESSING = 'Processing',
    /** Order has been shipped to the customer. */
    SHIPPED = 'Shipped',
    /** Order has been successfully delivered. */
    DELIVERED = 'Delivered',
    /** Order has been cancelled by the user or admin. */
    CANCELLED = 'Cancelled',
}

/**
 * Represents the payment status of an order.
 */
export enum PaymentStatus {
    /** Payment is pending completion. */
    PENDING = 'pending',
    /** Payment was successful. */
    COMPLETED = 'completed',
    /** Payment failed. */
    FAILED = 'failed',
    /** Payment was refunded. */
    REFUNDED = 'refunded',
}

// --- INTERFACES ---

/**
 * Represents a user in the system.
 */
export interface IUser {
    /** Unique identifier for the user (MongoDB ObjectId). */
    _id: string;
    /** Full name of the user. */
    name: string;
    /** Unique email address of the user. */
    email: string;
    /** Role of the user, determining access permissions. */
    role: UserRole;
    /** Date when the user account was created. */
    createdAt: string;
    /** Date when the user account was last updated. */
    updatedAt: string;
    /** Optional URL to the user's profile image. */
    profileImage?: string;
    /** User's shipping address. */
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
}

/**
 * Represents a product (Book) in the store.
 */
export interface IProduct {
    /** Unique identifier for the product (MongoDB ObjectId). */
    _id: string; // Changed from 'id' to '_id' to match MongoDB
    /** Legacy numerical ID for compatibility. */
    id?: number | string;
    /** Title of the book. */
    title: string;
    /** Author of the book. */
    author: string;
    /** Description or summary of the book. */
    description: string;
    /** Price of the book in the base currency (e.g., INR or USD). */
    price: number;
    /** URL of the book's cover image. */
    image: string;
    /** Category or genre of the book (e.g., Fiction, Sci-Fi). */
    category?: string;
    /** Genre of the book (Backend uses this field). */
    genre?: string;
    /** External link to buy the book (e.g. Amazon/Flipkart) */
    buyLink?: string;
    /** Number of items available in stock. */
    stock: number;
    /** Average rating of the book (0-5). */
    rating: number;
    /** Number of reviews the book has received. */
    numReviews: number;
    /** User ID of the seller who listed the book. */
    seller: string | IUser;
    /** Date when the product was listed. */
    createdAt: string;
    /** Date when the product was last updated. */
    updatedAt: string;
}

/**
 * Represents a single item within an order.
 */
export interface IOrderItem {
    /** The product being ordered. */
    product: string | IProduct;
    /** The quantity of the product ordered. */
    quantity: number;
    /** The price of the product at the time of purchase. */
    price: number;
}

/**
 * Represents a customer order.
 */
export interface IOrder {
    /** Unique identifier for the order (MongoDB ObjectId). */
    _id: string;
    /** The user who placed the order. */
    user: string | IUser;
    /** List of items included in the order. */
    orderItems: IOrderItem[];
    /** Shipping address for the order. */
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string; // Consistent naming
        country: string;
    };
    /** The payment method used (e.g., 'Stripe', 'PhonePe'). */
    paymentMethod: string;
    /** The result of the payment process. */
    paymentResult?: {
        id: string;
        status: string;
        update_time: string;
        email_address: string;
    };
    /** Current status of the payment. */
    paymentStatus: PaymentStatus;
    /** Total price of the items before tax/shipping. */
    itemsPrice: number;
    /** Tax amount applied to the order. */
    taxPrice: number;
    /** Shipping cost for the order. */
    shippingPrice: number;
    /** Final total amount paid by the customer. */
    totalPrice: number;
    /** Current status of the order fulfillment. */
    status: OrderStatus; // Renamed from isPaid/isDelivered boolean flags to a robust enum
    /** Date when the order was paid. */
    paidAt?: string;
    /** Date when the order was delivered. */
    deliveredAt?: string;
    /** Date when the order was created. */
    createdAt: string;
}

/**
 * Represents a review for a product.
 */
export interface IReview {
    /** Unique identifier for the review. */
    _id: string;
    /** The user who wrote the review. */
    user: string | IUser; // Populated or ID
    /** The product being reviewed. */
    product?: string;
    /** The book ID (backend field). */
    bookId?: number;
    /** Rating given by the user (1-5). */
    rating: number;
    /** Comment text provided by the user. */
    comment: string;
    /** Whether the purchase is verified. */
    isVerified?: boolean;
    /** Date when the review was created. */
    createdAt: string;
}

// Ensure compatibility with existing code where simpler interfaces might be used temporarily
export type Book = IProduct;
export type CartItem = IProduct & { quantity: number };
