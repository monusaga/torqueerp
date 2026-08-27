# TorqueERP — Production Deployment & DevOps Guide

## 🌐 Environment Variables Configuration

Copy `.env.example` to `.env`:

```env
# Server
PORT=4000
NODE_ENV=production
APP_URL=https://app.yourdomain.com
API_URL=https://api.yourdomain.com

# PostgreSQL Database
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@postgres-host:5432/torqueerp?schema=public"

# Auth Secrets (256-bit random string)
JWT_SECRET="GENERATE_A_STRONG_RANDOM_SECRET_KEY_HERE"
JWT_EXPIRES_IN="7d"

# Default Locale
DEFAULT_CURRENCY="INR"
DEFAULT_TIMEZONE="Asia/Kolkata"
```

---

## 📦 Production Build & Run Commands

### 1. Backend Service
```bash
cd backend
npm ci
npm run db:push # or prisma migrate deploy
npm run build
npm start
```

### 2. Web Frontend Service (Nginx / Vercel / Cloudflare Pages)
```bash
cd web
npm ci
npm run build
# Serve the generated 'dist/' folder via Nginx / Static Hosting
```

---

## 🗄️ Database Backup & Disaster Recovery Strategy

1. **Automated Daily Backups**:
   ```bash
   pg_dump -U postgres -d torqueerp -F c -b -v -f "/backups/torqueerp_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **Periodic Restore Verification**: Test restoring backups into staging environments monthly.
3. **Tenant Data Ownership**: Tenants can export complete product catalogs, sales ledgers, and inventory balances via `/api/v1/reports/export`.
