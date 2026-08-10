import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBoothPublisherMapping extends Document {
  fairId: mongoose.Types.ObjectId;
  boothId: mongoose.Types.ObjectId;
  publisherId: mongoose.Types.ObjectId;
  featuredStatus?: 'FEATURED' | 'REGULAR' | 'SPONSOR';
  booksDisplayed?: mongoose.Types.ObjectId[];
  additionalInfo?: string;
  schedule?: Array<{
    day: Date;
    startTime: string;
    endTime: string;
    activity: string;
  }>;
  isActive?: boolean;
}

const boothPublisherMappingSchema = new Schema<IBoothPublisherMapping>(
  {
    fairId: {
      type: Schema.Types.ObjectId,
      ref: 'BookFair',
      required: true,
      index: true,
    },
    boothId: {
      type: Schema.Types.ObjectId,
      ref: 'Booth',
      required: true,
      index: true,
    },
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: 'Publisher',
      required: true,
      index: true,
    },
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
    additionalInfo: String,
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

boothPublisherMappingSchema.index({ fairId: 1, publisherId: 1 }, { unique: true });
boothPublisherMappingSchema.index({ boothId: 1, publisherId: 1 }, { unique: true });
boothPublisherMappingSchema.index({ fairId: 1, featuredStatus: 1 });

const BoothPublisherMapping: Model<IBoothPublisherMapping> = mongoose.model<IBoothPublisherMapping>(
  'BoothPublisherMapping',
  boothPublisherMappingSchema
);
export default BoothPublisherMapping;
