/**
 * Chatbot routes
 * POST /chatbot/query — Farmer: submit a farming query, receive RAG-grounded GPT-4 response.
 *
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 17.3, 18.5
 */

import { Router, Request } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { queryChat } from '../controllers/chatbotController';

const router = Router();

/**
 * Rate limiter: max 20 requests per 15 minutes per authenticated user.
 * Keyed by userId to control AI API costs (Req 17.3).
 */
const chatbotRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: (req: Request) => req.user?.userId ?? req.ip ?? 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
  skip: () => false,
});

/**
 * POST /chatbot/query
 */
router.post('/query', authenticate, farmerOnly, chatbotRateLimit, queryChat);

export default router;
