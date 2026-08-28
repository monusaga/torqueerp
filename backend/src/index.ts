import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import businessRoutes from './routes/business.routes.js';
import productRoutes from './routes/product.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import customerRoutes from './routes/customer.routes.js';
import saleRoutes from './routes/sale.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reportRoutes from './routes/report.routes.js';
import ocrRoutes from './routes/ocr.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import brandRoutes from './routes/brand.routes.js';
import path from 'path';
import downloadRoutes from './routes/download.routes.js';

const app = express();

// Reverse-proxy awareness: in production the app runs behind nginx/Hostinger's
// proxy, which sets X-Forwarded-For. Without this, express-rate-limit sees
// every request as coming from the proxy's IP — so one noisy client could
// exhaust the limit for everyone (and it logs ERR_ERL_UNEXPECTED_X_FORWARDED_FOR).
//
// A NUMBER (hop count) is used rather than `true`: trusting every hop would let
// a client spoof X-Forwarded-For and evade rate limiting entirely. Default 1 =
// exactly one proxy in front. Override with TRUST_PROXY if your stack differs
// (e.g. Cloudflare + nginx = 2).
const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY ?? '', 10);
if (Number.isFinite(trustProxyHops) && trustProxyHops >= 0) {
  app.set('trust proxy', trustProxyHops);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Serve static APK binaries directly
app.use('/downloads', express.static(path.join(process.cwd(), 'public', 'downloads')));

// Security & Middlewares
app.use(helmet());

// CORS: development stays permissive; production requires an explicit
// CORS_ORIGIN (single origin or comma-separated allowlist). Requests without
// an Origin header (native mobile apps like the Android client, curl,
// server-to-server) are never blocked by CORS — the browser-only Origin
// check simply does not apply to them.
const corsAllowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const corsOrigin =
  corsAllowlist.length > 0
    ? corsAllowlist
    : process.env.NODE_ENV === 'production'
      ? [] // production without CORS_ORIGIN: no browser origin is allowed
      : '*'; // development default

if (process.env.NODE_ENV === 'production' && corsAllowlist.length === 0) {
  console.warn(
    '[CORS] NODE_ENV=production but CORS_ORIGIN is not set — browser requests will be blocked. Set CORS_ORIGIN to your web origin.'
  );
}

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-business-id'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later.' } },
});
app.use(globalLimiter);

// Auth Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: { code: 'AUTH_RATE_LIMIT', message: 'Too many login attempts, please try again later.' } },
});
app.use('/api/v1/auth', authLimiter);

// Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'spare-parts-erp-backend',
    version: '1.0.0',
  });
});

// API Routes Mounting
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/businesses', businessRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/sales', saleRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/downloads', downloadRoutes);

// 404 Route Handler
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'The requested API resource was not found on this server.',
    },
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 Spare Parts ERP Backend running at http://localhost:${config.port}`);
    console.log(`📡 API endpoints active at http://localhost:${config.port}/api/v1`);
  });
}

export default app;
