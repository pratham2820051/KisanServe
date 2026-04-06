import { Schema, model, Document } from 'mongoose';

export type AlertType = 'weather' | 'marketPrice' | 'governmentScheme' | 'emergency';

export interface IAlert extends Document {
  type: AlertType;
  message: string;
  targetLocation: string;
  coordinates?: {
    type: 'Point';
    coordinates: [number, number];
  };
  isActive: boolean;
  expiresAt?: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: ['weather', 'marketPrice', 'governmentScheme', 'emergency'],
      required: true,
    },
    message: { type: String, required: true },
    targetLocation: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

AlertSchema.index({ type: 1 });
AlertSchema.index({ targetLocation: 1 });

export const Alert = model<IAlert>('Alert', AlertSchema);
