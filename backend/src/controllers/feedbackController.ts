import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { booking_id, reviewee_id, rating, comment } = req.body;

  if (!booking_id || !reviewee_id || !rating) { res.status(400).json({ error: 'booking_id, reviewee_id and rating are required' }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be between 1 and 5' }); return; }
  if (user.userId === reviewee_id) { res.status(400).json({ error: 'Cannot review yourself' }); return; }

  const { data: booking } = await supabase.from('bookings').select('*').eq('id', booking_id).single();
  if (!booking || booking.status !== 'Completed') { res.status(400).json({ error: 'Can only review completed bookings' }); return; }

  const { data: existing } = await supabase.from('feedback').select('id').eq('booking_id', booking_id).eq('reviewer_id', user.userId).single();
  if (existing) { res.status(409).json({ error: 'You have already reviewed this booking' }); return; }

  const { data, error } = await supabase.from('feedback').insert({
    booking_id, reviewer_id: user.userId, reviewee_id, rating, comment,
  }).select().single();

  if (error) { res.status(500).json({ error: 'Failed to submit feedback' }); return; }

  // Update average rating on services
  const { data: allFeedback } = await supabase.from('feedback').select('rating').eq('reviewee_id', reviewee_id).eq('is_flagged', false);
  if (allFeedback && allFeedback.length > 0) {
    const avg = allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length;
    await supabase.from('services').update({ average_rating: Math.round(avg * 10) / 10, rating_count: allFeedback.length }).eq('provider_id', reviewee_id);
  }

  res.status(201).json({ feedback: data });
}

export async function getFeedback(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const { data, error } = await supabase.from('feedback').select('*, users!reviewer_id(name)').eq('reviewee_id', userId).eq('is_flagged', false);
  if (error) { res.status(500).json({ error: 'Failed to fetch feedback' }); return; }
  res.json({ feedback: data });
}
