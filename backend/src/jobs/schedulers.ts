/**
 * Schedulers — registers recurring BullMQ jobs.
 * Requirements: 3.6, 16.2, 16.3, 20.4
 */

import { bookingAutoCancel, calendarQueue, pricePredictionQueue } from '../config/queue';
import { startAutoCancelWorker } from './autoCancelBookings';
import { startTrustScoreWorker } from './trustScoreWorker';
import { startCalendarWorker } from './calendarWorker';
import { startPricePredictionWorker } from './pricePredictionWorker';
import { User } from '../models/User';

const MS_IN_24H = 24 * 60 * 60 * 1000;

export async function startSchedulers(): Promise<void> {
  startAutoCancelWorker();
  startTrustScoreWorker();
  startCalendarWorker();
  startPricePredictionWorker();

  await bookingAutoCancel.add(
    'check-pending-bookings',
    {},
    {
      jobId: 'auto-cancel-pending',
      repeat: { every: 3600000 },
    }
  );

  console.log('[Schedulers] Auto-cancel scheduler started (every 1 hour).');

  // Every 24 hours: enqueue a notify job for every farmer that has a calendar
  await calendarQueue.add(
    'check-all-farmer-calendars',
    { type: '__batch_notify__' },
    {
      jobId: 'calendar-daily-notify',
      repeat: { every: MS_IN_24H },
    }
  );

  console.log('[Schedulers] Calendar daily-notify scheduler started (every 24 hours).');

  // Every 24 hours: update price predictions for all service categories (Requirement 20.4)
  await pricePredictionQueue.add(
    'update-predictions',
    {},
    {
      jobId: 'price-prediction-daily',
      repeat: { every: 86400000 },
    }
  );

  console.log('[Schedulers] Price prediction scheduler started (every 24 hours).');
}
