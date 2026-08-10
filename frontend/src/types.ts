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

    // --- Phase 1 optional references ---
    /** Linked Author document (MongoDB ObjectId). */
    authorId?: string | IAuthor;
    /** Linked Publisher document (MongoDB ObjectId). */
    publisherId?: string | IPublisher;
    /** Linked Booth document (MongoDB ObjectId). */
    boothId?: string | IBooth;

    // --- Phase 1 enrichment fields ---
    /** Whether this title is flagged as an upcoming release. */
    isUpcoming?: boolean;
    /** Expected release date for upcoming titles. */
    expectedReleaseDate?: string;
    /** External preorder URL. */
    preorderLink?: string;
    /** Whether preorder is currently available. */
    isPreorderAvailable?: boolean;
    /** Primary language of the book. */
    language?: string;
    /** Multi-genre tags (Phase 1; legacy records may only have `genre`). */
    genres?: string[];
    /** Lifetime copies sold counter. */
    totalCopiesSold?: number;
    /** Computed average rating (Phase 1 aggregate). */
    averageRating?: number;
    /** Extended publisher/reading metadata. */
    metadata?: IBookMetadata;
    /** Whether the book is featured in discovery surfaces. */
    isFeatured?: boolean;
    /** Sort order among featured books. */
    featuredOrder?: number;
    /** Legacy availability label (e.g. "In Stock"). */
    availability?: string;
    /** Legacy publisher name string (pre-ObjectId migration). */
    publisher?: string;
    /** Legacy featured flag container used by recommendation queries. */
    featuredMetadata?: {
        featured?: boolean;
        order?: number;
    };
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

// --- PHASE 1: DISCOVERY & BOOK FAIR TYPES ---

/** Status lifecycle for upcoming book releases. */
export type UpcomingBookStatus = 'ANNOUNCED' | 'COMING_SOON' | 'RELEASED' | 'CANCELLED';

/** Status lifecycle for book fairs. */
export type BookFairStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/** Booth availability at a book fair. */
export type BoothStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'RESERVED';

/** Publisher prominence at a fair booth. */
export type BoothFeaturedStatus = 'FEATURED' | 'REGULAR' | 'SPONSOR';

/** Shared image asset shape used across discovery entities. */
export interface IImageAsset {
    url: string;
    publicId: string;
}

/** Represents an author profile in the discovery catalog. */
export interface IAuthor {
    _id: string;
    name: string;
    authorSlug?: string;
    bio?: string;
    birthDate?: string;
    deathDate?: string;
    nationality?: string;
    language?: string[];
    genres?: string[];
    /** Author portrait URL (defaults to Unsplash placeholder when unset). */
    avatarUrl?: string;
    photo?: IImageAsset;
    socialLinks?: {
        twitter?: string;
        website?: string;
        instagram?: string;
        goodreads?: string;
    };
    averageRating?: number;
    totalBooksSold?: number;
    isFeatured?: boolean;
    featuredOrder?: number;
    isVerified?: boolean;
    metadata?: {
        popularWorks?: string[];
        awards?: string[];
        trivia?: string[];
    };
    bookCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

/** Represents a publishing house in the discovery catalog. */
export interface IPublisher {
    _id: string;
    name: string;
    publisherSlug?: string;
    description?: string;
    /** Publisher logo URL (defaults to Unsplash placeholder when unset). */
    logoUrl?: string;
    logo?: IImageAsset;
    establishedYear?: number;
    headquarters?: string;
    country?: string;
    website?: string;
    contactEmail?: string;
    isVerified?: boolean;
    isFeatured?: boolean;
    boothNumber?: string;
    genres?: string[];
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
    };
    stats?: {
        totalBooksPublished?: number;
        averageRating?: number;
    };
    createdAt?: string;
    updatedAt?: string;
}

/** Represents a book announced for future release. */
export interface IUpcomingBook {
    _id: string;
    title: string;
    bookSlug?: string;
    description?: string;
    coverImage?: IImageAsset;
    authorId: string | IAuthor;
    publisherId?: string | IPublisher;
    genres?: string[];
    expectedReleaseDate: string;
    actualReleaseDate?: string;
    isbn?: string;
    pageCount?: number;
    price?: number;
    language?: string;
    isPreorderAvailable?: boolean;
    preorderLink?: string;
    status: UpcomingBookStatus;
    isFeatured?: boolean;
    featuredOrder?: number;
    metadata?: {
        publisherSummary?: string;
        authorStatement?: string;
        teaser?: string;
    };
    isComingSoon?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/** Geographic location details for a book fair. */
export interface IBookFairLocation {
    venue: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
}

/** Represents a book fair event. */
export interface IBookFair {
    _id: string;
    name: string;
    fairSlug?: string;
    description?: string;
    location?: IBookFairLocation;
    startDate: string;
    endDate: string;
    website?: string;
    isVirtual?: boolean;
    virtualLink?: string;
    isFeatured?: boolean;
    status: BookFairStatus;
    ticketInfo?: {
        price: number;
        purchaseLink: string;
    };
    featuredImage?: IImageAsset;
    stats?: {
        totalVisitors: number;
        totalPublishers: number;
        totalBooksDisplayed: number;
    };
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/** Represents a publisher booth at a book fair. */
export interface IBooth {
    _id: string;
    boothNumber: string;
    fairId: string | IBookFair;
    publisherId: string | IPublisher;
    section?: string;
    floor?: string;
    size?: {
        width: number;
        height: number;
        unit: string;
    };
    capacity?: number;
    isBooked?: boolean;
    bookingDate?: string;
    bookingReference?: string;
    amenities?: string[];
    specialNotes?: string;
    featuredBooks?: string[];
    status: BoothStatus;
    createdAt?: string;
    updatedAt?: string;
}

/** Maps a publisher to a booth within a book fair. */
export interface IBoothPublisherMapping {
    _id: string;
    fairId: string | IBookFair;
    boothId: string | IBooth;
    publisherId: string | IPublisher;
    featuredStatus?: BoothFeaturedStatus;
    booksDisplayed?: string[];
    additionalInfo?: string;
    schedule?: Array<{
        day: string;
        startTime: string;
        endTime: string;
        activity: string;
    }>;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

/** Extended book metadata for Phase 1 discovery features. */
export interface IBookMetadata {
    publisherSummary?: string;
    readingTime?: number;
    targetAudience?: string;
    awards?: string[];
}

// Ensure compatibility with existing code where simpler interfaces might be used temporarily
export type Book = IProduct;
export type CartItem = IProduct & { quantity: number };
