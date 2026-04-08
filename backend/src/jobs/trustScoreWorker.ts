/**
 * Trust Score Worker
 * BullMQ worker that processes trust score recalculation jobs.
 * Requirements: 19.1, 19.2
 */

import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { calculateTrustScore } from '../services/trustScoreService';

const connection = { host: redis.options.host || 'localhost', port: redis.options.port || 6379 };

export function startTrustScoreWorker(): Worker | null {
  try {
    const worker = new Worker('trust-score', async (job) => {
      const { userId } = job.data as { userId: string };
      const score = await calculateTrustScore(userId);
      console.log(`[TrustScoreWorker] User ${userId} score: ${score}`);
    }, { connection });
    worker.on('failed', (job, err) => console.error(`[TrustScoreWorker] Job ${job?.id} failed:`, err.message));
    console.log('[TrustScoreWorker] Worker started');
    return worker;
  } catch {
    console.warn('[TrustScoreWorker] Redis unavailable — worker disabled');
    return null;
  }
}
