/**
 * Crop Doctor service — GPT-4 Vision-based crop image analysis.
 * Requirements: 13.1, 13.2, 13.3
 */

import OpenAI from 'openai';

export interface CropAnalysisResult {
  condition: string;
  type: 'disease' | 'deficiency' | 'pest';
  confidence: number;
  treatment: string;
}

const ANALYSIS_PROMPT =
  'Analyze this crop image. Identify if there is a disease, nutrient deficiency, or pest damage. ' +
  'Return a JSON response with: condition (name of the problem), type (disease/deficiency/pest), ' +
  'confidence (0-1 float), treatment (recommended action). ' +
  'If the image is not a crop or no problem is detected, return condition: "healthy", type: "disease", ' +
  'confidence: 1.0, treatment: "No treatment needed."';

/**
 * Analyze a crop image using GPT-4 Vision and return structured diagnosis.
 * @param imageBase64 - Base64-encoded image string (without data URI prefix)
 * @param mimeType - MIME type of the image (default: image/jpeg)
 */
export async function analyzeCropImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<CropAnalysisResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: 'low',
            },
          },
          {
            type: 'text',
            text: ANALYSIS_PROMPT,
          },
        ],
      },
    ],
    max_tokens: 300,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const parsed = JSON.parse(raw) as Partial<CropAnalysisResult>;

  const condition = typeof parsed.condition === 'string' ? parsed.condition : 'unknown';
  const type: CropAnalysisResult['type'] =
    parsed.type === 'deficiency' || parsed.type === 'pest' ? parsed.type : 'disease';
  const confidence =
    typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0;
  const treatment = typeof parsed.treatment === 'string' ? parsed.treatment : 'Consult a local expert.';

  return { condition, type, confidence, treatment };
}
