import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { verifyFacebookAccessToken } from '../services/facebookAuth.js';

const router = Router();

const facebookAuthSchema = z.object({
  accessToken: z.string().min(1, 'A Facebook-issued access token is required.'),
  businessName: z.string().min(2).optional(),
});

// POST /api/v1/auth/facebook - Facebook Login (server-side verified access token)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (typeof req.body?.accessToken !== 'string' || req.body.accessToken.length === 0) {
      throw new AppError(
        'Facebook authentication requires a Facebook-issued access token.',
        401,
        'FACEBOOK_TOKEN_REQUIRED'
      );
    }

    const data = facebookAuthSchema.parse(req.body);
    const identity = await verifyFacebookAccessToken(data.accessToken);
    const normalizedEmail = identity.email;
    const displayName = identity.name?.trim() || normalizedEmail.split('@')[0];

    const membershipInclude = {
      memberships: {
        where: { isActive: true },
        include: { business: true },
      },
    } as const;

    // Match by the email Facebook verified for this account. Facebook only
    // returns a confirmed address, so this cannot be forged by the client.
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: membershipInclude,
    });

    if (user && !user.isActive) {
      throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED');
    }

    let activeBusiness: any = null;

    if (!user) {
      const defaultBizName = data.businessName?.trim() || `${displayName}'s Auto Spares`;
      // Facebook-only accounts get an unusable random password hash; password
      // login stays impossible for them until they set one explicitly.
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(`facebook-sso-${Date.now()}-${Math.random()}`, salt);

      const provisionResult = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: displayName,
            email: normalizedEmail,
            passwordHash,
          },
        });

        const slug = `${defaultBizName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
        const newBusiness = await tx.business.create({
          data: {
            name: defaultBizName,
            slug,
            email: normalizedEmail,
          },
        });

        const membership = await tx.businessMember.create({
          data: {
            businessId: newBusiness.id,
            userId: newUser.id,
            role: 'OWNER',
            permissions: JSON.stringify(['*']),
          },
        });

        return { user: newUser, business: newBusiness, membership };
      });

      user = {
        ...provisionResult.user,
        memberships: [
          {
            ...provisionResult.membership,
            business: provisionResult.business,
          },
        ],
      } as any;
      activeBusiness = provisionResult.business;
    } else {
      activeBusiness = user.memberships[0]?.business || null;
    }

    const token = jwt.sign(
      {
        userId: user!.id,
        email: user!.email,
        businessId: activeBusiness?.id,
        tokenVersion: user!.tokenVersion,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      token,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
      },
      activeBusiness: activeBusiness
        ? {
            id: activeBusiness.id,
            name: activeBusiness.name,
            slug: activeBusiness.slug,
            currency: activeBusiness.currency,
          }
        : null,
      businesses: user!.memberships.map((m: any) => ({
        id: m.business.id,
        name: m.business.name,
        role: m.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
