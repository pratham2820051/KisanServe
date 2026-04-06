import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOrProvider } from '../middleware/rbac';
import { submitFeedback } from '../controllers/feedbackController';

const router = Router();

// POST /feedback — Farmer or Service_Provider submits a rating for a completed booking
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
router.post('/', authenticate, farmerOrProvider, submitFeedback);

export default router;
