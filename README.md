# TorqueERP

TorqueERP is an automotive and motorcycle **spare-parts ERP, inventory and POS system** — a multi-tenant SaaS with a web application, a REST backend and a native Android app that turns any phone into a barcode/OCR-powered sales counter and stock-receiving scanner.

> Current retail brand of the reference deployment: **Monu Sagar** (the display name is plain text in the UI layers and easy to re-brand; all technical identifiers remain `torqueerp`).

---

## Features

- **POS counter** — search or scan parts, cart with per-line quantities, GST (CGST/SGST) breakdown, discounts, CASH/UPI/CARD/CREDIT payment, partial payment with balance due, receipt confirmation, batch "scan → auto add to cart" selling.
- **Smart scanner** — camera barcode/QR decoding (ML Kit), server product identification (`barcode` / `partNumber` / `SKU` / `qrCode`), and an **automatic OCR fallback**: when a scanned code is unknown, the printed label is read (part number / name / MRP / brand) and either matched by normalized part number or offered as a prefilled **"New Product Detected"** form. QR payloads that differ from the printed part number (common on OEM labels) are fully supported.
- **Inventory** — immutable stock-movement ledger (before/after balances), manual adjustments, low-stock/out-of-stock alerts, and a batch **Receive Stock** flow (scan → quantity stepper → add → scan next → complete).
- **Product catalog** — part numbers, barcodes/QR serials, brands, categories, MRP/cost/selling price, min-stock thresholds, vehicle compatibility, price-change history.
- **Purchases** — supplier shipments with trade discounts, freight-inclusive landed cost, automatic stock inflow and cost repricing.
- **Sales & invoices** — locked historical COGS and realized gross profit per sale, GST invoices with **A4 and 80 mm thermal PDF** generation and sharing.
- **Payments** — customer receipts and supplier payouts, settlement of unpaid (udhaar/credit) invoices with idempotency keys.
- **Customers & suppliers CRM** — vehicles, GSTIN, purchase/sale counts.
- **Reports** — live KPIs (sales, gross profit, stock valuation at cost/retail, receivables) and CSV export of the product master and sales ledger.
- **Multi-tenant** — one account can own multiple businesses with strict tenant isolation; switch the active business from web or Android.
- **Authentication** — email/password registration + login, and real **Google Sign-In** (Google-issued ID tokens verified server-side; an email address is never accepted as identity). Server-side logout invalidates all issued JWTs.
- **Notifications** — per-business alert feed with unread counts.

## Architecture

```
        Web App (React + Vite)          Android App (Kotlin + Compose)
                 \                             /
                  \      HTTPS REST API      /
                   +----- /api/v1/* --------+
                              |
                   Backend (Node + Express + TS)
              auth (JWT + Google token verification)
              tenant middleware (x-business-id)
              stock ledger • financial engine (Decimal)
              OCR field extraction • PDF generation
                              |
                     Prisma ORM (SQLite / PostgreSQL)
```

- **Single source of truth**: web and Android consume the same endpoints; all financial math is server-side and deterministic (Decimal.js — landed cost, discounts, taxes, COGS).
- **Historical cost immutability**: every sale locks the unit cost at the moment of sale; later price changes never alter past profits.
- **Tenant isolation**: every query is scoped by the authenticated user's membership and the `x-business-id` header; a release-blocking test suite proves cross-tenant access is impossible.

### Web application (`web/`)
React 19 + TypeScript + Vite + Tailwind. Public marketing site (landing, features, pricing, FAQ, APK download page with QR code) plus the authenticated ERP workspace (dashboard, POS, catalog, inventory, purchases, sales, invoices, payments, suppliers, customers, reports, settings). Dev server proxies `/api` to the backend.

### Backend API (`backend/`)
Node.js + Express + TypeScript (run with `tsx`), Prisma ORM. Route modules: `auth`, `businesses`, `products` (incl. `lookup/:code` and `identify-scan`), `inventory`, `sales`, `invoices` (incl. PDF streaming), `purchases`, `payments`, `customers`, `suppliers`, `reports` (dashboard + CSV export), `notifications`, `ocr`, `downloads` (APK distribution with published SHA-256).

### Android application (`android/`)
Kotlin + Jetpack Compose (Material 3), Retrofit/OkHttp, CameraX + ML Kit (barcode + text recognition), Credential Manager Google Sign-In. Dark-first theme with Light/System modes, batch POS scanning, batch stock receiving, invoice PDF and CSV sharing via `FileProvider`.

## Authentication & Google Sign-In

- `POST /auth/register`, `POST /auth/login` → JWT (contains a `tokenVersion` that `POST /auth/logout` increments, killing all sessions).
- `POST /auth/google` accepts **only** `{ credential }` — a Google-issued ID token. The server cryptographically verifies signature, issuer, audience, expiry and `email_verified` against Google's published certificates (Google Identity Services **or** Firebase Auth tokens). Accounts are provisioned or linked by verified identity; a client-typed email is never trusted.
- Configure `GOOGLE_CLIENT_ID` and/or `FIREBASE_PROJECT_ID` in `backend/.env`; the web app uses `VITE_GOOGLE_CLIENT_ID` (or Firebase web config), and Android uses `google-services.json` — see [android/SETUP.md](android/SETUP.md).

## Project structure

```
/
├── android/            # Native Android app (Kotlin + Compose)
│   ├── app/            # Application module (screens, api, models, theme)
│   └── SETUP.md        # google-services.json + signing keystore instructions
├── backend/            # Express + TypeScript REST API
│   ├── prisma/         # schema.prisma, seed
│   ├── src/            # routes, services, middleware, lib
│   └── tests/          # Vitest suite (isolation, finance, auth, scanning…)
├── web/                # React + Vite web app (marketing + ERP workspace)
├── docs/               # Architecture / API / deployment / security notes
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
└── .gitignore
```

## Local development setup

Prerequisites: **Node.js 18+**, npm. For Android: **JDK 17** + Android SDK (API 35).

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill in values (see below)
npm install
npm run db:push               # create the SQLite dev database
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:4000

# 2. Web
cd ../web
cp .env.example .env          # optional (Google Sign-In)
npm install
npm run dev                   # http://localhost:3000 (proxies /api to :4000)
```

Seeded demo tenants (development only): `owner.a@example.com` / `password123` and `owner.b@example.com` / `password123`.

## Environment configuration

`backend/.env` (see `backend/.env.example`):

```
PORT=4000
DATABASE_URL="file:./dev.db"        # or a PostgreSQL URL
JWT_SECRET=                         # long random secret
JWT_EXPIRES_IN="7d"
GOOGLE_CLIENT_ID=                   # OAuth 2.0 Web Client ID (Google Sign-In)
FIREBASE_PROJECT_ID=                # and/or Firebase project id
```

`web/.env` (see `web/.env.example`):

```
VITE_GOOGLE_CLIENT_ID=              # same web client id as the backend
# or VITE_FIREBASE_* values for the Firebase popup flow
```

**Never commit real `.env` files** — they are git-ignored.

## Android build instructions

See [android/SETUP.md](android/SETUP.md) for the two local files you must supply (neither is committed):

1. `android/app/google-services.json` — from your Firebase project (package `com.torqueerp.app`, with your signing SHA-1 registered) — required for Google Sign-In.
2. `android/keystore.properties` + your keystore — required for production-signed release builds (copy `android/keystore.properties.example`).

```bash
cd android
./gradlew assembleDebug      # development
./gradlew assembleRelease    # production (signed)
```

## Production build

- **Web**: `cd web && npm run build` → static output in `web/dist/` (serve behind the same origin as the API or configure CORS).
- **Backend**: `cd backend && npm run build && npm start`, with a production `DATABASE_URL` (PostgreSQL recommended), a strong `JWT_SECRET`, and HTTPS termination in front. See `docs/DEPLOYMENT.md`.
- **Android**: `./gradlew assembleRelease`; publish the APK and its SHA-256 via the backend downloads route (`backend/src/routes/download.routes.ts` holds the published metadata).

## Testing

```bash
npm --prefix backend test
```

The Vitest suite covers authentication/session security, Google token verification (real RS256 signatures against a test key), tenant isolation, financial/COGS math, inventory concurrency, scanner identification (barcode/QR/OCR matching and normalization), account deletion cascades, and APK distribution integrity.

## Security notes

- All product/inventory/sales lookups are tenant-scoped server-side; the `x-business-id` header is validated against the caller's memberships.
- Google credentials are verified cryptographically server-side; no email-based identity shortcuts exist.
- Secrets (`.env`, `google-services.json`, keystores) are excluded from the repository — see [SECURITY.md](SECURITY.md) and `docs/SECURITY.md`.
- CSV exports sanitize spreadsheet-formula injection; payments/sales support idempotency keys.

## Deployment

See `docs/DEPLOYMENT.md`. Summary: provision PostgreSQL, set backend env, `prisma db push`/migrate, build web to static hosting or serve via a reverse proxy with the API under the same origin (`/api/v1`), and distribute the signed APK through the built-in downloads endpoint (which publishes the file's SHA-256 for verification).
