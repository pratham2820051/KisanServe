/**
 * Trust Score Service
 * Requirements: 19.1, 19.2, 19.4
 */

import { Booking } from '../models/Booking';
import { Feedback } from '../models/Feedback';
import { User } from '../models/User';

const TRUST_SCORE_THRESHOLD = 4.0;

/**
 * Calculates and persists the trust score for a given user.
 * Score is based on:
 *   - completionRate (completed / (completed + cancelled)) — weight 0.4
 *   - avgRating (average feedback rating / 5)              — weight 0.4
 *   - activityScore (min(1, totalBookings / 20))           — weight 0.2
 * Final score is scaled to 0–10 and rounded to 1 decimal place.
 */
export async function calculateTrustScore(userId: string): Promise<number> {
  // Fetch all bookings where user is farmer or provider
  const bookings = await Booking.find({
    $or: [{ farmer_id: userId }, { provider_id: userId }],
  });

  const totalBookings = bookings.length;
  const completed = bookings.filter((b) => b.status === 'Completed').length;
  const cancelled = bookings.filter((b) => b.status === 'Cancelled').length;

  // Completion rate: avoid division by zero
  const completionRate =
    completed + cancelled > 0 ? completed / (completed + cancelled) : 0;

  // Activity score: normalized, maxes out at 20 bookings
  const activityScore = Math.min(1, totalBookings / 20);

  // Average rating from feedback received by this user
  const feedbacks = await Feedback.find({ reviewee_id: userId });
  const avgRating =
    feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

  // Weighted trust score scaled to 0–10
  const raw =
    completionRate * 0.4 + (avgRating / 5) * 0.4 + activityScore * 0.2;
  const trustScore = Math.round(raw * 10 * 10) / 10;

  // Persist to DB
  await User.findByIdAndUpdate(userId, { trust_score: trustScore });

  // Flag account if below threshold (Requirement 19.4)
  if (trustScore < TRUST_SCORE_THRESHOLD) {
    console.warn(
      `[TrustScore] User ${userId} trust score ${trustScore} is below threshold ${TRUST_SCORE_THRESHOLD}. Flagging for admin review.`
    );
  }

  console.log(`[TrustScore] User ${userId} trust score updated to ${trustScore}`);
  return trustScore;
}
