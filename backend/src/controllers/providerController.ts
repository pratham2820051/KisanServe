import { Request, Response } from 'express';
import { Booking, BookingStatus } from '../models/Booking';
import { Service } from '../models/Service';

const ALL_STATUSES: BookingStatus[] = ['Pending', 'Accepted', 'InProgress', 'Completed', 'Cancelled'];

/**
 * GET /provider/bookings
 * Returns all bookings for the authenticated Service_Provider grouped by status.
 * Requirements: 8.3
 */
export async function getProviderBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const bookings = await Booking.find({ provider_id: user.userId })
    .populate('farmer_id', 'name phone')
    .populate('service_id', 'type price')
    .sort({ createdAt: -1 })
    .lean();

  // Group by status
  const grouped = ALL_STATUSES.reduce<Record<BookingStatus, typeof bookings>>(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    {} as Record<BookingStatus, typeof bookings>
  );

  for (const booking of bookings) {
    const status = booking.status as BookingStatus;
    if (grouped[status]) {
      grouped[status].push(booking);
    }
  }

  res.status(200).json(grouped);
}

/**
 * GET /provider/earnings
 * Returns total earnings and completed booking count for the authenticated Service_Provider.
 * Requirements: 8.4
 */
export async function getProviderEarnings(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const completedBookings = await Booking.find({
    provider_id: user.userId,
    status: 'Completed',
  })
    .populate<{ service_id: { price: number } }>('service_id', 'price')
    .lean();

  const totalEarnings = completedBookings.reduce((sum, booking) => {
    const price = (booking.service_id as unknown as { price?: number })?.price ?? 0;
    return sum + price;
  }, 0);

  res.status(200).json({
    totalEarnings,
    completedBookings: completedBookings.length,
  });
}
