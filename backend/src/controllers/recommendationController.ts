import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  // Get farmer's booking history to find preferred categories
  const { data: bookings } = await supabase.from('bookings')
    .select('services(category)').eq('farmer_id', user.userId).eq('status', 'Completed');

  const categoryCounts: Record<string, number> = {};
  for (const b of bookings ?? []) {
    const cat = (b as any).services?.category;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const preferredCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([c]) => c);

  // Get active services
  const { data: services } = await supabase.from('services')
    .select('*, users!provider_id(name, trust_score)').eq('status', 'active').eq('availability', true);

  let ranked = services ?? [];

  // Sort: preferred categories first, then by rating, then trust score
  ranked.sort((a, b) => {
    const aPreferred = preferredCategories.indexOf(a.category);
    const bPreferred = preferredCategories.indexOf(b.category);
    if (aPreferred !== bPreferred) {
      if (aPreferred === -1) return 1;
      if (bPreferred === -1) return -1;
      return aPreferred - bPreferred;
    }
    if (b.average_rating !== a.average_rating) return b.average_rating - a.average_rating;
    return ((b as any).users?.trust_score ?? 0) - ((a as any).users?.trust_score ?? 0);
  });

  res.json({ recommendations: ranked.slice(0, 10) });
}

export function invalidateRecommendationCache() {
  // No-op — no Redis cache, Supabase queries are fast enough
}
