# Rule 02: System Architecture, Stack & Database Conventions

> **Mandatory Reference:** This rule defines the full-stack architecture, layered backend structure, primary key standards, and ACID transactional integrity patterns modeled after the reference POS & Inventory System framework.

---

## 1. Core Technology Stack
* **Frontend:** React 18 + Vite, Tailwind CSS (custom design tokens & semantic variables), flat 1.8px-stroke SVG vector icons (`SvgIcon`), tabular monospace typography for numbers/currency/codes.
* **Backend API:** Node.js + Express.js RESTful API under `/api/v1` using connection pooling (`pg.Pool`).
* **Database:** PostgreSQL 16 (containerized via `docker-compose.yml`).
* **Full-Stack Docker Containerization (Mandatory):** `docker-compose.yml` **MUST** containerize all three tiers of the application so the entire stack runs as a unified Docker Compose project:
  1. **Database (`postgres` / `mad_max_gym_db`):** PostgreSQL 16 with persistent `pgdata` volume and `pg_isready` healthcheck.
  2. **Backend (`backend` / `mad_max_gym_backend`):** Node.js Express API (`backend/Dockerfile`) depending on healthy `postgres`, with a `/api/v1/health` Docker healthcheck.
  3. **Web Frontend (`web` / `mad_max_gym_web`):** Multi-stage Vite + Nginx container (`frontend/Dockerfile` + `frontend/nginx.conf`) depending on healthy `backend`, providing SPA `try_files` routing and `/api/` reverse proxy to `http://backend:4600/api/`.
* **Authentication & Security:** JWT (`jsonwebtoken`), `bcryptjs` password hashing (salt rounds $\ge 10$), and `express-rate-limit` on authentication endpoints.

---

## 2. Clean Layered Backend Architecture
Backend code must be strictly separated by responsibility:
```
Routes (/api/v1/*) ──► Middlewares (Auth, RBAC, RateLimit, Error) ──► Controllers (HTTP I/O) ──► Services (ACID Business Logic) ──► Database (pg.Pool)
```
* **Controllers:** Thin HTTP handlers responsible strictly for extracting request parameters, invoking service methods, and returning standardized JSON envelopes.
* **Services:** Encapsulate domain logic, multi-step calculations, pessimistic row locking, and `BEGIN ... COMMIT / ROLLBACK` database transactions.
* **Parameterized Queries:** Always use parameterized SQL (`$1`, `$2`, ...) to prevent SQL injection. Never concatenate raw user strings into SQL.
* **Standardized API Envelopes:**
  ```json
  // Success Envelope (Single or List with optional pagination)
  {
    "success": true,
    "data": { ... },
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 50,
      "totalPages": 3,
      "hasMore": true
    }
  }

  // Error Envelope
  {
    "success": false,
    "error": {
      "message": "Friendly humanized error explanation.",
      "code": "ERROR_CODE"
    }
  }
  ```

---

## 3. Database & Schema Conventions (Crucial)

### 3.1. Primary Key Strategy
1. **Entity & Transactional Tables** (`users`, `members`, `membership_plans`, `member_subscriptions`, `attendance_logs`, `trainers`, `classes`, `class_schedules`, `class_bookings`, `products`, `payments`, `invoices`, `equipment`, `audit_logs`) **MUST** use **UUID** primary keys:
   ```sql
   id UUID PRIMARY KEY DEFAULT gen_random_uuid()
   ```
2. **Reference / Lookup Tables** (`roles`, `genders`, `membership_statuses`, `payment_methods`, `payment_statuses`, `booking_statuses`, `movement_types`, `equipment_statuses`) **MUST** use **uppercase natural string codes** as their primary keys:
   ```sql
   code VARCHAR(30) PRIMARY KEY
   ```
   Foreign keys referencing lookup tables must reference `code` directly (e.g., `role_code VARCHAR(30) NOT NULL REFERENCES roles(code)`).

### 3.2. Migrations & Seeds
* Managed by numbered, idempotent SQL files in `backend/src/db/migrations/` (e.g., `001_initial_schema.sql`, `002_sequences_and_indexes.sql`) and `backend/src/db/seeds/`.
* **Immutability Rule:** Never edit an already-applied migration file; always create a new numbered migration for schema changes.

### 3.3. Concurrency-Safe Sequential Identifiers
* Human-readable transaction numbers (e.g., Invoice/Order numbers `INV-YYYYMMDD-XXXX`, Member IDs `MEM-YYYY-XXXX`, Receipt numbers) must use atomic PostgreSQL sequences (`nextval`) rather than `SELECT MAX(...)` string parsing to prevent race conditions (`23505` unique violation) under concurrent requests.

---

## 4. ACID Transactional Integrity & Financial Rules

All operations modifying financial records, membership activations, class capacities, or retail inventory must execute inside a single PostgreSQL transaction (`BEGIN ... COMMIT` with automatic `ROLLBACK` on error):

1. **Historical Price & Plan Freezing:**
   * When a member purchases a subscription or retail product, freeze `plan_price_at_purchase`, `unit_cost_at_sale`, and `unit_price_at_sale` on the line item / subscription record. Never rely on a live join to current plan or product prices for historical financial reporting.
2. **Pessimistic Locking for Capacity & Stock (`FOR UPDATE`):**
   * **Class Bookings:** Lock the class schedule row (`SELECT capacity, booked_count FROM class_schedules WHERE id = $1 FOR UPDATE`) and verify `booked_count < capacity` before inserting a booking.
   * **POS Retail & Supplement Checkout:** Lock product stock rows (`FOR UPDATE`), verify `stock_quantity - requested_qty >= 0` (Zero-Floor Guard), decrement stock, and append an entry to `stock_movements` (`movement_type_code = 'SALE'`).
3. **Payment Void / Refund Reversals:**
   * Restricted strictly to `ADMIN`. Requires a mandatory audit reason ($\ge 5$ characters), updates status to `'CANCELLED'` or `'VOIDED'`, restores any physical inventory (`'SALE_RETURN'`), or reverts subscription/booking state atomically.
4. **Philippine BIR 12% VAT-Inclusive Standard:**
   * All member-facing plan prices and retail prices are tax-inclusive:
     $$\text{VAT} = \text{Total} - \frac{\text{Total}}{1.12}$$
