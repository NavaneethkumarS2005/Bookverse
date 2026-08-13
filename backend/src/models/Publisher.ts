import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPublisher extends Document {
  name: string;
  publisherSlug?: string;
  description?: string;
  logoUrl?: string;
  logo?: { url: string; publicId: string };
  establishedYear?: number;
  headquarters?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  boothNumber?: string;
  genres?: string[];
  socialLinks?: { twitter?: string; linkedin?: string };
  stats?: { totalBooksPublished?: number; averageRating?: number };
}

const publisherSchema = new Schema<IPublisher>(
  {
    name: { type: String, required: [true, 'Publisher name is required'], trim: true, unique: true, index: true },
    publisherSlug: { type: String, unique: true, sparse: true },
    description: String,
    logoUrl: String,
    logo: { url: String, publicId: String },
    establishedYear: Number,
    headquarters: String,
    country: String,
    website: String,
    contactEmail: String,
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    boothNumber: { type: String, ref: 'Booth' },
    genres: [String],
    socialLinks: { twitter: String, linkedin: String },
    stats: { totalBooksPublished: { type: Number, default: 0 }, averageRating: { type: Number, default: 0 } },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

publisherSchema.index({ name: 1, isVerified: -1 });
publisherSchema.index({ genres: 1 });

publisherSchema.pre('save', function (this: IPublisher, next) {
  if (this.isModified('name') && this.name) {
    this.publisherSlug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

const Publisher: Model<IPublisher> = mongoose.model<IPublisher>('Publisher', publisherSchema);
export default Publisher;
