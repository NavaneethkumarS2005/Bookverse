import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBooth extends Document {
  boothNumber: string;
  fairId: mongoose.Types.ObjectId;
  publisherId: mongoose.Types.ObjectId;
  section?: string;
  floor?: string;
  size?: {
    width: number;
    height: number;
    unit: string;
  };
  capacity?: number;
  isBooked?: boolean;
  bookingDate?: Date;
  bookingReference?: string;
  amenities?: string[];
  specialNotes?: string;
  featuredBooks?: mongoose.Types.ObjectId[];
  status: 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE' | 'RESERVED';
}

const boothSchema = new Schema<IBooth>(
  {
    boothNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fairId: {
      type: Schema.Types.ObjectId,
      ref: 'BookFair',
      required: true,
      index: true,
    },
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: 'Publisher',
      required: true,
    },
    section: String,
    floor: String,
    size: {
      width: Number,
      height: Number,
      unit: { type: String, default: 'meters' },
    },
    capacity: Number,
    isBooked: {
      type: Boolean,
      default: true,
    },
    bookingDate: Date,
    bookingReference: String,
    amenities: [String],
    specialNotes: String,
    featuredBooks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
    status: {
      type: String,
      enum: ['AVAILABLE', 'BOOKED', 'MAINTENANCE', 'RESERVED'],
      default: 'AVAILABLE',
    },
  },
  {
    timestamps: true,
  }
);

boothSchema.index({ fairId: 1, boothNumber: 1 });
boothSchema.index({ fairId: 1, status: 1 });

const Booth: Model<IBooth> = mongoose.model<IBooth>('Booth', boothSchema);
export default Booth;