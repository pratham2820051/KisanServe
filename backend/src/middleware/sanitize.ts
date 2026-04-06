import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes keys starting with '$' from an object to prevent NoSQL injection.
 */
function removeMongoOperators(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeMongoOperators);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (!key.startsWith('$')) {
        sanitized[key] = removeMongoOperators(value);
      }
    }
    return sanitized;
  }
  return obj;
}

/**
 * Recursively strips HTML tags from string values to prevent XSS.
 */
function stripHtmlTags(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>/g, '');
  }
  if (Array.isArray(obj)) {
    return obj.map(stripHtmlTags);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = stripHtmlTags(value);
    }
    return sanitized;
  }
  return obj;
}

function sanitize(obj: unknown): unknown {
  return stripHtmlTags(removeMongoOperators(obj));
}

/**
 * Express middleware that sanitizes req.body, req.query, and req.params.
 * - Prevents NoSQL injection by removing keys starting with '$'
 * - Prevents XSS by stripping HTML tags from string values
 *
 * Requirement 18.1, 18.4: Input sanitization for security hardening.
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query) as typeof req.query;
  req.params = sanitize(req.params) as typeof req.params;
  next();
}
