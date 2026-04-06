/**
 * Price Prediction Worker
 * BullMQ worker that processes price prediction update jobs.
 * Requirements: 20.1, 20.4
 */

import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { updatePricePredictions } from '../services/pricePredictionService';

const connection = { host: redis.options.host || 'localhost', port: redis.options.port || 6379 };

export function startPricePredictionWorker(): Worker {
  const worker = new Worker(
    'price-prediction',
    async (job) => {
      console.log(`[PricePredictionWorker] Processing job ${job.id}: ${job.name}`);
      await updatePricePredictions();
      console.log(`[PricePredictionWorker] Job ${job.id} completed.`);
    },
    { connection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[PricePredictionWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[PricePredictionWorker] Worker started on queue: price-prediction');
  return worker;
}
