import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { farmerOnly, adminOnly } from '../middleware/rbac';
import { queryChat, listKnowledge, addKnowledge, deleteKnowledge } from '../controllers/chatbotController';

const router = Router();

const chatbotRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
});

// Farmer — ask a question
router.post('/query', authenticate, chatbotRateLimit, queryChat);

// Admin — manage knowledge base
router.get('/knowledge', authenticate, adminOnly, listKnowledge);
router.post('/knowledge', authenticate, adminOnly, addKnowledge);
router.delete('/knowledge/:index', authenticate, adminOnly, deleteKnowledge);

export default router;
