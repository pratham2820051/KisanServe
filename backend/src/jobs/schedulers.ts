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
  try {
    startAutoCancelWorker();
    startTrustScoreWorker();
    startCalendarWorker();
    startPricePredictionWorker();

    await bookingAutoCancel.add('check-pending-bookings', {}, { jobId: 'auto-cancel-pending', repeat: { every: 3600000 } });
    console.log('[Schedulers] Auto-cancel scheduler started.');

    await calendarQueue.add('check-all-farmer-calendars', { type: '__batch_notify__' }, { jobId: 'calendar-daily-notify', repeat: { every: MS_IN_24H } });
    console.log('[Schedulers] Calendar daily-notify scheduler started.');

    await pricePredictionQueue.add('update-predictions', {}, { jobId: 'price-prediction-daily', repeat: { every: 86400000 } });
    console.log('[Schedulers] Price prediction scheduler started.');
  } catch {
    console.warn('[Schedulers] Redis unavailable — background jobs disabled');
  }
}
