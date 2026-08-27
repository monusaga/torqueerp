# TorqueERP — API Specification & Contract

All endpoints are prefixed with `/api/v1`. The Web Application and Native Android App consume the exact same API contract.

## Base URL
- Development: `http://localhost:4000/api/v1`
- Staging / Production: `https://api.your-domain.com/api/v1`

---

## 🔐 Authentication & Session Headers
- `Authorization: Bearer <jwt-token>` (Mandatory on authenticated routes)
- `x-business-id: <uuid>` (Active tenant business context)

---

## 📌 Core Endpoints

### 1. Authentication
- `POST /auth/register`: Create user account & default tenant business.
- `POST /auth/login`: Authenticate with email/password; returns JWT and accessible businesses.
- `GET /auth/me`: Get current session and profile.

### 2. Products Master Catalog
- `GET /products`: Paginated list of products.
  - Query params: `search`, `category`, `brand`, `lowStock`, `page`, `limit`
- `POST /products`: Create product with duplicate part number check & optional opening stock.
- `GET /products/lookup/:code`: Instant scanner lookup by barcode, SKU, or part number.
- `GET /products/:id`: Get product details and price history.
- `PUT /products/:id`: Update product master and log price history.

### 3. Inventory & Stock Ledger
- `GET /inventory/movements`: Immutable stock movement audit ledger.
- `POST /inventory/adjust`: Manual adjustment (`ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DAMAGE`, `RETURN_IN`, `RETURN_OUT`).

### 4. Supplier Purchases (Inward Inflow)
- `GET /purchases`: List purchase shipments.
- `POST /purchases`: Record inward shipment with landed cost distribution, supplier discount %, stock ledger update, and payment ledger recording.

### 5. Counter POS & Sales
- `GET /sales`: List sales records.
- `POST /sales`: POS checkout (validates stock atomically, locks historical unitCost, creates Invoice, updates stock ledger, records payment).
- `GET /sales/:id`: Detailed sale transaction with itemized profit breakdown.

### 6. Tax Invoices & Thermal Printing
- `GET /invoices`: List generated invoices.
- `GET /invoices/:id`: Invoice details.
- `GET /invoices/:id/pdf?format=A4|A5|THERMAL`: Stream zero-cost PDF invoice buffer.

### 7. Payments Ledger
- `GET /payments`: Paginated payment transaction ledger.
- `POST /payments`: Record customer/supplier settlement with idempotency protection.

### 8. Executive Reports & Export
- `GET /reports/dashboard`: Live dashboard KPIs (Today's Sales, Today's Gross Profit, Total Stock Cost, Low Stock Count).
- `GET /reports/export?type=products|sales`: Download clean CSV dataset.

### 9. Zero-Cost OCR Processing
- `POST /ocr/process`: Extracts part number, MRP, and description with field confidence scores.
