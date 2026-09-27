import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';

/**
 * Production Security Headers Middleware
 * Adds essential HTTP security headers to protect against common web vulnerabilities:
 * - Clickjacking (X-Frame-Options: DENY)
 * - MIME-sniffing (X-Content-Type-Options: nosniff)
 * - Cross-Site Scripting (X-XSS-Protection: 1; mode=block)
 * - Referrer leaks (Referrer-Policy: strict-origin-when-cross-origin)
 * - Feature abuse (Permissions-Policy)
 * - Man-in-the-middle attacks (Strict-Transport-Security in production)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Legacy XSS filter for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information sent in HTTP headers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive browser APIs
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Enforce HTTPS in production via HSTS (1 year)
  if (config.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Hide server fingerprint
  res.removeHeader('X-Powered-By');

  next();
}
