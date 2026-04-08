import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { providerOnly } from '../middleware/rbac';
import { getProviderBookings, getProviderEarnings, getProviderServices } from '../controllers/providerController';

const router = Router();

router.get('/bookings', authenticate, providerOnly, getProviderBookings);
router.get('/earnings', authenticate, providerOnly, getProviderEarnings);
router.get('/services', authenticate, providerOnly, getProviderServices);

export default router;
