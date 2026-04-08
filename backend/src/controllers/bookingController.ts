import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function createBooking(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { service_id, date, timeSlot, fromLocation, toLocation, distanceKm } = req.body;

  if (!service_id || !date || !timeSlot) { res.status(400).json({ error: 'service_id, date and timeSlot are required' }); return; }

  const { data: service } = await supabase.from('services').select('*').eq('id', service_id).single();
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  if (service.status !== 'active' || !service.availability) { res.status(400).json({ error: 'Service is not available' }); return; }

  const dateStart = new Date(date); dateStart.setUTCHours(0,0,0,0);
  const dateEnd = new Date(dateStart); dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);
  const { data: dup } = await supabase.from('bookings').select('id')
    .eq('service_id', service_id).eq('time_slot', timeSlot)
    .gte('date', dateStart.toISOString()).lt('date', dateEnd.toISOString())
    .in('status', ['Pending','Accepted','InProgress']).single();
  if (dup) { res.status(409).json({ error: 'A booking already exists for this slot' }); return; }

  const insertData: Record<string, unknown> = {
    farmer_id: user.userId, service_id, provider_id: service.provider_id,
    date, time_slot: timeSlot, status: 'Pending',
  };
  if (fromLocation) insertData.from_location = fromLocation;
  if (toLocation) insertData.to_location = toLocation;
  if (distanceKm) insertData.distance_km = distanceKm;

  const { data, error } = await supabase.from('bookings').insert(insertData).select().single();
  if (error) { res.status(500).json({ error: 'Failed to create booking' }); return; }
  res.status(201).json({ booking: data });
}

export async function getBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { data, error } = await supabase.from('bookings')
    .select('*, services(*), users!provider_id(name, phone, trust_score)')
    .eq('farmer_id', user.userId).order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: 'Failed to fetch bookings' }); return; }
  res.json({ bookings: data });
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

  const isFarmer = booking.farmer_id === user.userId;
  const isProvider = booking.provider_id === user.userId;
  if (!isFarmer && !isProvider) { res.status(403).json({ error: 'Not authorized' }); return; }

  const updates: Record<string, unknown> = { status, updated_at: new Date() };
  if (status === 'Cancelled') {
    updates.cancelled_by = user.role;
    updates.cancellation_reason = cancellationReason ?? 'Cancelled by user';
  }

  const { data, error } = await supabase.from('bookings').update(updates).eq('id', id).select().single();
  if (error) { res.status(500).json({ error: 'Failed to update booking' }); return; }
  res.json({ booking: data });
}
