import { Router } from 'express';
import { createBooking, updateBookingStatus, getFarmerBookings } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';
import { farmerOnly, farmerOrProvider } from '../middleware/rbac';

const router = Router();

// GET /bookings — Farmer gets their own bookings
router.get('/', authenticate, farmerOnly, getFarmerBookings);

// POST /bookings — Farmer creates a new booking (Requirements: 3.1, 3.7)
router.post('/', authenticate, farmerOnly, createBooking);

// PATCH /bookings/:id — Update booking status (Requirements: 3.2, 3.3, 3.4, 3.5)
router.patch('/:id', authenticate, farmerOrProvider, updateBookingStatus);

export default router;
