import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserInteraction extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  action:
    | 'VIEW'
    | 'CLICK'
    | 'ADD_TO_CART'
    | 'REMOVE_FROM_CART'
    | 'WISHLIST_ADD'
    | 'WISHLIST_REMOVE'
    | 'SEARCH'
    | 'PURCHASE'
    | 'AI_CHAT'
    | 'RECOMMENDATION_CLICK';
  targetType: 'BOOK' | 'AUTHOR' | 'PUBLISHER' | 'FAIR' | 'BOOTH' | 'UPCOMING_BOOK';
  targetId: mongoose.Types.ObjectId;
  metadata?: {
    searchQuery?: string;
    price?: number;
    quantity?: number;
    source?: string;
    aiConfidence?: number;
    previousPage?: string;
  };
  timestamp?: Date;
}

const userInteractionSchema = new Schema<IUserInteraction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'VIEW',
        'CLICK',
        'ADD_TO_CART',
        'REMOVE_FROM_CART',
        'WISHLIST_ADD',
        'WISHLIST_REMOVE',
        'SEARCH',
        'PURCHASE',
        'AI_CHAT',
        'RECOMMENDATION_CLICK',
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['BOOK', 'AUTHOR', 'PUBLISHER', 'FAIR', 'BOOTH', 'UPCOMING_BOOK'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    metadata: {
      searchQuery: String,
      price: Number,
      quantity: Number,
      source: String,
      aiConfidence: Number,
      previousPage: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

userInteractionSchema.index({ userId: 1, action: 1, timestamp: -1 });
userInteractionSchema.index({ userId: 1, targetType: 1, targetId: 1 });
userInteractionSchema.index({ sessionId: 1, timestamp: -1 });

userInteractionSchema.statics.getRecentInteractions = async function (userId: string, limit = 100) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

userInteractionSchema.statics.getRecommendationHistory = async function (userId: string, limit = 20) {
  return this.find({
    userId,
    action: 'RECOMMENDATION_CLICK',
    'metadata.source': 'ai_recommendation',
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('targetId');
};

const UserInteraction: Model<IUserInteraction> = mongoose.model<IUserInteraction>(
  'UserInteraction',
  userInteractionSchema
);
export default UserInteraction;