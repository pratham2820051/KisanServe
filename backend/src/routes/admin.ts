import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/rbac';
import { updateUserStatus, updateServiceStatus, getFlaggedReviews, updateReviewStatus, getAnalytics, getAllServices } from '../controllers/adminController';

const router = Router();

router.use(authenticate, adminOnly);
router.get('/services', getAllServices);
router.patch('/users/:id', updateUserStatus);
router.patch('/services/:id', updateServiceStatus);
router.get('/flagged-reviews', getFlaggedReviews);
router.patch('/reviews/:id', updateReviewStatus);
router.get('/analytics', getAnalytics);

export default router;
