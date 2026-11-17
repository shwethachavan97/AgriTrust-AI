import type { NextFunction, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/auth-crypto.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthenticatedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  role: 'farmer' | 'expert' | 'admin';
  preferredLanguage: string;
  isDemo: boolean;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  authUser?: AuthenticatedUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    // 1. Check AgriTrust HMAC-signed session token (password / demo accounts)
    if (token.startsWith('at_')) {
      const payload = verifySessionToken(token);
      if (!payload) {
        return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      }
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!dbUser || !dbUser.isActive) {
        return res.status(403).json({ error: 'Account is inactive or not found.' });
      }

      req.authUser = {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role as 'farmer' | 'expert' | 'admin',
        preferredLanguage: dbUser.preferredLanguage,
        isDemo: dbUser.isDemo,
        isActive: dbUser.isActive,
      };
      return next();
    }

    // 2. Otherwise verify Firebase ID Token
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email || `${decoded.uid}@firebase.user`;
    const preferredRole =
      typeof req.headers['x-agritrust-role'] === 'string'
        ? req.headers['x-agritrust-role']
        : undefined;

    const dbUser = await getOrCreateUser(
      decoded.uid,
      email,
      decoded.name,
      preferredRole
    );

    if (!dbUser.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    req.authUser = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role as 'farmer' | 'expert' | 'admin',
      preferredLanguage: dbUser.preferredLanguage,
      isDemo: dbUser.isDemo,
      isActive: dbUser.isActive,
    };
    return next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid authentication token.' });
  }
};

export const requireRole = (...allowedRoles: Array<'farmer' | 'expert' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      return res.status(403).json({
        error: `Access denied. This action requires ${allowedRoles.join(' or ')} permissions.`,
      });
    }
    return next();
  };
};
