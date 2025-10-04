import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // Debug logging
  console.log('🔍 Auth Debug:', {
    path: req.path,
    method: req.method,
    authHeader: authHeader ? 'Present' : 'Missing',
    token: token ? `${token.substring(0, 20)}...` : 'Missing'
  });

  if (!token) {
    console.log('❌ Auth failed: No token provided');
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      console.log('❌ Auth failed: Invalid token', err.message);
      res.status(403).json({ message: 'Invalid or expired token' });
      return;
    }

    req.user = decoded as { id: string; email: string; role: UserRole };
    console.log('✅ Auth success:', { email: req.user.email, role: req.user.role });
    next();
  });
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log('❌ Role check failed: No user in request');
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    console.log('🔐 Role check:', {
      userRole: req.user.role,
      userRoleType: typeof req.user.role,
      requiredRoles: roles,
      requiredRolesType: typeof roles[0],
      includes: roles.includes(req.user.role),
      comparison: roles.map(r => ({ role: r, match: r === req.user.role }))
    });

    if (!roles.includes(req.user.role)) {
      console.log('❌ Role check failed: Insufficient permissions');
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    console.log('✅ Role check passed');
    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireAdminOrCommercial = requireRole([UserRole.ADMIN, UserRole.COMMERCIAL]);