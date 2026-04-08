import { Router } from 'express';
import authRoutes from './auth';
import serviceRoutes from './services';
import bookingRoutes from './bookings';
import feedbackRoutes from './feedback';
import providerRoutes from './provider';
import adminRoutes from './admin';
import chatbotRoutes from './chatbot';
import cropDoctorRoutes from './cropDoctor';
import recommendationRoutes from './recommendations';
import calendarRoutes from './calendar';
import statsRoutes from './stats';

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/stats', statsRoutes);
router.use('/bookings', bookingRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/provider', providerRoutes);
router.use('/admin', adminRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/crop-doctor', cropDoctorRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/calendar', calendarRoutes);

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
