import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuthor extends Document {
  name: string;
  authorSlug?: string;
  bio?: string;
  birthDate?: Date;
  deathDate?: Date;
  nationality?: string;
  language?: string[];
  genres?: string[];
  avatarUrl?: string;
  photo?: {
    url: string;
    publicId: string;
  };
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
}

const authorSchema = new Schema<IAuthor>(
  {
    name: { type: String, required: [true, 'Author name is required'], trim: true, index: true },
    authorSlug: { type: String, unique: true, sparse: true, index: true },
    bio: { type: String, maxlength: 2000 },
    birthDate: Date,
    deathDate: Date,
    nationality: String,
    language: [String],
    genres: [String],
    avatarUrl: String,
    photo: { url: String, publicId: String },
    socialLinks: { twitter: String, website: String, instagram: String, goodreads: String },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalBooksSold: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 999 },
    isVerified: { type: Boolean, default: false },
    metadata: { popularWorks: [String], awards: [String], trivia: [String] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

authorSchema.index({ name: 1, isFeatured: -1 });
authorSchema.index({ genres: 1, averageRating: -1 });

authorSchema.virtual('bookCount', { ref: 'Book', localField: '_id', foreignField: 'authorId', count: true });

authorSchema.pre('save', function (this: IAuthor, next) {
  if (this.isModified('name') && this.name) {
    this.authorSlug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

const Author: Model<IAuthor> = mongoose.model<IAuthor>('Author', authorSchema);
export default Author;
