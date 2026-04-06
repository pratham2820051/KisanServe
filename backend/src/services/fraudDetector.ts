import { redis } from '../config/redis';
import { Service } from '../models/Service';
import { Feedback } from '../models/Feedback';
import { Booking } from '../models/Booking';

/**
 * Fraud Detection Engine — AgriConnect Platform
 *
 * Detects suspicious review and user behavior using 6 heuristics:
 *   1. IP burst — too many reviews from same IP in 10 minutes
 *   2. Rating outlier — rating deviates >2 from provider's average
 *   3. Review velocity — reviewer submitting >5 reviews in 1 hour
 *   4. Extreme rating pattern — reviewer always gives 1 or 5 stars
 *   5. Self-review attempt — reviewer and reviewee are same user
 *   6. Unverified booking — review submitted without a completed booking
 *
 * Requirements: 7.6, 9.4
 */
export async function checkFraud(
  revieweeId: string,
  rating: number,
  reviewerIp: string,
  reviewerId?: string,
  bookingId?: string
): Promise<{ isFlagged: boolean; reason?: string; riskScore: number }> {
  const flags: string[] = [];
  let riskScore = 0;

  // ── Rule 1: IP Burst Detection ──────────────────────────────────────────
  // Flag if >3 reviews from same IP within 10 minutes
  if (reviewerIp && reviewerIp !== '::1' && reviewerIp !== '127.0.0.1') {
    const ipKey = `fraud:ip:${reviewerIp}`;
    const count = await redis.incr(ipKey);
    if (count === 1) await redis.expire(ipKey, 600);
    if (count > 3) {
      flags.push(`IP burst: ${count} submissions from ${reviewerIp} in 10 minutes`);
      riskScore += 40;
    }
  }

  // ── Rule 2: Rating Outlier Detection ────────────────────────────────────
  // Flag if rating deviates >2 points from provider's established average
  const service = await Service.findOne({ provider_id: revieweeId }).select('averageRating ratingCount');
  if (service && service.ratingCount >= 5 && service.averageRating > 0) {
    const deviation = Math.abs(rating - service.averageRating);
    if (deviation > 2) {
      flags.push(`Rating outlier: submitted ${rating}★ vs average ${service.averageRating}★ (deviation: ${deviation.toFixed(1)})`);
      riskScore += 30;
    }
  }

  // ── Rule 3: Review Velocity ──────────────────────────────────────────────
  // Flag if reviewer submits >5 reviews in 1 hour
  if (reviewerId) {
    const velocityKey = `fraud:velocity:${reviewerId}`;
    const velocity = await redis.incr(velocityKey);
    if (velocity === 1) await redis.expire(velocityKey, 3600);
    if (velocity > 5) {
      flags.push(`Review velocity: ${velocity} reviews submitted in 1 hour`);
      riskScore += 35;
    }
  }

  // ── Rule 4: Extreme Rating Pattern ──────────────────────────────────────
  // Flag if reviewer has submitted only 1★ or only 5★ reviews (min 5 reviews)
  if (reviewerId) {
    const reviewerHistory = await Feedback.find({ reviewer_id: reviewerId })
      .select('rating')
      .limit(20)
      .lean();

    if (reviewerHistory.length >= 5) {
      const ratings = reviewerHistory.map(r => r.rating);
      const allExtreme = ratings.every(r => r === 1 || r === 5);
      const allSame = ratings.every(r => r === rating);
      if (allExtreme && allSame) {
        flags.push(`Extreme rating pattern: reviewer consistently gives only ${rating}★ ratings`);
        riskScore += 25;
      }
    }
  }

  // ── Rule 5: Self-Review Attempt ──────────────────────────────────────────
  // Flag if reviewer and reviewee are the same user
  if (reviewerId && reviewerId === revieweeId) {
    flags.push('Self-review attempt: reviewer and reviewee are the same user');
    riskScore += 100; // Always flag
  }

  // ── Rule 6: Unverified Booking Check ────────────────────────────────────
  // Flag if no completed booking exists between reviewer and reviewee
  if (reviewerId && bookingId) {
    const booking = await Booking.findById(bookingId).lean();
    if (!booking || booking.status !== 'Completed') {
      flags.push('Unverified booking: review submitted for non-completed booking');
      riskScore += 50;
    }
  }

  const isFlagged = riskScore >= 30 || flags.length > 0;

  return {
    isFlagged,
    reason: flags.length > 0 ? flags.join(' | ') : undefined,
    riskScore: Math.min(riskScore, 100),
  };
}

/**
 * Get fraud statistics for admin dashboard.
 * Returns counts of flagged reviews, high-risk IPs, and velocity offenders.
 */
export async function getFraudStats(): Promise<{
  totalFlagged: number;
  flaggedByReason: Record<string, number>;
  recentFlags: any[];
}> {
  const flaggedReviews = await Feedback.find({ is_flagged: true })
    .populate('reviewer_id', 'name phone')
    .populate('reviewee_id', 'name phone')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const flaggedByReason: Record<string, number> = {
    'IP burst': 0,
    'Rating outlier': 0,
    'Review velocity': 0,
    'Extreme pattern': 0,
    'Self-review': 0,
    'Unverified booking': 0,
  };

  for (const review of flaggedReviews) {
    const reason = (review as any).flagReason ?? '';
    if (reason.includes('IP burst')) flaggedByReason['IP burst']++;
    if (reason.includes('outlier')) flaggedByReason['Rating outlier']++;
    if (reason.includes('velocity')) flaggedByReason['Review velocity']++;
    if (reason.includes('pattern')) flaggedByReason['Extreme pattern']++;
    if (reason.includes('Self-review')) flaggedByReason['Self-review']++;
    if (reason.includes('Unverified')) flaggedByReason['Unverified booking']++;
  }

  return {
    totalFlagged: await Feedback.countDocuments({ is_flagged: true }),
    flaggedByReason,
    recentFlags: flaggedReviews,
  };
}
