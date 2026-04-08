import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function listServices(req: Request, res: Response): Promise<void> {
  const { lat, lng, radius, category, minPrice, maxPrice, minRating, sortBy } = req.query as Record<string, string>;

  let query = supabase.from('services').select('*, users!provider_id(name, trust_score)').eq('status', 'active').eq('availability', true);

  if (category) query = query.eq('category', category);
  if (minPrice) query = query.gte('price', parseFloat(minPrice));
  if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
  if (minRating) query = query.gte('average_rating', parseFloat(minRating));
  if (sortBy === 'price') query = query.order('price', { ascending: true });
  else if (sortBy === 'rating') query = query.order('average_rating', { ascending: false });

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: 'Failed to fetch services' }); return; }

  // Client-side geo filter if lat/lng provided
  let services = data ?? [];
  if (lat && lng) {
    const latN = parseFloat(lat), lngN = parseFloat(lng), rad = parseFloat(radius ?? '50');
    services = services.filter(s => {
      if (!s.lat || !s.lng) return false;
      const d = Math.sqrt(Math.pow(s.lat - latN, 2) + Math.pow(s.lng - lngN, 2)) * 111;
      return d <= rad;
    });
  }

  res.json({ services });
}

export async function createService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { type, price, availability, description, lat, lng } = req.body;

  if (!type || !price) { res.status(400).json({ error: 'type and price are required' }); return; }

  const { data, error } = await supabase.from('services').insert({
    provider_id: user.userId, type, category: type,
    price: parseFloat(price), availability: availability ?? true,
    description, status: 'pending', lat, lng,
  }).select().single();

  if (error) { res.status(500).json({ error: 'Failed to create service' }); return; }
  res.status(201).json({ service: data });
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const updates = req.body;

  const { data: existing } = await supabase.from('services').select('provider_id').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Service not found' }); return; }
  if (existing.provider_id !== user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

  const { data, error } = await supabase.from('services').update({ ...updates, updated_at: new Date() }).eq('id', id).select().single();
  if (error) { res.status(500).json({ error: 'Failed to update service' }); return; }
  res.json({ service: data });
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const { data: existing } = await supabase.from('services').select('provider_id').eq('id', id).single();
  if (!existing) { res.status(404).json({ error: 'Service not found' }); return; }
  if (existing.provider_id !== user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

  await supabase.from('bookings').update({ status: 'Cancelled', cancelled_by: 'system', cancellation_reason: 'Service was deleted' })
    .eq('service_id', id).in('status', ['Pending', 'Accepted']);

  await supabase.from('services').delete().eq('id', id);
  res.json({ message: 'Service deleted' });
}
