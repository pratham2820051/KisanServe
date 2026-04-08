import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { supabase } from '../config/supabase';

const router = Router();

router.post('/generate', authenticate, farmerOnly, async (req: Request, res: Response): Promise<void> => {
  const { cropType, location } = req.body;
  if (!cropType || !location) { res.status(400).json({ error: 'cropType and location are required' }); return; }

  const farmerId = req.user!.userId;
  const schedule = [
    { activity: 'Irrigation', date: new Date(Date.now() + 2 * 86400000).toISOString(), notes: `Water ${cropType} fields` },
    { activity: 'Fertilizer', date: new Date(Date.now() + 7 * 86400000).toISOString(), notes: 'Apply NPK fertilizer' },
    { activity: 'Harvest Check', date: new Date(Date.now() + 14 * 86400000).toISOString(), notes: 'Inspect crop readiness' },
  ];

  const { data, error } = await supabase.from('farming_calendars').upsert({
    farmer_id: farmerId, crop_type: cropType, location, schedule_json: schedule, updated_at: new Date(),
  }, { onConflict: 'farmer_id' }).select().single();

  if (error) { res.status(500).json({ error: 'Failed to generate calendar' }); return; }
  res.status(201).json({ calendar: data });
});

router.get('/', authenticate, farmerOnly, async (req: Request, res: Response): Promise<void> => {
  const { data } = await supabase.from('farming_calendars').select('*').eq('farmer_id', req.user!.userId).single();
  if (!data) { res.status(404).json({ error: 'No calendar found. Please generate one first.' }); return; }
  res.json({ calendar: data });
});

export default router;
