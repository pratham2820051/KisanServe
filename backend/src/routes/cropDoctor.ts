/**
 * Crop Doctor routes
 * POST /crop-doctor/analyze — Farmer: upload crop image, receive AI diagnosis.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { uploadMiddleware, analyzeImage } from '../controllers/cropDoctorController';

const router = Router();

/**
 * POST /crop-doctor/analyze
 * Multipart upload (field: "image") → GPT-4 Vision diagnosis.
 */
router.post('/analyze', uploadMiddleware, authenticate, farmerOnly, analyzeImage);

export default router;
