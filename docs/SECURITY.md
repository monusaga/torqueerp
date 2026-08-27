# TorqueERP — Security Architecture & Threat Model

Multi-tenancy and data isolation are the highest priority security requirements.

## 🛡️ Core Security Principles

### 1. Zero Trust on Client Context
- The backend never trusts a `businessId` or `tenant_id` supplied in the request body or header without validating database membership for `req.user.id`.
- Tenant context is strictly enforced via the `requireTenant` middleware.

### 2. Mandatory Automated Tenant Isolation Tests
- We maintain a release-blocking automated test suite (`backend/tests/tenant-isolation.test.ts`).
- Any attempt by Tenant A to query, modify, or export Tenant B resource IDs returns HTTP 403 Forbidden / 404 Not Found.

### 3. IDOR (Insecure Direct Object Reference) Prevention
- Every database query across products, inventory movements, purchases, sales, invoices, customers, and payments includes `where: { id, businessId: req.business.id }`.

### 4. Financial & Stock Concurrency Safety
- Stock deductions execute inside ACID atomic database transactions with concurrency validation.
- Double-selling when remaining stock is 0 is impossible unless `allowNegativeStock` is explicitly enabled by the business owner.

### 5. Historical Financial Immutability
- Historical sales capture `unitCostAtSale` at the time of purchase.
- Master catalog product price edits never alter past invoices or past gross profit values.

### 6. Zero Privileged Secrets in Frontend or Android APK
- No database credentials, JWT private secrets, or service keys are ever compiled into Web client bundles or Android APKs.
