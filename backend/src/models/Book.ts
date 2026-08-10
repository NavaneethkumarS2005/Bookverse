import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  // --- Legacy fields (existing records) ---
  id?: number;
  title: string;
  author: string;
  description?: string;
  price: number;
  genre: string;
  image: string;
  rating?: number;
  reviews?: number;
  buyLink?: string;
  availability?: string;
  publisher?: string;
  featuredMetadata?: {
    featured?: boolean;
    order?: number;
  };

  // --- Phase 1 optional references ---
  authorId?: mongoose.Types.ObjectId;
  publisherId?: mongoose.Types.ObjectId;
  boothId?: mongoose.Types.ObjectId;

  // --- Phase 1 enrichment fields ---
  isUpcoming?: boolean;
  expectedReleaseDate?: Date;
  preorderLink?: string;
  isPreorderAvailable?: boolean;
  language?: string;
  genres?: string[];
  totalCopiesSold?: number;
  averageRating?: number;
  metadata?: {
    publisherSummary?: string;
    readingTime?: number;
    targetAudience?: string;
    awards?: string[];
  };
  isFeatured?: boolean;
  featuredOrder?: number;
}

const bookSchema = new Schema<IBook>(
  {
    id: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      index: true,
    },
    image: {
      type: String,
      default: '',
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    buyLink: {
      type: String,
    },
    availability: {
      type: String,
      default: 'In Stock',
    },
    publisher: {
      type: String,
      trim: true,
    },
    featuredMetadata: {
      featured: { type: Boolean, default: false },
      order: { type: Number, default: 999 },
    },

    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'Author',
      default: null,
      index: true,
    },
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: 'Publisher',
      default: null,
      index: true,
    },
    boothId: {
      type: Schema.Types.ObjectId,
      ref: 'Booth',
      default: null,
      index: true,
    },

    isUpcoming: {
      type: Boolean,
      default: false,
    },
    expectedReleaseDate: {
      type: Date,
    },
    preorderLink: {
      type: String,
    },
    isPreorderAvailable: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'English',
      index: true,
    },
    genres: [
      {
        type: String,
        index: true,
      },
    ],
    totalCopiesSold: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    metadata: {
      publisherSummary: String,
      readingTime: Number,
      targetAudience: String,
      awards: [String],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    featuredOrder: {
      type: Number,
      default: 999,
    },
  },
  {
    timestamps: true,
  }
);

bookSchema.index({ authorId: 1, isUpcoming: 1 });
bookSchema.index({ publisherId: 1, 'metadata.awards': 1 });
bookSchema.index({ genres: 1, averageRating: -1 });
bookSchema.index({ isFeatured: 1, featuredOrder: 1 });

const Book = mongoose.model<IBook>('Book', bookSchema);
export default Book;
