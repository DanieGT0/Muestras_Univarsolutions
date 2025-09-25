import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from './auth';

declare global {
  namespace Express {
    interface Request {
      csrfToken?: string;
    }
  }
}

interface CSRFTokenStore {
  [userId: string]: {
    token: string;
    expires: number;
  };
}

// In-memory store for CSRF tokens (in production, use Redis)
const csrfTokens: CSRFTokenStore = {};

// Clean expired tokens periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(csrfTokens).forEach(userId => {
    if (csrfTokens[userId].expires < now) {
      delete csrfTokens[userId];
    }
  });
}, 15 * 60 * 1000); // Clean every 15 minutes

export const generateCSRFToken = (userId: string): string => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + (60 * 60 * 1000); // 1 hour

  csrfTokens[userId] = { token, expires };
  return token;
};

export const csrfProtection = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip CSRF protection for GET requests and health checks
  if (req.method === 'GET' || req.path === '/health') {
    return next();
  }

  // Skip CSRF for login endpoint (initial authentication)
  if (req.path === '/api/auth/login') {
    return next();
  }

  // Require authentication for CSRF validation
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required for CSRF protection'
    });
  }

  const userId = req.user.id;
  const clientToken = req.headers['x-csrf-token'] as string;

  // Check if token exists and is valid
  const storedTokenData = csrfTokens[userId];

  if (!storedTokenData) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token required',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  if (!clientToken || clientToken !== storedTokenData.token) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  if (storedTokenData.expires < Date.now()) {
    delete csrfTokens[userId];
    return res.status(403).json({
      success: false,
      message: 'CSRF token expired',
      code: 'CSRF_TOKEN_EXPIRED'
    });
  }

  // Regenerate token for next request (double-submit pattern)
  const newToken = generateCSRFToken(userId);
  res.setHeader('X-CSRF-Token', newToken);

  next();
};

export const getCSRFToken = (req: AuthRequest, res: Response) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const token = generateCSRFToken(req.user.id);
  res.json({
    success: true,
    csrfToken: token
  });
};