import { redis } from '../config/redis';

function cacheKey(targetLang: string, text: string): string {
  const hash = text.slice(0, 32) + text.length;
  return `translate:${targetLang}:${hash}`;
}

export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = 'en'
): Promise<{ translated: string; fallback: boolean }> {
  if (targetLang === 'en' || targetLang === sourceLang) {
    return { translated: text, fallback: false };
  }

  const key = cacheKey(targetLang, text);

  try {
    const cached = await redis.get(key);
    if (cached) {
      return { translated: cached, fallback: false };
    }
  } catch {
    // Redis unavailable — proceed to API call
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return { translated: text, fallback: true };
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: sourceLang, target: targetLang, format: 'text' }),
      }
    );

    if (!response.ok) {
      return { translated: text, fallback: true };
    }

    const data = await response.json() as {
      data: { translations: Array<{ translatedText: string }> };
    };
    const translated = data.data.translations[0].translatedText;

    try {
      await redis.set(key, translated, 'EX', 86400);
    } catch {
      // Cache write failure is non-fatal
    }

    return { translated, fallback: false };
  } catch {
    return { translated: text, fallback: true };
  }
}
