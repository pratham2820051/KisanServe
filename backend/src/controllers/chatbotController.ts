import { Request, Response } from 'express';
import { searchKnowledge } from '../services/localKnowledgeService';

/**
 * POST /chatbot/query
 * Searches local farming knowledge base — no external API required.
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6
 */
export async function queryChat(req: Request, res: Response): Promise<void> {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query must be a non-empty string' });
    return;
  }

  const answer = searchKnowledge(query.trim());
  res.json({ response: answer, source: 'local-knowledge' });
}
