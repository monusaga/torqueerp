import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
import app from '../src/index.js';
import { __setGoogleAuthTestOverrides } from '../src/services/googleAuth.js';
import { config } from '../src/config/index.js';
import { prisma } from '../src/lib/prisma.js';

/**
 * Google Sign-In security suite.
 *
 * Tokens are signed locally with a real RSA key whose public key is injected
 * into the verifier as Google's cert set. Every test therefore exercises the
 * genuine google-auth-library verification path: RS256 signature, issuer,
 * audience/client-id, expiration and email_verified — nothing is mocked away.
 */

const TEST_CLIENT_ID = 'torqueerp-test-client-id.apps.googleusercontent.com';
const TEST_FIREBASE_PROJECT = 'torqueerp-test-project';
const KID = 'torqueerp-test-key-1';
const RUN = Date.now();

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

// A second key Google does NOT publish — for forged-signature tests.
const attacker = generateKeyPairSync('rsa', { modulusLength: 2048 });
const attackerPrivatePem = attacker.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

function googlePayload(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: 'https://accounts.google.com',
    aud: TEST_CLIENT_ID,
    sub: `google-sub-${RUN}`,
    email: `google.user.${RUN}@gmail.com`,
    email_verified: true,
    name: 'Arjun Auto Tech',
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

function signCredential(
  payload: Record<string, unknown>,
  opts: { key?: string; kid?: string } = {}
) {
  return jwt.sign(payload, opts.key ?? privateKeyPem, {
    algorithm: 'RS256',
    keyid: opts.kid ?? KID,
  });
}

beforeAll(() => {
  __setGoogleAuthTestOverrides({
    certs: { [KID]: publicKeyPem },
    clientId: TEST_CLIENT_ID,
    firebaseProjectId: TEST_FIREBASE_PROJECT,
  });
});

afterAll(() => {
  __setGoogleAuthTestOverrides(null);
});

describe('Google Sign-In: server-side ID token verification', () => {
  let firstLogin: { token: string; userId: string; businessId: string };

  it('1. accepts a valid Google ID token and provisions user + business atomically', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload()), businessName: 'Arjun Royal Spares' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(`google.user.${RUN}@gmail.com`);
    expect(res.body.activeBusiness).toBeDefined();
    expect(res.body.activeBusiness.name).toBe('Arjun Royal Spares');
    expect(res.body.businesses[0].role).toBe('OWNER');

    firstLogin = {
      token: res.body.token,
      userId: res.body.user.id,
      businessId: res.body.activeBusiness.id,
    };

    const dbUser = await prisma.user.findUnique({ where: { id: res.body.user.id } });
    expect(dbUser?.googleId).toBe(`google-sub-${RUN}`);
  });

  it('2. rejects a token with an invalid (forged) signature with 401', async () => {
    const forged = signCredential(googlePayload(), { key: attackerPrivatePem });
    const res = await request(app).post('/api/v1/auth/google').send({ credential: forged });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('3. rejects an expired token with 401', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = signCredential(googlePayload({ iat: now - 7200, exp: now - 3600 }));
    const res = await request(app).post('/api/v1/auth/google').send({ credential: expired });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('4. rejects a malformed token with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: 'not-a-real-jwt-token' });

    expect(res.status).toBe(401);
  });

  it('5. rejects a token from a non-Google issuer with 401', async () => {
    const wrongIssuer = signCredential(googlePayload({ iss: 'https://evil-issuer.example.com' }));
    const res = await request(app).post('/api/v1/auth/google').send({ credential: wrongIssuer });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('6. rejects a token issued for a different Google client ID (wrong audience) with 401', async () => {
    const wrongAudience = signCredential(
      googlePayload({ aud: 'some-other-app.apps.googleusercontent.com' })
    );
    const res = await request(app).post('/api/v1/auth/google').send({ credential: wrongAudience });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });

  it('7. rejects a token whose Google email is not verified', async () => {
    const unverified = signCredential(
      googlePayload({
        sub: `google-sub-unverified-${RUN}`,
        email: `unverified.${RUN}@gmail.com`,
        email_verified: false,
      })
    );
    const res = await request(app).post('/api/v1/auth/google').send({ credential: unverified });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_EMAIL_NOT_VERIFIED');
  });

  it('8. rejects an arbitrary Gmail address sent without any Google token (legacy fake auth)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ email: `victim.${RUN}@gmail.com`, name: 'Attacker', businessName: 'Evil Corp' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_CREDENTIAL_REQUIRED');
    expect(res.body.token).toBeUndefined();
  });

  it('9. does not let an attacker with their own valid Google token act as another user', async () => {
    // Victim registers with password auth.
    const victimEmail = `victim.${RUN}@example.com`;
    const victimRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Victim Owner',
      email: victimEmail,
      password: 'VictimPassword123!',
      businessName: 'Victim Motors',
    });
    expect(victimRes.status).toBe(201);

    // Attacker holds a genuinely valid Google token — but for their OWN email.
    const attackerToken = signCredential(
      googlePayload({ sub: `google-sub-attacker-${RUN}`, email: `attacker.${RUN}@gmail.com` })
    );
    const res = await request(app).post('/api/v1/auth/google').send({ credential: attackerToken });

    expect(res.status).toBe(200);
    // They get their own fresh account — not the victim's.
    expect(res.body.user.id).not.toBe(victimRes.body.user.id);
    expect(res.body.user.email).toBe(`attacker.${RUN}@gmail.com`);
    const businessIds = (res.body.businesses ?? []).map((b: any) => b.id);
    expect(businessIds).not.toContain(victimRes.body.activeBusiness.id);
  });

  it('10. logs an existing Google user into the same TorqueERP account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload()) });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(firstLogin.userId);
    expect(res.body.activeBusiness.id).toBe(firstLogin.businessId);
  });

  it('11+12. repeated Google logins never create duplicate users or businesses', async () => {
    const usersBefore = await prisma.user.count({
      where: { email: `google.user.${RUN}@gmail.com` },
    });
    await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload()), businessName: 'Should Be Ignored' });
    const usersAfter = await prisma.user.count({
      where: { email: `google.user.${RUN}@gmail.com` },
    });
    const memberships = await prisma.businessMember.count({
      where: { userId: firstLogin.userId },
    });

    expect(usersBefore).toBe(1);
    expect(usersAfter).toBe(1);
    expect(memberships).toBe(1);
  });

  it('13. prevents a Google-authenticated user from accessing another tenant', async () => {
    // Victim tenant from test 9.
    const victim = await prisma.user.findUnique({
      where: { email: `victim.${RUN}@example.com` },
      include: { memberships: true },
    });
    const victimBusinessId = victim!.memberships[0].businessId;

    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${firstLogin.token}`)
      .set('x-business-id', victimBusinessId);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TENANT_ACCESS_DENIED');
  });

  it('14. logout invalidates the TorqueERP session server-side', async () => {
    const login = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload()) });
    expect(login.status).toBe(200);
    const sessionToken = login.body.token;

    const before = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(before.status).toBe(200);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(logout.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('SESSION_INVALIDATED');

    // Refresh session for any later assertions.
    const relogin = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload()) });
    firstLogin.token = relogin.body.token;
  });

  it('15. a deleted account cannot reuse an old session token', async () => {
    const email = `deleted.google.${RUN}@gmail.com`;
    const login = await request(app)
      .post('/api/v1/auth/google')
      .send({
        credential: signCredential(googlePayload({ sub: `google-sub-deleted-${RUN}`, email })),
      });
    expect(login.status).toBe(200);
    const sessionToken = login.body.token;

    const del = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(after.status).toBe(401);
  });

  it('links a Google identity to an existing password account with the same verified email', async () => {
    const email = `linkme.${RUN}@example.com`;
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'Link Me',
      email,
      password: 'LinkPassword123!',
      businessName: 'Linkable Motors',
    });
    expect(reg.status).toBe(201);

    const googleLogin = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(googlePayload({ sub: `google-sub-link-${RUN}`, email })) });

    expect(googleLogin.status).toBe(200);
    expect(googleLogin.body.user.id).toBe(reg.body.user.id);
    expect(googleLogin.body.activeBusiness.id).toBe(reg.body.activeBusiness.id);

    const linked = await prisma.user.findUnique({ where: { email } });
    expect(linked?.googleId).toBe(`google-sub-link-${RUN}`);
  });
});

describe('Google Sign-In via Firebase Authentication ID tokens', () => {
  function firebasePayload(overrides: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    return {
      iss: `https://securetoken.google.com/${TEST_FIREBASE_PROJECT}`,
      aud: TEST_FIREBASE_PROJECT,
      sub: `firebase-uid-${RUN}`,
      email: `firebase.user.${RUN}@gmail.com`,
      email_verified: true,
      name: 'Firebase Google User',
      iat: now,
      exp: now + 3600,
      ...overrides,
    };
  }

  it('accepts a valid Firebase ID token and provisions the account', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({ credential: signCredential(firebasePayload()) });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(`firebase.user.${RUN}@gmail.com`);
    expect(res.body.activeBusiness).toBeDefined();
  });

  it('rejects a Firebase token issued for a different Firebase project (wrong audience)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/google')
      .send({
        credential: signCredential(
          firebasePayload({
            iss: 'https://securetoken.google.com/some-other-project',
            aud: 'some-other-project',
          })
        ),
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_GOOGLE_TOKEN');
  });
});

describe('Google Sign-In configuration guard', () => {
  it('returns 503 when no Google client ID or Firebase project is configured', async () => {
    // Explicitly blank the runtime config too — .env may legitimately carry
    // real GOOGLE_CLIENT_ID / FIREBASE_PROJECT_ID values in a configured
    // environment, and this test must simulate the unconfigured state.
    const savedClientId = config.googleClientId;
    const savedFirebaseProjectId = config.firebaseProjectId;
    __setGoogleAuthTestOverrides(null);
    (config as { googleClientId: string }).googleClientId = '';
    (config as { firebaseProjectId: string }).firebaseProjectId = '';
    try {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ credential: signCredential(googlePayload()) });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('GOOGLE_AUTH_NOT_CONFIGURED');
    } finally {
      (config as { googleClientId: string }).googleClientId = savedClientId;
      (config as { firebaseProjectId: string }).firebaseProjectId = savedFirebaseProjectId;
      __setGoogleAuthTestOverrides({
        certs: { [KID]: publicKeyPem },
        clientId: TEST_CLIENT_ID,
        firebaseProjectId: TEST_FIREBASE_PROJECT,
      });
    }
  });
});
