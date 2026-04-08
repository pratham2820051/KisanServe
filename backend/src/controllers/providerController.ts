import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getProviderBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { data, error } = await supabase.from('bookings')
    .select('*, services(*), users!farmer_id(name, phone, trust_score)')
    .eq('provider_id', user.userId).order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: 'Failed to fetch bookings' }); return; }

  const grouped = { Pending: [], Accepted: [], InProgress: [], Completed: [], Cancelled: [] } as Record<string, unknown[]>;
  for (const b of data ?? []) grouped[b.status]?.push(b);

  res.json({ bookings: grouped });
}

export async function getProviderEarnings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { data, error } = await supabase.from('bookings')
    .select('services(price)').eq('provider_id', user.userId).eq('status', 'Completed');

  if (error) { res.status(500).json({ error: 'Failed to fetch earnings' }); return; }

  const totalRevenue = (data ?? []).reduce((sum: number, b: any) => sum + (b.services?.price ?? 0), 0);
  res.json({ totalRevenue, completedBookings: data?.length ?? 0 });
}

export async function getProviderServices(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { data, error } = await supabase.from('services').select('*').eq('provider_id', user.userId);
  if (error) { res.status(500).json({ error: 'Failed to fetch services' }); return; }
  res.json({ services: data });
}
