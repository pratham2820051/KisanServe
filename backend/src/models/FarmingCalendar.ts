import { Schema, model, Document, Types } from 'mongoose';

export interface IScheduleEntry {
  activity: string;
  date: Date;
  notes?: string;
}

export interface IFarmingCalendar extends Document {
  farmer_id: Types.ObjectId;
  cropType?: string;
  location?: string;
  scheduleJson: IScheduleEntry[];
  lastUpdated: Date;
}

const FarmingCalendarSchema = new Schema<IFarmingCalendar>(
  {
    farmer_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    cropType: { type: String },
    location: { type: String },
    scheduleJson: { type: Schema.Types.Mixed, default: [] },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const FarmingCalendar = model<IFarmingCalendar>('FarmingCalendar', FarmingCalendarSchema);
