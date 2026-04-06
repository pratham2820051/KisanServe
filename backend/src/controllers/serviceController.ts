import { Request, Response } from 'express';
import { PipelineStage } from 'mongoose';
import { Service, ServiceType } from '../models/Service';
import { Booking } from '../models/Booking';
import { redis } from '../config/redis';
import { sendPushNotification } from '../services/notificationService';

const VALID_SERVICE_TYPES: ServiceType[] = [
  'Transport',
  'Irrigation',
  'FertilizerSupply',
  'Labor',
  'SoilTesting',
  'EquipmentRental',
];

/**
 * GET /services
 * Returns service listings filtered by location, category, price, rating.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 17.4
 */
export async function listServices(req: Request, res: Response): Promise<void> {
  const {
    lng,
    lat,
    radius,
    category,
    minPrice,
    maxPrice,
    minRating,
    sortBy,
  } = req.query as Record<string, string | undefined>;

  // Parse numeric params
  const lngNum = lng !== undefined ? parseFloat(lng) : undefined;
  const latNum = lat !== undefined ? parseFloat(lat) : undefined;
  const radiusMeters = radius !== undefined ? parseFloat(radius) : 50000;
  const minPriceNum = minPrice !== undefined ? parseFloat(minPrice) : undefined;
  const maxPriceNum = maxPrice !== undefined ? parseFloat(maxPrice) : undefined;
  const minRatingNum = minRating !== undefined ? parseFloat(minRating) : undefined;

  const hasGeo =
    lngNum !== undefined &&
    latNum !== undefined &&
    !isNaN(lngNum) &&
    !isNaN(latNum);

  // Build a deterministic cache key from all query params
  const cacheKey = `services:${lngNum ?? ''}:${latNum ?? ''}:${radiusMeters}:${category ?? ''}:${minPriceNum ?? ''}:${maxPriceNum ?? ''}:${minRatingNum ?? ''}:${sortBy ?? ''}`;

  // Check Redis cache first (Requirement 17.4)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }
  } catch {
    // Redis unavailable — proceed to DB query
  }

  // Build aggregation pipeline
  const pipeline: PipelineStage[] = [];

  if (hasGeo) {
    // $geoNear must be the first stage in the pipeline
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [lngNum, latNum] },
        distanceField: 'distance',
        maxDistance: radiusMeters,
        spherical: true,
        query: {
          availability: true,
          status: 'active',
        },
      },
    });
  } else {
    // No geo filter — match availability and status directly
    pipeline.push({
      $match: {
        availability: true,
        status: 'active',
      },
    });
  }

  // Category filter (Requirement 2.1)
  if (category) {
    pipeline.push({ $match: { category } });
  }

  // Price range filter (Requirement 2.3)
  if (minPriceNum !== undefined || maxPriceNum !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (minPriceNum !== undefined && !isNaN(minPriceNum)) priceFilter.$gte = minPriceNum;
    if (maxPriceNum !== undefined && !isNaN(maxPriceNum)) priceFilter.$lte = maxPriceNum;
    pipeline.push({ $match: { price: priceFilter } });
  }

  // Minimum rating filter (Requirement 2.3)
  if (minRatingNum !== undefined && !isNaN(minRatingNum)) {
    pipeline.push({ $match: { averageRating: { $gte: minRatingNum } } });
  }

  // Populate provider name (Requirement 2.4)
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'provider_id',
      foreignField: '_id',
      as: 'provider',
    },
  });
  pipeline.push({
    $unwind: { path: '$provider', preserveNullAndEmptyArrays: false },
  });

  // Project only required fields (Requirement 2.4)
  pipeline.push({
    $project: {
      _id: 1,
      providerName: '$provider.name',
      type: 1,
      category: 1,
      price: 1,
      availability: 1,
      averageRating: 1,
      priceTrend: 1,
      optimalBookingWindow: 1,
      description: 1,
      distance: 1,
    },
  });

  // Sort (Requirement 2.3)
  const sortStage: Record<string, 1 | -1> = {};
  if (sortBy === 'price') {
    sortStage.price = 1;
  } else if (sortBy === 'rating') {
    sortStage.averageRating = -1;
  } else if (sortBy === 'distance' && hasGeo) {
    sortStage.distance = 1;
  } else {
    // Default: highest rated first
    sortStage.averageRating = -1;
  }
  pipeline.push({ $sort: sortStage });

  const services = await Service.aggregate(pipeline);

  // Requirement 2.6: descriptive message when no results
  const message =
    services.length === 0
      ? 'No services found matching your search criteria. Try expanding your search radius or adjusting filters.'
      : undefined;

  const result = { services, message: message ?? null, total: services.length };

  // Cache result in Redis with 60s TTL (Requirement 17.4)
  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
  } catch {
    // Redis unavailable — skip caching
  }

  res.status(200).json(result);
}

/**
 * Invalidate all Redis cache keys matching 'services:*'.
 */
async function invalidateServicesCache(): Promise<void> {
  try {
    const keys = await redis.keys('services:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Redis unavailable — skip cache invalidation
  }
}

/**
 * POST /services
 * Creates a new service listing for the authenticated Service_Provider.
 * New listings start with status 'pending' (requires admin approval).
 * Requirements: 8.1
 */
export async function createService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { type, price, availability, description, location } = req.body as {
    type?: string;
    price?: number;
    availability?: boolean;
    description?: string;
    location?: { lng?: number; lat?: number };
  };

  // Validate required fields
  if (!type || price === undefined || !location?.lng || !location?.lat) {
    res.status(400).json({
      error: 'Missing required fields: type, price, location.lng, location.lat',
    });
    return;
  }

  if (!VALID_SERVICE_TYPES.includes(type as ServiceType)) {
    res.status(400).json({
      error: `Invalid service type. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}`,
    });
    return;
  }

  if (typeof price !== 'number' || price < 0) {
    res.status(400).json({ error: 'price must be a non-negative number' });
    return;
  }

  const service = await Service.create({
    provider_id: user.userId,
    type: type as ServiceType,
    category: type as ServiceType,
    price,
    availability: availability ?? true,
    description,
    status: 'pending',
    location: {
      type: 'Point',
      coordinates: [location.lng, location.lat],
    },
  });

  res.status(201).json({ service });
}

/**
 * PATCH /services/:id
 * Updates price, availability, or description of an existing listing.
 * Only the owning Service_Provider may update their listing.
 * Invalidates Redis cache after update.
 * Requirements: 8.2
 */
export async function updateService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  if (service.provider_id.toString() !== user.userId) {
    res.status(403).json({ error: 'You are not authorised to update this listing' });
    return;
  }

  const { price, availability, description } = req.body as {
    price?: number;
    availability?: boolean;
    description?: string;
  };

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      res.status(400).json({ error: 'price must be a non-negative number' });
      return;
    }
    service.price = price;
  }
  if (availability !== undefined) service.availability = availability;
  if (description !== undefined) service.description = description;

  await service.save();
  await invalidateServicesCache();

  res.status(200).json({ service });
}

/**
 * DELETE /services/:id
 * Deletes a service listing owned by the authenticated Service_Provider.
 * Cancels all Pending bookings for the listing and notifies affected Farmers.
 * Invalidates Redis cache after deletion.
 * Requirements: 8.5
 */
export async function deleteService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  if (service.provider_id.toString() !== user.userId) {
    res.status(403).json({ error: 'You are not authorised to delete this listing' });
    return;
  }

  // Cancel all Pending bookings and notify Farmers (Requirement 8.5)
  const pendingBookings = await Booking.find({ service_id: id, status: 'Pending' });

  for (const booking of pendingBookings) {
    booking.status = 'Cancelled';
    booking.cancelledBy = 'system';
    booking.cancellationReason = 'Service listing was removed';
    await booking.save();

    await sendPushNotification(
      booking.farmer_id.toString(),
      'Booking Cancelled',
      'A service listing you booked has been removed. Your booking has been cancelled.'
    );
  }

  await service.deleteOne();
  await invalidateServicesCache();

  res.status(200).json({ message: 'Service deleted successfully', cancelledBookings: pendingBookings.length });
}
