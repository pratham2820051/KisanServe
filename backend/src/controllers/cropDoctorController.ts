/**
 * Crop Doctor controller — multipart image upload + AI diagnosis.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import { analyzeCropImage } from '../services/cropDoctorService';

// Task 15.2: confidence threshold for expert consultation notice
const CONFIDENCE_THRESHOLD = 0.6;

// Multer: memory storage, 5 MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are accepted'));
    }
  },
});

/** Multer middleware exported for use in the router */
export const uploadMiddleware: RequestHandler = upload.single('image');

/**
 * POST /crop-doctor/analyze
 * Accepts a multipart image upload, runs GPT-4 Vision inference,
 * and returns condition + confidence + treatment within 5 s.
 */
export async function analyzeImage(req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided. Upload an image with field name "image".' });
    return;
  }

  const imageBase64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;

  let result;
  try {
    result = await analyzeCropImage(imageBase64, mimeType);
  } catch {
    res.status(503).json({ error: 'AI service temporarily unavailable. Please try again later.' });
    return;
  }

  const responseBody: Record<string, unknown> = {
    condition: result.condition,
    type: result.type,
    confidence: result.confidence,
    treatment: result.treatment,
  };

  // Task 15.2: append expert consultation notice when confidence is below threshold
  if (result.confidence < CONFIDENCE_THRESHOLD) {
    responseBody.expertConsultation =
      'Confidence is low. Please consult a local agricultural expert for accurate diagnosis.';
  }

  res.json(responseBody);
}
