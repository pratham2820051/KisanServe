import { Schema, model, Document, Types } from 'mongoose';

export type ServiceType =
  | 'Transport'
  | 'Irrigation'
  | 'FertilizerSupply'
  | 'Labor'
  | 'SoilTesting'
  | 'EquipmentRental';

export type ServiceStatus = 'active' | 'pending' | 'rejected';
export type PriceTrend = 'rising' | 'stable' | 'falling';

export interface IService extends Document {
  provider_id: Types.ObjectId;
  type: ServiceType;
  price: number;
  availability: boolean;
  category: ServiceType;
  averageRating: number;
  ratingCount: number;
  description?: string;
  status: ServiceStatus;
  priceTrend: PriceTrend;
  optimalBookingWindow?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

const SERVICE_TYPES: ServiceType[] = [
  'Transport',
  'Irrigation',
  'FertilizerSupply',
  'Labor',
  'SoilTesting',
  'EquipmentRental',
];

const ServiceSchema = new Schema<IService>(
  {
    provider_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: SERVICE_TYPES, required: true },
    price: { type: Number, required: true },
    availability: { type: Boolean, default: true },
    category: { type: String, enum: SERVICE_TYPES, required: true },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    description: { type: String },
    status: { type: String, enum: ['active', 'pending', 'rejected'], default: 'pending' },
    priceTrend: { type: String, enum: ['rising', 'stable', 'falling'], default: 'stable' },
    optimalBookingWindow: { type: String },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { timestamps: true }
);

ServiceSchema.index({ location: '2dsphere' });
ServiceSchema.index({ status: 1, type: 1 });

export const Service = model<IService>('Service', ServiceSchema);
