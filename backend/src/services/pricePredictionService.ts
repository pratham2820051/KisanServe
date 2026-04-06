/**
 * Price Prediction Service
 * Analyzes historical booking data and seasonal patterns to forecast price trends.
 * Requirements: 20.1, 20.2, 20.3, 20.4
 */

import { Booking } from '../models/Booking';
import { Service, ServiceType, PriceTrend } from '../models/Service';

const SERVICE_CATEGORIES: ServiceType[] = [
  'Transport',
  'Irrigation',
  'FertilizerSupply',
  'Labor',
  'SoilTesting',
  'EquipmentRental',
];

/**
 * Returns the ISO week number for a given date.
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Analyzes historical booking data and seasonal patterns to forecast price trends
 * per service category, then updates all active Service documents accordingly.
 * Requirements: 20.1, 20.4
 */
export async function updatePricePredictions(): Promise<void> {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  for (const category of SERVICE_CATEGORIES) {
    // Fetch all completed bookings for services in this category from the last 90 days
    const bookings = await Booking.find({
      status: 'Completed',
      date: { $gte: ninetyDaysAgo, $lte: now },
    })
      .populate({ path: 'service_id', match: { category }, select: 'price category' })
      .lean();

    // Filter out bookings where service_id didn't match the category (populate returns null)
    const categoryBookings = bookings.filter(
      (b) => b.service_id !== null && b.service_id !== undefined
    );

    // Group prices by week number
    const weeklyPrices: Map<number, number[]> = new Map();
    for (const booking of categoryBookings) {
      const service = booking.service_id as unknown as { price: number } | null;
      if (!service) continue;
      const week = getWeekNumber(new Date(booking.date));
      if (!weeklyPrices.has(week)) weeklyPrices.set(week, []);
      weeklyPrices.get(week)!.push(service.price);
    }

    // Calculate average price per week
    const weeklyAvg: Map<number, number> = new Map();
    for (const [week, prices] of weeklyPrices.entries()) {
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      weeklyAvg.set(week, avg);
    }

    // Determine trend by comparing last 2 weeks vs previous 2 weeks
    let trend: PriceTrend = 'stable';
    let optimalWindow = 'Prices are stable, book at your convenience';

    if (weeklyAvg.size >= 4) {
      const sortedWeeks = Array.from(weeklyAvg.keys()).sort((a, b) => a - b);
      const recentWeeks = sortedWeeks.slice(-2);
      const previousWeeks = sortedWeeks.slice(-4, -2);

      const recentAvg =
        recentWeeks.reduce((sum, w) => sum + weeklyAvg.get(w)!, 0) / recentWeeks.length;
      const previousAvg =
        previousWeeks.reduce((sum, w) => sum + weeklyAvg.get(w)!, 0) / previousWeeks.length;

      if (previousAvg > 0) {
        const changePct = ((recentAvg - previousAvg) / previousAvg) * 100;

        if (changePct > 10) {
          trend = 'rising';
          optimalWindow = 'Book now before prices increase further';
        } else if (changePct < -10) {
          trend = 'falling';
          optimalWindow = 'Wait 1-2 weeks for better prices';
        }
      }
    }

    // Update all active Service documents in this category
    await Service.updateMany(
      { category, status: 'active' },
      { $set: { priceTrend: trend, optimalBookingWindow: optimalWindow } }
    );

    console.log(
      `[PricePrediction] Category=${category} trend=${trend} (${weeklyAvg.size} weeks of data)`
    );
  }

  console.log('[PricePrediction] Price predictions updated for all categories.');
}
