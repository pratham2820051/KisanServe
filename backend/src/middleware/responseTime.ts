import { Request, Response, NextFunction } from 'express';

const SLOW_THRESHOLD_MS = 2000;

export function responseTime(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs / BigInt(1_000_000));

    const msg = `[ResponseTime] ${req.method} ${req.path} - ${durationMs}ms`;
    console.log(msg);

    if (durationMs > SLOW_THRESHOLD_MS) {
      console.warn(`[SLOW] ${req.method} ${req.path} - ${durationMs}ms (exceeds 2s target)`);
    }
  });

  next();
}
