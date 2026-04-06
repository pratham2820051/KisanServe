import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from './redis';

const connection = { host: redis.options.host || 'localhost', port: redis.options.port || 6379 };

// Queue definitions
export const notificationQueue = new Queue('notifications', { connection });
export const trustScoreQueue = new Queue('trust-score', { connection });
export const pricePredictionQueue = new Queue('price-prediction', { connection });
export const calendarQueue = new Queue('farming-calendar', { connection });
export const bookingAutoCancel = new Queue('booking-auto-cancel', { connection });

export const queues = {
  notificationQueue,
  trustScoreQueue,
  pricePredictionQueue,
  calendarQueue,
  bookingAutoCancel,
};
