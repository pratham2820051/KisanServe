import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Parse redis URL into host/port for BullMQ
function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '6379'),
      password: u.password || undefined,
      username: u.username || undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = parseRedisUrl(REDIS_URL);

function makeQueue(name: string) {
  try {
    return new Queue(name, { connection });
  } catch {
    return null as unknown as Queue;
  }
}

export const notificationQueue = makeQueue('notifications');
export const trustScoreQueue = makeQueue('trust-score');
export const pricePredictionQueue = makeQueue('price-prediction');
export const calendarQueue = makeQueue('farming-calendar');
export const bookingAutoCancel = makeQueue('booking-auto-cancel');

export const queues = { notificationQueue, trustScoreQueue, pricePredictionQueue, calendarQueue, bookingAutoCancel };
