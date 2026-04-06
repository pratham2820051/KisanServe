import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';
import { User } from '../models/User';
import { redis } from '../config/redis';

const CACHE_TTL = 300; // 5 minutes

/**
 * Invalidates the recommendation cache for a given farmer.
 * Called after each completed booking (Requirement 10.3).
 */
export async function invalidateRecommendationCache(farmerId: string): Promise<void> {
  try {
    await redis.del(`recommendations:${farmerId}`);
  } catch {
    // Non-fatal — cache miss is acceptable
  }
}

/**
 * GET /recommendations
 * Returns personalised service recommendations for the authenticated Farmer.
 * Requirements: 10.1, 10.2, 10.3, 17.4, 19.3
 */
export async function getRecommendations(req: Request, res: Response): Promise<void> {
  const farmerId = req.user!.userId;

  // --- Cache check (Requirement 17.4) ---
  try {
    const cached = await redis.get(`recommendations:${farmerId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      res.status(200).json(parsed);
      return;
    }
  } catch {
    // Proceed without cache on Redis error
  }

  // --- Farmer location ---
  const farmer = await User.findById(farmerId).lean();
  if (!farmer) {
    res.status(404).json({ error: 'Farmer not found' });
    return;
  }

  const farmerLocation = farmer.location || '';

  // --- Booking history: last 20 completed bookings ---
  const recentBookings = await Booking.find({ farmer_id: farmerId, status: 'Completed' })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate<{ service_id: { category: string } }>('service_id', 'category')
    .lean();

  const bookedCategories = new Set<string>();
  for (const b of recentBookings) {
    const svc = b.service_id as unknown as { category?: string } | null;
    if (svc?.category) bookedCategories.add(svc.category);
  }

  const hasHistory = bookedCategories.size > 0;

  // --- Base query: active + available services ---
  const baseQuery: Record<string, unknown> = { status: 'active', availability: true };

  type PopulatedProvider = { trust_score?: number; name?: string };
  type ServiceDoc = Omit<(typeof Service extends { new(): infer T } ? T : never), 'provider_id'> & {
    provider_id: PopulatedProvider | null;
    category: string;
    averageRating: number;
    [key: string]: unknown;
  };

  // Attempt to parse location as "lat,lng" coordinate pair
  const coordMatch = farmerLocation.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const rawServices = coordMatch
    ? await Service.find({
        ...baseQuery,
        location: {
          $near: {
            $geometry: { type: 'Point', coordinates: [parseFloat(coordMatch[2]), parseFloat(coordMatch[1])] },
            $maxDistance: 50000, // 50 km in metres
          },
        },
      })
        .populate('provider_id', 'trust_score name')
        .lean()
    : await Service.find(baseQuery)
        .populate('provider_id', 'trust_score name')
        .lean();

  const services = rawServices as unknown as ServiceDoc[];

  // --- Ranking ---
  const ranked = services
    .map((s) => {
      const provider = s.provider_id as PopulatedProvider | null;
      const trustScore = provider?.trust_score ?? 0;
      const categoryBoost = hasHistory && bookedCategories.has(s.category) ? 1 : 0;
      return { service: s, categoryBoost, averageRating: s.averageRating ?? 0, trustScore };
    })
    .sort((a, b) => {
      // (1) preferred categories first
      if (b.categoryBoost !== a.categoryBoost) return b.categoryBoost - a.categoryBoost;
      // (2) higher average rating
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      // (3) higher provider trust score
      return b.trustScore - a.trustScore;
    })
    .slice(0, 10)
    .map(({ service }) => service);

  const result = { recommendations: ranked, total: ranked.length };

  // --- Cache result ---
  try {
    await redis.set(`recommendations:${farmerId}`, JSON.stringify(result), 'EX', CACHE_TTL);
  } catch {
    // Non-fatal
  }

  res.status(200).json(result);
}
