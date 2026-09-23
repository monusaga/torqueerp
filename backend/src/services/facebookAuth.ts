import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

const GRAPH_VERSION = 'v21.0';

export interface FacebookIdentity {
  /** Verified, app-scoped Facebook user id. */
  facebookId: string;
  email: string;
  name?: string;
}

interface DebugTokenResponse {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
    expires_at?: number;
  };
  error?: { message?: string };
}

interface MeResponse {
  id?: string;
  name?: string;
  email?: string;
  error?: { message?: string };
}

/**
 * Server-side verification of a Facebook user access token.
 *
 * The client never asserts an identity: the token is validated against Meta's
 * debug_token endpoint using the app access token (APP_ID|APP_SECRET), which
 * proves the token was minted for THIS app and is still valid. Only then is the
 * profile read. A token issued for any other app is rejected.
 */
export async function verifyFacebookAccessToken(accessToken: string): Promise<FacebookIdentity> {
  const appId = config.facebookAppId;
  const appSecret = config.facebookAppSecret;

  if (!appId || !appSecret) {
    throw new AppError(
      'Facebook login is not configured on this server.',
      503,
      'FACEBOOK_NOT_CONFIGURED'
    );
  }

  const appAccessToken = `${appId}|${appSecret}`;

  let debug: DebugTokenResponse;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(
        accessToken
      )}&access_token=${encodeURIComponent(appAccessToken)}`
    );
    debug = (await res.json()) as DebugTokenResponse;
  } catch {
    throw new AppError(
      'Could not reach Facebook to verify the login. Please try again.',
      502,
      'FACEBOOK_UNREACHABLE'
    );
  }

  const info = debug.data;
  if (!info || info.is_valid !== true || !info.user_id) {
    throw new AppError(
      'Facebook authentication failed: the access token is invalid or expired.',
      401,
      'INVALID_FACEBOOK_TOKEN'
    );
  }

  if (info.app_id !== appId) {
    throw new AppError(
      'Facebook authentication failed: this token was issued for a different app.',
      401,
      'FACEBOOK_TOKEN_APP_MISMATCH'
    );
  }

  let me: MeResponse;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me?fields=id,name,email&access_token=${encodeURIComponent(
        accessToken
      )}`
    );
    me = (await res.json()) as MeResponse;
  } catch {
    throw new AppError(
      'Could not reach Facebook to read your profile. Please try again.',
      502,
      'FACEBOOK_UNREACHABLE'
    );
  }

  if (!me.id || me.id !== info.user_id) {
    throw new AppError(
      'Facebook authentication failed: profile could not be verified.',
      401,
      'INVALID_FACEBOOK_TOKEN'
    );
  }

  const email = me.email?.trim().toLowerCase();
  if (!email) {
    // Facebook only returns an email when the user granted the `email`
    // permission AND their account actually has a confirmed address.
    throw new AppError(
      'Your Facebook account did not share an email address. Please allow the email permission, or sign in with Google or email instead.',
      400,
      'FACEBOOK_EMAIL_MISSING'
    );
  }

  return {
    facebookId: me.id,
    email,
    ...(me.name ? { name: me.name } : {}),
  };
}
