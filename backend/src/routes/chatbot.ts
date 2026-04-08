import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { farmerOnly, adminOnly } from '../middleware/rbac';
import { queryChat, listKnowledge, addKnowledge, deleteKnowledge, pdfUpload, uploadPdfKnowledge } from '../controllers/chatbotController';

const router = Router();

const chatbotRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
});

router.post('/query', authenticate, chatbotRateLimit, queryChat);
router.get('/knowledge', authenticate, adminOnly, listKnowledge);
router.post('/knowledge', authenticate, adminOnly, addKnowledge);
router.delete('/knowledge/:index', authenticate, adminOnly, deleteKnowledge);
router.post('/knowledge/pdf', authenticate, adminOnly, pdfUpload, uploadPdfKnowledge);

export default router;
