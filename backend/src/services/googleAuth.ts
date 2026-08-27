import { OAuth2Client, Certificates } from 'google-auth-library';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

// Issuers minted by Google's OAuth 2.0 authorization server (Google Identity Services).
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

// Firebase Authentication ID tokens are signed by this Google service account;
// its X.509 certs are published here (same {kid: pem} format as federated signon certs).
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface GoogleIdentity {
  /** Verified stable subject identifier (`sub` claim) — Google sub or Firebase UID. */
  googleId: string;
  email: string;
  name?: string;
}

const client = new OAuth2Client();

// Test-only overrides: lets the test suite run the library's real verification
// logic (signature, issuer, audience, expiry) against a locally generated
// signing key instead of Google's live certs. Never usable in production.
let testCerts: Certificates | null = null;
let testClientId: string | null = null;
let testFirebaseProjectId: string | null = null;

export function __setGoogleAuthTestOverrides(
  overrides: { certs: Certificates; clientId?: string; firebaseProjectId?: string } | null
): void {
  if (config.nodeEnv === 'production' || process.env.NODE_ENV === 'production') {
    throw new Error('Google auth test overrides are not permitted in production.');
  }
  testCerts = overrides?.certs ?? null;
  testClientId = overrides?.clientId ?? null;
  testFirebaseProjectId = overrides?.firebaseProjectId ?? null;
}

let firebaseCertsCache: { certs: Certificates; fetchedAt: number } | null = null;

async function getFirebaseCerts(): Promise<Certificates> {
  if (firebaseCertsCache && Date.now() - firebaseCertsCache.fetchedAt < 60 * 60 * 1000) {
    return firebaseCertsCache.certs;
  }
  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase signing certificates (HTTP ${res.status}).`);
  }
  const certs = (await res.json()) as Certificates;
  firebaseCertsCache = { certs, fetchedAt: Date.now() };
  return certs;
}

function decodeUnverifiedPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const invalidTokenError = () =>
  new AppError(
    'Google authentication failed: the Google credential is invalid or expired.',
    401,
    'INVALID_GOOGLE_TOKEN'
  );

/**
 * Server-side verification of a Google-issued credential. Accepts either:
 *  - a Google Identity Services ID token (iss: accounts.google.com, aud: GOOGLE_CLIENT_ID), or
 *  - a Firebase Authentication ID token (iss: securetoken.google.com/<project>, aud: FIREBASE_PROJECT_ID).
 *
 * The unverified `iss` claim is used ONLY to select which strict verification
 * path to run; nothing is trusted until google-auth-library has verified the
 * RS256 signature against Google's published certs plus issuer, audience and
 * expiry, and we have confirmed `email_verified === true`.
 *
 * Throws AppError(401) for any invalid, expired, forged, malformed or
 * wrong-audience token. A frontend-supplied email is never trusted.
 */
export async function verifyGoogleIdToken(credential: string): Promise<GoogleIdentity> {
  const clientId = testClientId ?? config.googleClientId;
  const firebaseProjectId = testFirebaseProjectId ?? config.firebaseProjectId;

  if (!clientId && !firebaseProjectId) {
    throw new AppError(
      'Google sign-in is not configured on this server. Set GOOGLE_CLIENT_ID and/or FIREBASE_PROJECT_ID.',
      503,
      'GOOGLE_AUTH_NOT_CONFIGURED'
    );
  }

  const unverified = decodeUnverifiedPayload(credential);
  if (!unverified) throw invalidTokenError();

  const iss = typeof unverified.iss === 'string' ? unverified.iss : '';
  const isFirebaseToken =
    !!firebaseProjectId && iss === `https://securetoken.google.com/${firebaseProjectId}`;
  const isGoogleToken = !!clientId && GOOGLE_ISSUERS.includes(iss);

  if (!isFirebaseToken && !isGoogleToken) {
    // Unknown issuer, or issuer for a mechanism that is not configured.
    throw invalidTokenError();
  }

  let payload;
  try {
    const certs =
      testCerts ??
      (isFirebaseToken
        ? await getFirebaseCerts()
        : (await client.getFederatedSignonCertsAsync()).certs);

    const audience = isFirebaseToken ? [firebaseProjectId!] : [clientId!];
    const issuers = isFirebaseToken
      ? [`https://securetoken.google.com/${firebaseProjectId}`]
      : GOOGLE_ISSUERS;

    const ticket = await client.verifySignedJwtWithCertsAsync(
      credential,
      certs,
      audience,
      issuers
    );
    payload = ticket.getPayload();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw invalidTokenError();
  }

  if (!payload || !payload.sub || !payload.email) {
    throw new AppError(
      'Google authentication failed: the Google credential is missing required claims.',
      401,
      'INVALID_GOOGLE_TOKEN'
    );
  }

  if ((payload.email_verified as unknown) !== true) {
    throw new AppError(
      'Google authentication failed: this Google account email is not verified.',
      401,
      'GOOGLE_EMAIL_NOT_VERIFIED'
    );
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}
