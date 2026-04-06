import { Request, Response } from 'express';
import { Feedback } from '../models/Feedback';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';
import { checkFraud } from '../services/fraudDetector';

/**
 * POST /feedback
 * Allows a Farmer or Service_Provider to submit a rating (1–5) + optional comment
 * for a completed booking. Each party may submit at most one review per booking.
 * After submission, if the reviewee is a Service_Provider, their average rating is
 * recalculated and propagated to all their Service documents so it is visible in
 * Marketplace listings within 60 seconds.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { booking_id, rating, comment } = req.body as {
    booking_id?: string;
    rating?: unknown;
    comment?: string;
  };

  // --- Validate required fields ---
  if (!booking_id) {
    res.status(400).json({ error: 'Missing required field: booking_id' });
    return;
  }

  const ratingNum = Number(rating);
  if (!rating || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5 || !Number.isInteger(ratingNum)) {
    res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    return;
  }

  // --- Validate booking exists and is Completed (Req 7.1, 7.2) ---
  const booking = await Booking.findById(booking_id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (booking.status !== 'Completed') {
    res.status(400).json({ error: 'Feedback can only be submitted for Completed bookings' });
    return;
  }

  const farmerId = booking.farmer_id.toString();
  const providerId = booking.provider_id.toString();
  const callerId = user.userId;

  // --- Verify caller is a party to this booking ---
  if (callerId !== farmerId && callerId !== providerId) {
    res.status(403).json({ error: 'Access denied. You are not a party to this booking.' });
    return;
  }

  // --- Determine reviewee (Req 7.1: farmer reviews provider; Req 7.2: provider reviews farmer) ---
  const revieweeId = callerId === farmerId ? providerId : farmerId;

  // --- Check for duplicate review (Req 7.4) — manual check for a clean error before the DB unique index fires ---
  const existing = await Feedback.findOne({ booking_id, reviewer_id: callerId });
  if (existing) {
    res.status(409).json({ error: 'You have already submitted feedback for this booking' });
    return;
  }

  // --- Fraud detection (Req 7.6, 9.4) ---
  const fraudResult = await checkFraud(revieweeId, ratingNum, req.ip ?? '', callerId, booking_id);

  // --- Create feedback document (flagged reviews are stored but excluded from rating calc) ---
  const feedback = await Feedback.create({
    booking_id,
    reviewer_id: callerId,
    reviewee_id: revieweeId,
    rating: ratingNum,
    comment: comment?.trim() || undefined,
    is_flagged: fraudResult.isFlagged,
    flagReason: fraudResult.reason,
  });

  // --- If reviewee is the Service_Provider and review is not flagged, recalculate and propagate average rating (Req 7.3, 7.5) ---
  if (revieweeId === providerId && !fraudResult.isFlagged) {
    const [agg] = await Feedback.aggregate<{ avgRating: number; count: number }>([
      { $match: { reviewee_id: booking.provider_id, is_flagged: { $ne: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (agg) {
      const newAvg = Math.round(agg.avgRating * 10) / 10; // one decimal place
      await Service.updateMany(
        { provider_id: booking.provider_id },
        { $set: { averageRating: newAvg, ratingCount: agg.count } }
      );
    }
  }

  res.status(201).json({ feedback });
}
