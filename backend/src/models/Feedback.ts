import { Schema, model, Document, Types } from 'mongoose';

export interface IFeedback extends Document {
  booking_id: Types.ObjectId;
  reviewer_id: Types.ObjectId;
  reviewee_id: Types.ObjectId;
  rating: number;
  comment?: string;
  is_flagged: boolean;
  flagReason?: string;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    booking_id: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    reviewer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    is_flagged: { type: Boolean, default: false },
    flagReason: { type: String },
  },
  { timestamps: true }
);

// One review per booking per reviewer
FeedbackSchema.index({ booking_id: 1, reviewer_id: 1 }, { unique: true });

export const Feedback = model<IFeedback>('Feedback', FeedbackSchema);
