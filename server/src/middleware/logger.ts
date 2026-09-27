import { Request, Response, NextFunction } from 'express';
import { SecretService } from '../services/secretService.js';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'session',
  'secret',
  'authorization',
  'key',
  'customgeminikey',
  'customopenaikey',
  'telegramtoken',
  'geminiapikey',
  'cookie',
]);

/**
 * Deeply redacts sensitive keys from objects before logging
 */
export function sanitizeLogObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return SecretService.redactSecrets(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeLogObject);
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('key')) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = sanitizeLogObject(val);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Production Structured Request Logger Middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Skip logging during unit test execution
  if (process.env.TEST_ENV === 'true') {
    return next();
  }

  // Skip noise on high-frequency health checks
  if (req.path === '/api/health' || req.path === '/health') {
    return next();
  }

  const startTime = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown',
    };

    const statusLevel = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    const logStr = `[${logEntry.timestamp}] [${statusLevel}] ${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`;

    if (res.statusCode >= 500) {
      console.error(logStr);
    } else if (res.statusCode >= 400) {
      console.warn(logStr);
    } else {
      console.log(logStr);
    }
  });

  next();
}
