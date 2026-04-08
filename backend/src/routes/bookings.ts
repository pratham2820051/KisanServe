import { Router } from 'express';
import { createBooking, updateBooking, getBookings } from '../controllers/bookingController';
import { authenticate } from '../middleware/auth';
import { farmerOnly, farmerOrProvider } from '../middleware/rbac';

const router = Router();

router.get('/', authenticate, farmerOnly, getBookings);
router.post('/', authenticate, farmerOnly, createBooking);
router.patch('/:id', authenticate, farmerOrProvider, updateBooking);

export default router;
