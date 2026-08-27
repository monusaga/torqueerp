# Contributing to TorqueERP

Thanks for your interest in improving TorqueERP.

## Getting started

1. Fork and clone the repository.
2. Follow the **Local development setup** section in [README.md](README.md).
3. Create a feature branch: `git checkout -b feature/short-description`.

## Ground rules

- **Never commit secrets.** `.env` files, `google-services.json`, keystores and
  database files are git-ignored — keep it that way. Use the provided
  `*.example` files for new configuration keys.
- **Do not weaken authentication or tenant isolation.** Every new endpoint
  must use `authenticateJwt` + `requireTenant` and scope queries by
  `req.business.id`. The isolation test suite is release-blocking.
- **Financial math is server-side only** and uses the Decimal helpers in
  `backend/src/lib/decimal.ts`. Never compute money in floating point on the
  client and trust the result.
- **Keep API contracts stable.** The web and Android apps share the backend;
  breaking a response shape breaks both clients.
- **Match the existing style.** TypeScript on the backend/web, Kotlin +
  Jetpack Compose on Android using the shared components in
  `android/.../ui/theme/Components.kt` — don't hand-style new screens.

## Before opening a pull request

```bash
npm --prefix backend test     # must be green
npm --prefix web run build    # tsc + production build must pass
cd android && ./gradlew assembleDebug   # Android must compile
```

Add or update tests for behavior you change — especially anything touching
money, stock movements, authentication or tenant scoping.

## Commit / PR conventions

- Small, focused commits with imperative messages ("Add supplier GSTIN filter").
- In the PR description: what changed, why, and how it was tested (mention
  physical-device testing for scanner/camera changes).

## Reporting bugs

Open an issue with reproduction steps, expected vs actual behavior, and
relevant logs (`backend` console output, Android logcat). For security
issues, follow [SECURITY.md](SECURITY.md) instead of a public issue.
