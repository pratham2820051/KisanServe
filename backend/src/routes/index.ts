import { Router } from 'express';
import authRoutes from './auth';
import serviceRoutes from './services';
import bookingRoutes from './bookings';
import feedbackRoutes from './feedback';
import providerRoutes from './provider';
import adminRoutes from './admin';
import alertRoutes from './alerts';
import chatbotRoutes from './chatbot';
import cropDoctorRoutes from './cropDoctor';
import recommendationRoutes from './recommendations';
import smsRoutes from './sms';
import calendarRoutes from './calendar';

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/bookings', bookingRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/provider', providerRoutes);
router.use('/admin', adminRoutes);
router.use('/alerts', alertRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/crop-doctor', cropDoctorRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/sms', smsRoutes);
router.use('/calendar', calendarRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
