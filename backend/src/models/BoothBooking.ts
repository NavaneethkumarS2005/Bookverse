import mongoose, { Document, Model, Schema } from 'mongoose';

export type BoothBookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface IBoothBooking extends Document {
  boothId: mongoose.Types.ObjectId;
  fairId: mongoose.Types.ObjectId;
  publisherId: mongoose.Types.ObjectId;
  bookingReference: string;
  quotedPrice: number;
  currency: string;
  status: BoothBookingStatus;
  isActive: boolean;
  paymentStatus: 'not_integrated';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  cancelledAt?: Date;
}

const boothBookingSchema = new Schema<IBoothBooking>({
  boothId: { type: Schema.Types.ObjectId, ref: 'Booth', required: true, index: true },
  fairId: { type: Schema.Types.ObjectId, ref: 'BookFair', required: true, index: true },
  publisherId: { type: Schema.Types.ObjectId, ref: 'Publisher', required: true, index: true },
  bookingReference: { type: String, required: true, unique: true },
  quotedPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, default: 'INR', enum: ['INR'] },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  isActive: { type: Boolean, required: true, default: true },
  paymentStatus: { type: String, enum: ['not_integrated'], default: 'not_integrated', required: true },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  rejectionReason: { type: String, maxlength: 500 },
  cancelledAt: Date,
}, { timestamps: true });

boothBookingSchema.index(
  { boothId: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: 'one_active_booking_per_booth' },
);
boothBookingSchema.index({ publisherId: 1, createdAt: -1 });
boothBookingSchema.index({ fairId: 1, status: 1, createdAt: -1 });

const BoothBooking: Model<IBoothBooking> = mongoose.model<IBoothBooking>('BoothBooking', boothBookingSchema);
export default BoothBooking;