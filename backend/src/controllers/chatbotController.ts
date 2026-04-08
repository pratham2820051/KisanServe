import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const KB_PATH = path.join(__dirname, '../data/farmingKnowledge.json');

interface KBEntry {
  id?: string;
  keywords: string[];
  question?: string;
  answer: string;
}

function loadKB(): KBEntry[] {
  try { return JSON.parse(fs.readFileSync(KB_PATH, 'utf-8')); } catch { return []; }
}

function saveKB(entries: KBEntry[]): void {
  fs.writeFileSync(KB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

function findAnswer(query: string, entries: KBEntry[]): string {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  let bestScore = 0, bestAnswer = '';
  for (const entry of entries) {
    let score = 0;
    if (entry.question && entry.question.toLowerCase().includes(q)) score += 100;
    for (const kw of entry.keywords) {
      const kwLower = kw.toLowerCase();
      if (q.includes(kwLower)) score += kwLower.split(' ').length * 3;
      else for (const word of words) if (word.length > 3 && kwLower.includes(word)) score += 1;
    }
    if (score > bestScore) { bestScore = score; bestAnswer = entry.answer; }
  }
  if (bestScore > 0) return bestAnswer;
  return `I don't have specific information about that yet. For expert advice, contact your local Krishi Vigyan Kendra (KVK) or call the Kisan Call Centre: 1800-180-1551 (free, 24/7).`;
}

export async function queryChat(req: Request, res: Response): Promise<void> {
  const { query } = req.body;
  if (!query?.trim()) { res.status(400).json({ error: 'query is required' }); return; }
  const entries = loadKB();
  const answer = findAnswer(query.trim(), entries);
  res.json({ response: answer, source: 'knowledge-base' });
}

export async function listKnowledge(req: Request, res: Response): Promise<void> {
  const entries = loadKB();
  res.json({ entries, total: entries.length });
}

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

export async function deleteKnowledge(req: Request, res: Response): Promise<void> {
  const index = parseInt(req.params.index);
  const entries = loadKB();
  if (isNaN(index) || index < 0 || index >= entries.length) { res.status(404).json({ error: 'Entry not found' }); return; }
  entries.splice(index, 1);
  saveKB(entries);
  res.json({ message: 'Entry deleted', total: entries.length });
}

// Multer for PDF upload (memory storage)
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are accepted'));
  },
}).single('pdf');

/**
 * POST /chatbot/knowledge/pdf
 * Upload a PDF, extract text, split into paragraphs, save each as a KB entry.
 */
export async function uploadPdfKnowledge(req: Request, res: Response): Promise<void> {
  if (!req.file) { res.status(400).json({ error: 'No PDF file provided' }); return; }

  let text = '';
  try {
    // Dynamic import to avoid pdf-parse test file issue
    const pdfParse = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(req.file.buffer);
    text = data.text;
  } catch (e) {
    console.error('PDF parse error:', e);
    res.status(400).json({ error: 'Failed to parse PDF. Make sure it is a valid text-based PDF (not a scanned image).' });
    return;
  }

  // Split into paragraphs (non-empty chunks of 50+ chars)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p: string) => p.replace(/\s+/g, ' ').trim())
    .filter((p: string) => p.length > 50);

  if (paragraphs.length === 0) {
    res.status(400).json({ error: 'No readable content found in PDF. Make sure it is not a scanned image PDF.' });
    return;
  }

  const entries = loadKB();
  const added: KBEntry[] = [];

  for (const para of paragraphs) {
    // Extract keywords from first 10 words
    const words = para.toLowerCase().split(/\s+/).slice(0, 10)
      .filter((w: string) => w.length > 3)
      .map((w: string) => w.replace(/[^a-z]/g, ''));
    const keywords = [...new Set(words)].filter(Boolean).slice(0, 5);

    const entry: KBEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      keywords,
      answer: para,
    };
    entries.push(entry);
    added.push(entry);
  }

  saveKB(entries);
  res.status(201).json({
    message: `Successfully extracted and saved ${added.length} entries from PDF`,
    added: added.length,
    total: entries.length,
  });
}
