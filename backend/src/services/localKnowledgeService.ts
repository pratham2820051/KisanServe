import knowledge from '../data/farmingKnowledge.json';

interface KnowledgeEntry {
  keywords: string[];
  answer: string;
}

const entries = knowledge as KnowledgeEntry[];

/**
 * Search local farming knowledge base using keyword matching.
 * No external API required — fully offline capable.
 */
export function searchKnowledge(query: string): string {
  const q = query.toLowerCase();

  // Score each entry by how many keywords match
  let bestScore = 0;
  let bestAnswer = '';

  for (const entry of entries) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  if (bestScore > 0) return bestAnswer;

  // Fallback: try partial word matching
  for (const entry of entries) {
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (kw.length > 3 && (q.includes(kw.slice(0, 4)) || kw.includes(q.split(' ')[0]))) {
        return entry.answer;
      }
    }
  }

  return `I don't have specific information about "${query}" in my knowledge base. For expert advice, contact your local Krishi Vigyan Kendra (KVK) or call the Kisan Call Centre: 1800-180-1551 (free, 24/7).`;
}
