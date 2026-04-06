import OpenAI from 'openai';
import { Pinecone, type ScoredPineconeRecord } from '@pinecone-database/pinecone';

const EMBEDDING_MODEL = 'text-embedding-ada-002';

function getClients() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
  return { openai, index };
}

/**
 * Embed a query and retrieve the top-K most relevant text chunks from Pinecone.
 */
export async function retrieveContext(query: string, topK = 5): Promise<string[]> {
  const { openai, index } = getClients();

  const embeddingResponse = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: query,
  });

  const queryVector = embeddingResponse.data[0].embedding;

  const queryResponse = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  return (queryResponse.matches ?? [])
    .map((match: ScoredPineconeRecord) => (match.metadata as { text?: string })?.text ?? '')
    .filter(Boolean);
}

/**
 * Build a RAG-augmented prompt from retrieved context chunks and the user query.
 */
export function buildRagPrompt(query: string, context: string[]): string {
  const contextBlock =
    context.length > 0
      ? context.map((chunk, i) => `[${i + 1}] ${chunk}`).join('\n\n')
      : 'No relevant context found.';

  return `You are an agricultural assistant for farmers in India. Answer the user's question using ONLY the information provided in the context below. If the answer is not found in the context, say "I don't have enough information to answer that question."

CONTEXT:
${contextBlock}

USER QUESTION:
${query}

ANSWER:`;
}
