import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFairPublisherMapping extends Document {
  fairId: mongoose.Types.ObjectId;
  publisherId: mongoose.Types.ObjectId;
  boothId?: mongoose.Types.ObjectId;
  additionalInfo?: string;
  featuredStatus: 'FEATURED' | 'REGULAR' | 'SPONSOR';
  booksDisplayed?: mongoose.Types.ObjectId[];
  schedule?: Array<{
    day: Date;
    startTime: string;
    endTime: string;
    activity: string;
  }>;
  isActive?: boolean;
}

const fairPublisherMappingSchema = new Schema<IFairPublisherMapping>(
  {
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
      index: true,
    },
    boothId: {
      type: Schema.Types.ObjectId,
      ref: 'Booth',
    },
    additionalInfo: String,
    featuredStatus: {
      type: String,
      enum: ['FEATURED', 'REGULAR', 'SPONSOR'],
      default: 'REGULAR',
    },
    booksDisplayed: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
    schedule: [
      {
        day: Date,
        startTime: String,
        endTime: String,
        activity: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

fairPublisherMappingSchema.index({ fairId: 1, publisherId: 1 }, { unique: true });
fairPublisherMappingSchema.index({ fairId: 1, featuredStatus: 1 });

const FairPublisherMapping: Model<IFairPublisherMapping> = mongoose.model<IFairPublisherMapping>(
  'FairPublisherMapping',
  fairPublisherMappingSchema
);
export default FairPublisherMapping;