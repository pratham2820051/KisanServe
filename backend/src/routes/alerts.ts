import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(20);
  res.json({ alerts: data ?? [] });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { type, message, target_location, expires_at } = req.body;
  const { data, error } = await supabase.from('alerts').insert({ type, message, target_location, expires_at }).select().single();
  if (error) { res.status(500).json({ error: 'Failed to create alert' }); return; }
  res.status(201).json({ alert: data });
});

export default router;
