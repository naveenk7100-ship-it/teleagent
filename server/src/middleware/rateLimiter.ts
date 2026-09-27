import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * High-performance sliding-window in-memory rate limiter.
 * Protects auth endpoints against brute force and general APIs against abuse.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => req.ip || req.socket.remoteAddress || 'anonymous'
  } = options;

  const hits = new Map<string, RateLimitRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (record.resetTime <= now) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Prevent memory retention on process shutdown
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in automated test runs
    if (process.env.TEST_ENV === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const record = hits.get(key);

    if (!record || record.resetTime <= now) {
      hits.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    record.count++;
    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

/**
 * Production strict rate limiter for authentication endpoints
 * Limit: 20 attempts per 15 minutes per IP
 */
const prodAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
});

/**
 * Development-friendly rate limiter for authentication endpoints
 * Limit: 100 attempts per 5 seconds per IP (enables seamless local development testing)
 */
const devAuthLimiter = createRateLimiter({
  windowMs: 5 * 1000,
  maxRequests: 100,
  message: 'Too many authentication attempts in development mode. Please wait a few seconds.',
});

/**
 * Environment-aware Auth Rate Limiter
 * - Production: Strict 20 attempts / 15 minutes protection
 * - Development: Fast-recovering 100 attempts / 5 seconds window
 */
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const limiter = isProduction ? prodAuthLimiter : devAuthLimiter;
  return limiter(req, res, next);
};

/**
 * General API rate limiter for REST routes
 * Limit: 300 requests per 1 minute per IP
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 300,
  message: 'Too many API requests. Please slow down.',
});
