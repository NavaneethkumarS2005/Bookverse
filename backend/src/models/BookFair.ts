import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBookFair extends Document {
  name: string;
  fairSlug?: string;
  description?: string;
  location?: {
    venue: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  startDate: Date;
  endDate: Date;
  website?: string;
  isVirtual?: boolean;
  virtualLink?: string;
  isFeatured?: boolean;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  ticketInfo?: {
    price: number;
    purchaseLink: string;
  };
  featuredImage?: {
    url: string;
    publicId: string;
  };
  stats?: {
    totalVisitors: number;
    totalPublishers: number;
    totalBooksDisplayed: number;
  };
  isActive?: boolean;
}

const bookFairSchema = new Schema<IBookFair>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    fairSlug: {
      type: String,
      unique: true,
      sparse: true,
    },
    description: String,
    location: {
      venue: String,
      city: String,
      state: String,
      country: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    website: String,
    isVirtual: {
      type: Boolean,
      default: false,
    },
    virtualLink: String,
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING',
    },
    ticketInfo: {
      price: Number,
      purchaseLink: String,
    },
    featuredImage: {
      url: String,
      publicId: String,
    },
    stats: {
      totalVisitors: { type: Number, default: 0 },
      totalPublishers: { type: Number, default: 0 },
      totalBooksDisplayed: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookFairSchema.index({ startDate: 1, endDate: 1, status: 1 });
bookFairSchema.index({ 'location.city': 1, 'location.country': 1 });
bookFairSchema.index({ isFeatured: -1, startDate: 1 });

bookFairSchema.pre('save', function (this: IBookFair, next) {
  if (this.isModified('name') && this.name) {
    this.fairSlug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  const now = new Date();
  if (this.startDate > now) {
    this.status = 'UPCOMING';
  } else if (this.endDate < now) {
    this.status = 'COMPLETED';
  } else if (this.startDate <= now && this.endDate >= now) {
    this.status = 'ONGOING';
  }
  next();
});

bookFairSchema.virtual('isActive').get(function (this: IBookFair) {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now;
});

const BookFair: Model<IBookFair> = mongoose.model<IBookFair>('BookFair', bookFairSchema);
export default BookFair;