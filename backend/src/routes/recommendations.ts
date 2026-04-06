import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { getRecommendations } from '../controllers/recommendationController';

const router = Router();

/**
 * GET /recommendations
 * Returns personalised service recommendations for the authenticated Farmer.
 * Requirements: 10.1, 10.2, 10.3
 */
router.get('/', authenticate, farmerOnly, getRecommendations);

export default router;
