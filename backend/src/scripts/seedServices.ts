import mongoose from 'mongoose';
import { Service } from '../models/Service';
import { User } from '../models/User';

const DEMO_SERVICES = [
  {
    title: 'Tractor Ploughing',
    description: 'Deep ploughing and soil preparation for 1 acre using modern tractor. Suitable for all crops.',
    category: 'Tractor',
    price: 1500,
    priceUnit: 'per acre',
  },
  {
    title: 'Drip Irrigation Setup',
    description: 'Complete drip irrigation installation for water-efficient farming. Saves 60% water vs flood irrigation.',
    category: 'Irrigation',
    price: 8000,
    priceUnit: 'per acre',
  },
  {
    title: 'Sprinkler Irrigation',
    description: 'Sprinkler system setup for vegetables and field crops. Covers up to 2 acres per unit.',
    category: 'Irrigation',
    price: 5000,
    priceUnit: 'per acre',
  },
  {
    title: 'NPK Fertilizer Supply',
    description: 'Premium NPK 19:19:19 fertilizer supply with doorstep delivery. Suitable for all crops.',
    category: 'Fertilizer',
    price: 1200,
    priceUnit: 'per 50kg bag',
  },
  {
    title: 'Organic Vermicompost',
    description: 'High-quality vermicompost for organic farming. Improves soil health and crop yield by 20-30%.',
    category: 'Fertilizer',
    price: 800,
    priceUnit: 'per 40kg bag',
  },
  {
    title: 'Farm Labour (Weeding)',
    description: 'Experienced farm workers for manual weeding. Team of 5 workers available daily.',
    category: 'Labour',
    price: 400,
    priceUnit: 'per worker/day',
  },
  {
    title: 'Harvesting Labour',
    description: 'Skilled harvesting team for wheat, rice, and vegetables. Includes cutting and bundling.',
    category: 'Labour',
    price: 500,
    priceUnit: 'per worker/day',
  },
  {
    title: 'Soil Testing Service',
    description: 'Complete soil health analysis — NPK, pH, organic carbon, micronutrients. Report in 3 days.',
    category: 'Soil Testing',
    price: 350,
    priceUnit: 'per sample',
  },
  {
    title: 'Tractor Transport',
    description: 'Farm produce transport using tractor-trolley. Capacity 3 tonnes. Available within 20km radius.',
    category: 'Transport',
    price: 800,
    priceUnit: 'per trip',
  },
  {
    title: 'Mini Truck Transport',
    description: 'Produce transport to mandi/market using mini truck. Capacity 1.5 tonnes. GPS tracked.',
    category: 'Transport',
    price: 1200,
    priceUnit: 'per trip',
  },
  {
    title: 'Rotavator Rental',
    description: 'Rotavator for fine soil preparation and weed incorporation. Covers 1 acre in 2 hours.',
    category: 'Equipment Rental',
    price: 600,
    priceUnit: 'per hour',
  },
  {
    title: 'Power Sprayer Rental',
    description: 'High-pressure power sprayer for pesticide and fertilizer application. 16L capacity.',
    category: 'Equipment Rental',
    price: 200,
    priceUnit: 'per day',
  },
  {
    title: 'Combine Harvester',
    description: 'Modern combine harvester for wheat and rice. Harvests 1 acre in 45 minutes.',
    category: 'Equipment Rental',
    price: 2500,
    priceUnit: 'per acre',
  },
  {
    title: 'Pesticide Spray Service',
    description: 'Professional pesticide application by certified operator. Includes chemical cost for 1 acre.',
    category: 'Pesticide',
    price: 700,
    priceUnit: 'per acre',
  },
  {
    title: 'Drone Spraying',
    description: 'Precision drone spraying for pesticides and fertilizers. Covers 1 acre in 10 minutes.',
    category: 'Equipment Rental',
    price: 400,
    priceUnit: 'per acre',
  },
];

export async function seedDemoServices(): Promise<void> {
  try {
    const count = await Service.countDocuments();
    if (count > 0) return; // Already seeded

    // Find or create a demo provider
    let provider = await User.findOne({ role: 'Service_Provider' });
    if (!provider) {
      provider = new User({
        phone: '+919000000001',
        role: 'Service_Provider',
        name: 'KisanServe Demo Provider',
        location: 'Bangalore, Karnataka',
        languagePreference: 'en',
        isActive: true,
      });
      await provider.save();
    }

    const services = DEMO_SERVICES.map(s => ({
      ...s,
      provider: provider!._id,
      isActive: true,
      location: {
        type: 'Point',
        coordinates: [77.5946 + (Math.random() - 0.5) * 0.5, 12.9716 + (Math.random() - 0.5) * 0.5],
      },
      averageRating: (3.5 + Math.random() * 1.5).toFixed(1),
      totalReviews: Math.floor(Math.random() * 50) + 5,
    }));

    await Service.insertMany(services);
    console.log(`[Seed] Inserted ${services.length} demo services`);
  } catch (err) {
    console.error('[Seed] Failed to seed services:', err);
  }
}
