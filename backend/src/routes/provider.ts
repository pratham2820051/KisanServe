import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { providerOnly } from '../middleware/rbac';
import { getProviderBookings, getProviderEarnings } from '../controllers/providerController';

const router = Router();

// GET /provider/bookings — Requirements 8.3
router.get('/bookings', authenticate, providerOnly, getProviderBookings);

// GET /provider/earnings — Requirements 8.4
router.get('/earnings', authenticate, providerOnly, getProviderEarnings);

export default router;
