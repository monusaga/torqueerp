import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface BusinessContext {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  allowNegativeStock: boolean;
  defaultTaxRate: number;
}

export interface MemberContext {
  role: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      business?: BusinessContext;
      membership?: MemberContext;
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  businessId?: string;
  tokenVersion?: number;
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header.' }
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, isActive: true, tokenVersion: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User account not found or deactivated.' }
      });
      return;
    }

    // Tokens issued before the last logout carry a stale tokenVersion and are rejected.
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      res.status(401).json({
        error: { code: 'SESSION_INVALIDATED', message: 'Session has been logged out. Please sign in again.' }
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    // Optional business selection via token or header (x-business-id)
    const businessId = (req.headers['x-business-id'] as string) || decoded.businessId;

    if (businessId) {
      const membership = await prisma.businessMember.findUnique({
        where: {
          businessId_userId: {
            businessId,
            userId: user.id
          }
        },
        include: {
          business: true
        }
      });

      if (membership && membership.isActive) {
        req.business = {
          id: membership.business.id,
          name: membership.business.name,
          slug: membership.business.slug,
          currency: membership.business.currency,
          timezone: membership.business.timezone,
          allowNegativeStock: membership.business.allowNegativeStock,
          defaultTaxRate: membership.business.defaultTaxRate
        };

        let permissions: string[] = [];
        try {
          permissions = JSON.parse(membership.permissions || '[]');
        } catch {
          permissions = [];
        }

        req.membership = {
          role: membership.role,
          permissions
        };
      }
    }

    next();
  } catch (error) {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Authentication token is invalid or expired.' }
    });
  }
};

/**
 * Strict Tenant Guard: Release-blocking requirement
 * Ensures that all subsequent route handlers operate strictly on an authorized tenant.
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required.' }
    });
    return;
  }

  if (!req.business) {
    res.status(403).json({
      error: {
        code: 'TENANT_ACCESS_DENIED',
        message: 'No valid business context selected or unauthorized business access.'
      }
    });
    return;
  }

  next();
};

/**
 * Role-Based Access Control Guard
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.membership || !allowedRoles.includes(req.membership.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have the required permissions for this action.'
        }
      });
      return;
    }
    next();
  };
};
