import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [farmers, providers, activeServices, completedBookings] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Farmer'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Service_Provider'),
      supabase.from('services').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'Completed'),
    ]);

    res.json({
      farmers: farmers.count ?? 0,
      providers: providers.count ?? 0,
      activeServices: activeServices.count ?? 0,
      completedBookings: completedBookings.count ?? 0,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
