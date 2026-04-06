import { Router } from 'express';
import { login, verifyOtp } from '../controllers/authController';
import { otpRateLimit } from '../middleware/otpRateLimit';

const router = Router();

// POST /auth/login — initiate OTP-based login (rate-limited: max 5 OTPs/phone/hour)
router.post('/login', otpRateLimit, login);

// POST /auth/verify-otp — validate OTP, issue JWT on success
router.post('/verify-otp', verifyOtp);

export default router;
