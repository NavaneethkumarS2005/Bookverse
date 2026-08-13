import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUpcomingBook extends Document {
  title: string;
  bookSlug?: string;
  description?: string;
  /** Legacy records may store a plain URL; new records may use the shared asset shape. */
  coverImage?: string | { url: string; publicId: string };
  authorId: mongoose.Types.ObjectId;
  publisherId?: mongoose.Types.ObjectId;
  genres?: string[];
  expectedReleaseDate: Date;
  actualReleaseDate?: Date;
  isbn?: string;
  pageCount?: number;
  price?: number;
  language?: string;
  isPreorderAvailable?: boolean;
  preorderLink?: string;
  status: 'ANNOUNCED' | 'COMING_SOON' | 'RELEASED' | 'CANCELLED';
  isFeatured?: boolean;
  featuredOrder?: number;
  metadata?: { publisherSummary?: string; authorStatement?: string; teaser?: string };
  isComingSoon?: boolean;
}

const upcomingBookSchema = new Schema<IUpcomingBook>(
  {
    title: { type: String, required: [true, 'Book title is required'], trim: true, index: true },
    bookSlug: { type: String, unique: true, sparse: true },
    description: String,
    coverImage: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'Author', required: true },
    publisherId: { type: Schema.Types.ObjectId, ref: 'Publisher' },
    genres: [String],
    expectedReleaseDate: { type: Date, required: true, index: true },
    actualReleaseDate: Date,
    isbn: String,
    pageCount: Number,
    price: { type: Number, min: 0 },
    language: String,
    isPreorderAvailable: { type: Boolean, default: false },
    preorderLink: String,
    status: { type: String, enum: ['ANNOUNCED', 'COMING_SOON', 'RELEASED', 'CANCELLED'], default: 'ANNOUNCED' },
    isFeatured: { type: Boolean, default: false },
    featuredOrder: Number,
    metadata: { publisherSummary: String, authorStatement: String, teaser: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

upcomingBookSchema.index({ expectedReleaseDate: 1, status: 1 });
upcomingBookSchema.index({ title: 'text', 'metadata.teaser': 'text' });

upcomingBookSchema.pre('save', function (this: IUpcomingBook, next) {
  if (this.isModified('title') && this.title) {
    this.bookSlug = this.title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

upcomingBookSchema.virtual('isComingSoon').get(function (this: IUpcomingBook) {
  if (!this.expectedReleaseDate) return false;
  const now = new Date();
  const threeMonthsFromNow = new Date(now);
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
  return this.expectedReleaseDate <= threeMonthsFromNow && this.expectedReleaseDate >= now;
});

const UpcomingBook: Model<IUpcomingBook> = mongoose.model<IUpcomingBook>('UpcomingBook', upcomingBookSchema);
export default UpcomingBook;
