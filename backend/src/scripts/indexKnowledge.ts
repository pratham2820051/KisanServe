/**
 * RAG Indexing Script
 * Run with: ts-node src/scripts/indexKnowledge.ts
 *
 * Chunks agricultural documents, generates embeddings via text-embedding-ada-002,
 * and upserts them into Pinecone.
 */

import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// ---------------------------------------------------------------------------
// Sample agricultural knowledge documents
// ---------------------------------------------------------------------------
const DOCUMENTS = [
  {
    source: 'rice-cultivation-guide',
    text: `Rice Cultivation Guide: Rice (Oryza sativa) thrives in warm, humid climates with temperatures between 20–35°C. It requires standing water (2–5 cm) during the vegetative stage. Transplant seedlings 25–30 days after germination. Maintain a plant spacing of 20×15 cm for optimal yield. Drain fields 10 days before harvest to allow soil to firm up. Common varieties include IR64, Swarna, and Basmati. Average yield is 4–6 tonnes per hectare under good management.`,
  },
  {
    source: 'wheat-diseases-guide',
    text: `Wheat Diseases Guide: The most common wheat diseases are rust (yellow, brown, and black), powdery mildew, and Karnal bunt. Yellow rust (Puccinia striiformis) appears as yellow stripes on leaves and thrives in cool, moist conditions (10–15°C). Brown rust (Puccinia triticina) forms orange-brown pustules on leaves. Apply propiconazole or tebuconazole fungicide at first sign of infection. Resistant varieties like HD-2967 and PBW-343 reduce disease pressure significantly.`,
  },
  {
    source: 'fertilizer-npk-ratios',
    text: `Fertilizer NPK Ratios: Nitrogen (N) promotes leafy green growth and is critical during vegetative stages. Phosphorus (P) supports root development and flowering. Potassium (K) improves disease resistance and fruit quality. For rice: apply N:P:K at 120:60:60 kg/ha split into basal and top-dress doses. For wheat: recommended ratio is 120:60:40 kg/ha. For vegetables: use 80:40:40 kg/ha. Urea (46% N), DAP (18% N, 46% P2O5), and MOP (60% K2O) are common fertilizer sources.`,
  },
  {
    source: 'irrigation-timing-guide',
    text: `Irrigation Timing Guide: Irrigation scheduling depends on crop growth stage and soil moisture. For rice, maintain 2–5 cm standing water during tillering and panicle initiation; drain 10 days before harvest. For wheat, critical irrigation stages are crown root initiation (21 DAS), tillering (45 DAS), jointing (65 DAS), and grain filling (85 DAS). Drip irrigation saves 30–50% water compared to flood irrigation. Soil moisture sensors or the feel method (squeeze soil — if it forms a ball, moisture is adequate) help determine irrigation need.`,
  },
  {
    source: 'pest-identification-guide',
    text: `Pest Identification Guide: Brown Plant Hopper (BPH) in rice causes "hopper burn" — circular patches of dried plants. Control with imidacloprid or buprofezin. Stem borer larvae bore into rice stems causing "dead heart" in vegetative stage and "white ear" at heading. Use cartap hydrochloride or chlorpyrifos. Aphids on wheat suck sap from leaves and transmit barley yellow dwarf virus; spray dimethoate or thiamethoxam. Fall Armyworm (Spodoptera frugiperda) attacks maize — look for ragged leaf edges and frass in the whorl; apply emamectin benzoate.`,
  },
  {
    source: 'soil-health-management',
    text: `Soil Health Management: Healthy soil has a pH of 6.0–7.5 for most crops. Conduct soil testing every 2–3 years to monitor nutrient levels and pH. Add lime to raise pH in acidic soils; use gypsum or sulfur to lower pH in alkaline soils. Organic matter improves water retention and microbial activity — incorporate 5–10 tonnes/ha of farmyard manure (FYM) before planting. Green manure crops like dhaincha (Sesbania) fix atmospheric nitrogen (80–100 kg N/ha) and improve soil structure when incorporated.`,
  },
  {
    source: 'crop-rotation-practices',
    text: `Crop Rotation Practices: Rotating crops breaks pest and disease cycles and improves soil fertility. A common rotation in India is rice–wheat–mung bean. Legumes (pulses) fix nitrogen and reduce fertilizer requirements for the following crop by 20–30 kg N/ha. Avoid planting the same crop family consecutively — e.g., do not follow tomato with brinjal (both Solanaceae). Deep-rooted crops like sunflower or sorghum improve soil structure after shallow-rooted crops like onion.`,
  },
  {
    source: 'post-harvest-storage',
    text: `Post-Harvest Storage: Grain moisture content must be below 14% for safe storage to prevent mold and mycotoxin development. Sun-dry harvested grain for 2–3 days or use mechanical dryers. Store in hermetic bags (PICS bags) or metal silos to prevent weevil and rodent damage. Treat storage structures with malathion dust before filling. Monitor stored grain temperature — above 30°C accelerates insect activity. Properly stored wheat can last 12–18 months; rice 6–12 months without significant quality loss.`,
  },
];

// ---------------------------------------------------------------------------
// Chunking utility
// ---------------------------------------------------------------------------
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

interface Chunk {
  text: string;
  source: string;
  chunkIndex: number;
}

function chunkDocument(doc: { source: string; text: string }): Chunk[] {
  const chunks: Chunk[] = [];
  const { text, source } = doc;
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push({ text: text.slice(start, end), source, chunkIndex: index });
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
    index++;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Main indexing logic
// ---------------------------------------------------------------------------
async function main() {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndexName = process.env.PINECONE_INDEX_NAME;

  if (!openaiApiKey || !pineconeApiKey || !pineconeIndexName) {
    console.error('Missing required env vars: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });
  const pinecone = new Pinecone({ apiKey: pineconeApiKey });
  const index = pinecone.index(pineconeIndexName);

  // Collect all chunks
  const allChunks: Chunk[] = [];
  for (const doc of DOCUMENTS) {
    const chunks = chunkDocument(doc);
    allChunks.push(...chunks);
    console.log(`[chunk] ${doc.source}: ${chunks.length} chunk(s)`);
  }

  console.log(`\nTotal chunks to index: ${allChunks.length}`);

  // Embed and upsert in batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);

    console.log(`\n[embed] Embedding chunks ${i + 1}–${i + batch.length}...`);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: batch.map((c) => c.text),
    });

    const vectors = batch.map((chunk, j) => ({
      id: `${chunk.source}__chunk${chunk.chunkIndex}`,
      values: embeddingResponse.data[j].embedding,
      metadata: {
        text: chunk.text,
        source: chunk.source,
        chunkIndex: chunk.chunkIndex,
      },
    }));

    console.log(`[upsert] Upserting ${vectors.length} vectors into Pinecone...`);
    await index.upsert(vectors);
    console.log(`[upsert] Done — batch ${Math.floor(i / BATCH_SIZE) + 1}`);
  }

  console.log('\n✅ Indexing complete. All chunks upserted into Pinecone.');
}

main().catch((err) => {
  console.error('Indexing failed:', err);
  process.exit(1);
});
