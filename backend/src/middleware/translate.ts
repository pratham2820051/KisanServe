import { Request, Response, NextFunction } from 'express';
import { translateText } from '../services/translationService';

const TRANSLATABLE_FIELDS = ['description', 'message', 'comment'];

async function translateFields(
  obj: Record<string, unknown>,
  targetLang: string
): Promise<boolean> {
  let usedFallback = false;

  for (const field of TRANSLATABLE_FIELDS) {
    if (typeof obj[field] === 'string') {
      const { translated, fallback } = await translateText(obj[field] as string, targetLang);
      obj[field] = translated;
      if (fallback) usedFallback = true;
    }
  }

  return usedFallback;
}

export function translateResponse(req: Request, res: Response, next: NextFunction): void {
  const lang: string = (req.user as (typeof req.user & { languagePreference?: string }) | undefined)?.languagePreference ?? 'en';

  if (lang === 'en') {
    return next();
  }

  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const mutableBody = body as Record<string, unknown>;

      translateFields(mutableBody, lang)
        .then((usedFallback) => {
          if (usedFallback) {
            mutableBody.translationFallback = true;
          }
          originalJson(mutableBody);
        })
        .catch(() => {
          originalJson(mutableBody);
        });

      return res;
    }

    return originalJson(body);
  };

  next();
}
