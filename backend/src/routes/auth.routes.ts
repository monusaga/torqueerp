import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticateJwt } from '../middleware/auth.js';
import { verifyGoogleIdToken } from '../services/googleAuth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  businessName: z.string().min(2, 'Business name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Google sign-in accepts ONLY a Google-issued credential (ID token JWT).
// A frontend-supplied email is never accepted as proof of Google identity.
const googleAuthSchema = z.object({
  credential: z.string().min(1, 'A Google-issued ID token credential is required.'),
  businessName: z.string().optional(),
});

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new AppError('An account with this email already exists.', 409, 'USER_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Create user, default business, and OWNER membership atomically
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          passwordHash,
          phone: data.phone,
        },
      });

      const slug = `${data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const business = await tx.business.create({
        data: {
          name: data.businessName.trim(),
          slug,
          phone: data.phone,
          email: data.email.toLowerCase().trim(),
        },
      });

      const membership = await tx.businessMember.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: 'OWNER',
          permissions: JSON.stringify(['*']),
        },
      });

      return { user, business, membership };
    });

    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        businessId: result.business.id,
        tokenVersion: result.user.tokenVersion,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      activeBusiness: {
        id: result.business.id,
        name: result.business.name,
        slug: result.business.slug,
        currency: result.business.currency,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
      include: {
        memberships: {
          where: { isActive: true },
          include: { business: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const defaultMembership = user.memberships[0];
    const activeBusiness = defaultMembership ? defaultMembership.business : null;

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        businessId: activeBusiness?.id,
        tokenVersion: user.tokenVersion,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      activeBusiness: activeBusiness ? {
        id: activeBusiness.id,
        name: activeBusiness.name,
        slug: activeBusiness.slug,
        currency: activeBusiness.currency,
      } : null,
      businesses: user.memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: m.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/google - Google Sign-In (server-side verified Google/Firebase ID token)
router.post('/google', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Defense in depth: legacy fake-auth payloads ({ email: ... } without a
    // Google credential) are rejected explicitly with 401, not just schema-400.
    if (typeof req.body?.credential !== 'string' || req.body.credential.length === 0) {
      throw new AppError(
        'Google authentication requires a Google-issued ID token. An email address is not accepted as proof of identity.',
        401,
        'GOOGLE_CREDENTIAL_REQUIRED'
      );
    }

    const data = googleAuthSchema.parse(req.body);

    // Cryptographically verify the credential with Google (signature, issuer,
    // audience, expiry, email_verified). Throws 401 on any failure.
    const identity = await verifyGoogleIdToken(data.credential);
    const normalizedEmail = identity.email;
    const displayName = identity.name?.trim() || normalizedEmail.split('@')[0];

    const membershipInclude = {
      memberships: {
        where: { isActive: true },
        include: { business: true },
      },
    } as const;

    // 1) Match by verified Google subject id (stable identity).
    let user = await prisma.user.findUnique({
      where: { googleId: identity.googleId },
      include: membershipInclude,
    });

    // 2) Else match by email — safe to link because the email comes from a
    //    Google-verified token (email_verified === true), never from the client.
    //    An attacker cannot obtain a Google-verified token for someone else's email.
    if (!user) {
      const byEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: membershipInclude,
      });
      if (byEmail) {
        if (!byEmail.googleId) {
          await prisma.user.update({
            where: { id: byEmail.id },
            data: { googleId: identity.googleId },
          });
        }
        user = byEmail;
      }
    }

    if (user && !user.isActive) {
      throw new AppError('This account has been deactivated.', 403, 'ACCOUNT_DEACTIVATED');
    }

    let activeBusiness: any = null;

    if (!user) {
      // Auto-provision user, default business, and OWNER membership atomically
      const defaultBizName = data.businessName?.trim() || `${displayName}'s Auto Spares`;
      // Google-only accounts get an unusable random password hash; password
      // login stays impossible for them until they set one explicitly.
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(`google-sso-${Date.now()}-${Math.random()}`, salt);

      const provisionResult = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: displayName,
            email: normalizedEmail,
            googleId: identity.googleId,
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
      activeBusiness: activeBusiness ? {
        id: activeBusiness.id,
        name: activeBusiness.name,
        slug: activeBusiness.slug,
        currency: activeBusiness.currency,
      } : null,
      businesses: user!.memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: m.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout - Server-side session invalidation.
// Incrementing tokenVersion invalidates every previously issued JWT for this user.
router.post('/logout', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: { increment: 1 } },
    });

    res.json({ success: true, message: 'Logged out. All existing sessions are invalidated.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        memberships: {
          where: { isActive: true },
          include: { business: true },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      activeBusiness: req.business || null,
      businesses: user.memberships.map((m) => ({
        id: m.business.id,
        name: m.business.name,
        role: m.role,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/auth/account - Permanently delete user account and personal data
router.delete('/account', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    await prisma.$transaction(async (tx) => {
      // Find owned businesses
      const memberships = await tx.businessMember.findMany({
        where: { userId, role: 'OWNER' },
      });

      for (const m of memberships) {
        const bizId = m.businessId;
        await tx.returnItem.deleteMany({ where: { return: { businessId: bizId } } });
        await tx.return.deleteMany({ where: { businessId: bizId } });
        await tx.payment.deleteMany({ where: { businessId: bizId } });
        await tx.saleItem.deleteMany({ where: { sale: { businessId: bizId } } });
        await tx.sale.deleteMany({ where: { businessId: bizId } });
        await tx.invoice.deleteMany({ where: { businessId: bizId } });
        await tx.purchaseItem.deleteMany({ where: { purchase: { businessId: bizId } } });
        await tx.purchase.deleteMany({ where: { businessId: bizId } });
        await tx.stockMovement.deleteMany({ where: { businessId: bizId } });
        await tx.productPriceHistory.deleteMany({ where: { product: { businessId: bizId } } });
        await tx.product.deleteMany({ where: { businessId: bizId } });
        await tx.productCategory.deleteMany({ where: { businessId: bizId } });
        await tx.productBrand.deleteMany({ where: { businessId: bizId } });
        await tx.customer.deleteMany({ where: { businessId: bizId } });
        await tx.supplier.deleteMany({ where: { businessId: bizId } });
        await tx.notification.deleteMany({ where: { businessId: bizId } });
        await tx.auditLog.deleteMany({ where: { businessId: bizId } });
        await tx.tenantSetting.deleteMany({ where: { businessId: bizId } });
        await tx.subscription.deleteMany({ where: { businessId: bizId } });
        await tx.businessMember.deleteMany({ where: { businessId: bizId } });
        await tx.business.delete({ where: { id: bizId } });
      }

      await tx.businessMember.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({ success: true, message: 'Account permanently deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
