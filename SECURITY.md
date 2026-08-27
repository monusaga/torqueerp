# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Email the
maintainer instead and include reproduction steps and impact. You will get a
response as soon as possible, and a fix before any public disclosure.

## Secrets & configuration

The repository intentionally contains **no secrets**:

| Secret | Where it lives locally | Committed? |
|---|---|---|
| Backend env (JWT secret, DB URL, Google client id) | `backend/.env` | No — use `backend/.env.example` |
| Web env (Google/Firebase web config) | `web/.env` | No — use `web/.env.example` |
| Firebase Android config | `android/app/google-services.json` | No — see `android/SETUP.md` |
| Release keystore + passwords | `android/keystore/` + `android/keystore.properties` | No — see `android/keystore.properties.example` |
| Development database (contains user data) | `backend/prisma/dev.db` | No |

If you believe a secret has ever been committed, treat it as compromised:
rotate it (new JWT secret invalidates sessions; rotate OAuth clients in the
Google console; re-issue keystores cannot be rotated — protect them).

## Security properties of the codebase

- **Authentication**: JWT with a server-side `tokenVersion` — logout and
  account deletion invalidate all previously issued tokens.
- **Google Sign-In**: only Google-issued ID tokens are accepted and they are
  verified server-side (signature against Google's published certs, issuer,
  audience, expiry, `email_verified`). A client-supplied email address is
  never proof of identity.
- **Tenant isolation**: every data route requires an authenticated membership
  in the business named by the `x-business-id` header; all queries are scoped
  by `businessId`. Cross-tenant access is covered by release-blocking tests.
- **Financial integrity**: server-side Decimal arithmetic; historical COGS is
  locked per sale; payments and sales accept idempotency keys.
- **Injection hardening**: Prisma parameterized queries; CSV export output is
  sanitized against spreadsheet formula injection; zod validates all input.

## Supported versions

The `main` branch is the supported version. Apply security fixes by updating
to the latest commit.
