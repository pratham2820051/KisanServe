import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const KB_PATH = path.join(__dirname, '../data/farmingKnowledge.json');

interface KBEntry {
  id?: string;
  keywords: string[];
  question?: string;
  answer: string;
}

function loadKB(): KBEntry[] {
  try {
    return JSON.parse(fs.readFileSync(KB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveKB(entries: KBEntry[]): void {
  fs.writeFileSync(KB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

function findAnswer(query: string, entries: KBEntry[]): string {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  let bestScore = 0;
  let bestAnswer = '';

  for (const entry of entries) {
    let score = 0;

    // Exact question match (highest priority)
    if (entry.question && entry.question.toLowerCase().includes(q)) {
      score += 100;
    }

    // Keyword matching
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      if (q.includes(kwLower)) {
        score += kwLower.split(' ').length * 3; // multi-word keywords score higher
      } else {
        // Partial word match
        for (const word of words) {
          if (word.length > 3 && kwLower.includes(word)) score += 1;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  if (bestScore > 0) return bestAnswer;

  return `I don't have specific information about that yet. For expert advice, contact your local Krishi Vigyan Kendra (KVK) or call the Kisan Call Centre: 1800-180-1551 (free, 24/7).`;
}

// POST /chatbot/query — answer a farming question
export async function queryChat(req: Request, res: Response): Promise<void> {
  const { query } = req.body;
  if (!query?.trim()) { res.status(400).json({ error: 'query is required' }); return; }

  const entries = loadKB();
  const answer = findAnswer(query.trim(), entries);
  res.json({ response: answer, source: 'knowledge-base' });
}

// GET /chatbot/knowledge — list all Q&A (admin only)
export async function listKnowledge(req: Request, res: Response): Promise<void> {
  const entries = loadKB();
  res.json({ entries, total: entries.length });
}

// POST /chatbot/knowledge — add new Q&A entry (admin only)
export async function addKnowledge(req: Request, res: Response): Promise<void> {
  const { question, keywords, answer } = req.body;
  if (!answer?.trim()) { res.status(400).json({ error: 'answer is required' }); return; }
  if (!keywords?.length && !question?.trim()) { res.status(400).json({ error: 'keywords or question is required' }); return; }

  const entries = loadKB();
  const newEntry: KBEntry = {
    id: Date.now().toString(),
    question: question?.trim(),
    keywords: Array.isArray(keywords) ? keywords : (keywords || '').split(',').map((k: string) => k.trim()).filter(Boolean),
    answer: answer.trim(),
  };
  entries.push(newEntry);
  saveKB(entries);
  res.status(201).json({ entry: newEntry, total: entries.length });
}

// DELETE /chatbot/knowledge/:index — remove a Q&A entry (admin only)
export async function deleteKnowledge(req: Request, res: Response): Promise<void> {
  const index = parseInt(req.params.index);
  const entries = loadKB();
  if (isNaN(index) || index < 0 || index >= entries.length) {
    res.status(404).json({ error: 'Entry not found' }); return;
  }
  entries.splice(index, 1);
  saveKB(entries);
  res.json({ message: 'Entry deleted', total: entries.length });
}
