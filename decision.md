# Project Architectural & Design Decisions Log (`decision.md`)

This document maintains an immutable audit trail of architectural, technical, and engineering decisions (ADRs) made for the **Gym Management System**, adapted from the reference **POS & Inventory System** framework.

> *Note: For user-driven requirement, feature, and UX scope decisions (`UD-XXX`), refer to [`decisions.md`](./decisions.md).*

---

## Decision Records Index

| ID | Title | Date | Status | Area |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Modular Rule Architecture (`rules/01`–`05`) Referenced by Root Agent Guides | 2026-11-21 | Accepted | Project Governance |
| **ADR-002** | Hybrid Primary Key Strategy (`UUID` for Entities vs. Natural `code` for Lookup Tables) | 2026-11-21 | Accepted | Database Architecture |
| **ADR-003** | Layered Backend Service Architecture & ACID Pessimistic Locking (`FOR UPDATE`) | 2026-11-21 | Accepted | Backend & Concurrency |
| **ADR-004** | Concurrency-Safe PostgreSQL Sequences for Member & Invoice Identifiers | 2026-11-21 | Accepted | Database & Concurrency |
| **ADR-005** | Philippine BIR 12% VAT-Inclusive Pricing & Historical Price Freezing | 2026-11-21 | Accepted | Financial & Billing Logic |
| **ADR-006** | 540px Slide-In CRUD Drawers with Dirty-State Guard & Zero-Dependency Flat SVG Icons | 2026-11-21 | Accepted | Frontend UI/UX Architecture |
| **ADR-007** | Phase 1 Foundation Stack, Port Isolation (`5435`/`4600`/`4601`) & Standardized API Envelope | 2026-11-21 | Accepted | Infrastructure & API Foundation |
| **ADR-008** | Transactional SQL Migration Tracker (`schema_migrations`), Deterministic Idempotent Seeds & Sequence Sync | 2026-11-21 | Accepted | Database & Data Integrity |
| **ADR-009** | Phase 3 Layered REST API, Shared Validation Utility & Pessimistic ACID Domain Services | 2026-11-21 | Accepted | Backend API & Security |
| **ADR-010** | Phase 4 Frontend Component Library, Storage Key Alignment, Print Isolation & Kiosk Lock Architecture | 2026-11-21 | Accepted | Frontend UI/UX Architecture |
| **ADR-011** | Zero-Dependency ISO/IEC 18004 SVG QR Code Generator & Kiosk Exit Payload Alignment | 2026-11-21 | Accepted | Frontend Engineering |
| **ADR-012** | Phase 6 Verification Suite & Failed-Attempt Sliding-Window Auth Rate Limiter (`skipSuccessfulRequests`) | 2026-11-21 | Accepted | Security & Quality Assurance |
| **ADR-013** | Cloud Production Readiness for Supabase (SSL Pooler), Render (`trust proxy`) & Vercel (`vercel.json`) | 2026-11-21 | Accepted | Cloud Infrastructure |

---

## Detailed Architectural Decision Records (ADRs)

### ADR-001: Modular Rule Architecture (`rules/01`–`05`) Referenced by Root Agent Guides
* **Status**: Accepted (2026-11-21)
* **Context**: In the reference POS system, rules were duplicated across `GEMINI.md`, `CLAUDE.md`, and `AGENTS.md`. Centralizing rules into modular files inside `rules/` prevents drift while allowing root agent files to serve as concise entry points.
* **Decision**: Store canonical rules in `rules/01-operating-rules.md` through `rules/05-workflow-and-docs-sync.md` and reference them directly from `GEMINI.md`, `CLAUDE.md`, and `AGENTS.md`.

### ADR-002: Hybrid Primary Key Strategy (`UUID` for Entities vs. Natural `code` for Lookup Tables)
* **Status**: Accepted (2026-11-21)
* **Context**: Following the proven relational pattern from the POS Inventory System, domain and transactional entities need globally unique keys, while reference tables benefit from readable foreign key codes that eliminate unnecessary joins.
* **Decision**: Use `UUID` (`gen_random_uuid()`) for all entity and transactional tables (`users`, `members`, `membership_plans`, `member_subscriptions`, `attendance_logs`, `trainers`, `classes`, `class_schedules`, `class_bookings`, `orders`, `order_items`, `products`, `stock_movements`, `equipment`) and `VARCHAR(30) PRIMARY KEY` natural codes for reference tables (`roles`, `genders`, `plan_types`, `membership_statuses`, `payment_methods`, `order_statuses`, `booking_statuses`, `movement_types`, `equipment_statuses`).

### ADR-003: Layered Backend Service Architecture & ACID Pessimistic Locking (`FOR UPDATE`)
* **Status**: Accepted (2026-11-21)
* **Context**: Multi-step operations (POS checkout, membership activation, session pack check-in deduction, and class capacity reservation) must never leave partial state or allow race conditions.
* **Decision**: Enforce a strict `Routes -> Middlewares -> Controllers -> Services -> Database` layering where `Services` manage `BEGIN ... COMMIT / ROLLBACK` transactions and acquire `FOR UPDATE` row locks on stock, subscriptions, and class schedules.

### ADR-004: Concurrency-Safe PostgreSQL Sequences for Member & Invoice Identifiers
* **Status**: Accepted (2026-11-21)
* **Context**: String-parsed `SELECT MAX(...)` identifier generation causes `23505` duplicate key collisions under concurrent requests.
* **Decision**: Use native PostgreSQL sequences (`member_code_seq`, `order_number_seq`) via `nextval()` to generate `MEM-YYYY-XXXX` and `INV-YYYYMMDD-XXXX` identifiers atomically.

### ADR-005: Philippine BIR 12% VAT-Inclusive Pricing & Historical Price Freezing
* **Status**: Accepted (2026-11-21)
* **Context**: Consumer-facing membership and pro-shop prices in the Philippines must be VAT-inclusive, and future plan/product price edits must never alter historical financial reports.
* **Decision**: Compute VAT backwards from the total ($\text{VAT} = \text{Total} - \text{Total} / 1.12$) and freeze `plan_price_at_purchase`, `unit_cost_at_sale`, and `unit_price_at_sale` at transaction time.

### ADR-006: 540px Slide-In CRUD Drawers with Dirty-State Guard & Zero-Dependency Flat SVG Icons
* **Status**: Accepted (2026-11-21)
* **Context**: Lessons learned from the POS Inventory System (`UD-003`, `UD-008`, `UD-009`, `UD-014`, `ADR-007`) proved that 540px slide-in drawers with purpose subtitles, unsaved-changes confirmation modals, in-column Kebab menus, shimmer skeleton loaders, and zero-dependency 1.8px-stroke flat SVG icons deliver optimal touch ergonomics and reliability.
* **Decision**: Adopt these exact component standards in `rules/04-ui-ux-standards.md`.

### ADR-007: Phase 1 Foundation Stack, Port Isolation (`5435`/`4600`/`4601`) & Standardized API Envelope
* **Status**: Accepted (2026-11-21)
* **Context**: Local Docker already runs `copper-crema-*` on ports `5434`/`4500`/`4501`. Additionally, the backend requires fail-fast boot validation, ACID transaction helpers, and a consistent JSON error envelope mapping PostgreSQL error codes (`23505`, `23503`, `22P02`, `23514`) into humanized messages.
* **Decision**:
  1. Isolate Mad Max Gym services on `5435` (PostgreSQL 16 Alpine), `4600` (Express.js REST API), and `4601` (React 18 + Vite + Tailwind CSS v3).
  2. Enforce boot-time environment validation in `backend/src/config/env.js` and expose `withTransaction()` in `backend/src/config/db.js`.
  3. Standardize all API responses via `sendSuccess()`, `AppError`, `notFoundHandler`, and `errorHandler` in `backend/src/middlewares/errorHandler.js`.

### ADR-008: Transactional SQL Migration Tracker (`schema_migrations`), Deterministic Idempotent Seeds & Sequence Sync
* **Status**: Accepted (2026-11-21)
* **Context**: Database migrations must be applied atomically and never re-executed once recorded, while seed data must generate valid `bcryptjs` hashes, remain fresh relative to `CURRENT_DATE`, survive repeated runs without duplicating rows, and never cause `23505` unique key collisions with PostgreSQL sequences when the API creates new members or payments.
* **Decision**:
  1. Track applied SQL files in `schema_migrations(version PRIMARY KEY, applied_at)` via `backend/src/db/migrate.js`, wrapping each migration file + tracking insert in `withTransaction()`.
  2. Implement `backend/src/db/seed.js` using runtime `bcryptjs` hashing (10 salt rounds), relative date math (`CURRENT_DATE`, `NOW()`), deterministic seed UUIDs with `ON CONFLICT DO NOTHING`, and dynamic `members.total_visits` / `last_check_in_at` synchronization.
  3. Advance `member_code_seq` and `invoice_number_seq` via `setval(..., GREATEST(...), TRUE)` at the end of seeding so subsequent API writes start cleanly at `0013`.

### ADR-009: Phase 3 Layered REST API, Shared Validation Utility & Pessimistic ACID Domain Services
* **Status**: Accepted (2026-11-21)
* **Context**: All 6 operational modules require strict separation between HTTP handling and transactional PostgreSQL logic, exact PRD humanized validation errors, reference-driven RBAC (`ADMIN` vs. `FRONT_DESK`), and concurrency safety for check-in deductions, membership freezes, walk-in checkouts, and payment voids.
* **Decision**:
  1. Centralize shared validation, pagination, and 12% BIR VAT-inclusive computation helpers in `backend/src/utils/validators.js`.
  2. Enforce Bearer JWT + live `users.is_active` DB checks in `backend/src/middlewares/auth.js` (`requireAuth`, `requireRole`) and sliding-window brute-force defense (5 attempts / 15 min) in `backend/src/middlewares/rateLimiter.js`.
  3. Implement all 6 modules across thin `controllers/`, transactional `services/` (using `withTransaction` + `FOR UPDATE`), and versioned `routes/` mounted under `/api/v1` via `backend/src/routes/index.js`.

### ADR-010: Phase 4 Frontend Component Library, Storage Key Alignment, Print Isolation & Kiosk Lock Architecture
* **Status**: Accepted (2026-11-21)
* **Context**: Phase 4 establishes the shared **Tactile Metallic & Royal Blue Soft UI** primitives, drawers, modals, context providers, and layout shells (`AppShell`, `CollapsibleSidebar`, `KioskShell`) consumed by all Phase 5 screens.
* **Decision**:
  1. **Unified Auth Storage Keys:** Align `frontend/src/services/api.js` and `AuthContext.jsx` on `gym_auth_token`, `gym_auth_user`, and `gym_active_screen` in `localStorage` so Bearer JWT injection, refresh persistence, and immediate sign-out cleanup stay synchronized; persist sidebar rail collapse independently under `mm_sidebar_collapsed`.
  2. **Symmetric Drawer & Modal Lifecycle:** Mount/unmount `Drawer` and `Modal` with `shouldRender` + `isVisible` transition states so enter/exit animations are symmetric, support both `footer` and `actions` props (`footer || actions`), and layer `DirtyGuardModal` at `z-[70]` over `Drawer` (`z-50`).
  3. **`@media print` Isolation:** Embed `.print-isolated-root`, `.print-receipt-80mm`, `.print-qr-pass`, and `.no-print` rules in `frontend/src/index.css` controlled via `Modal`'s `printMode` prop so 80mm thermal receipts and Member QR Pass cards print cleanly without backoffice chrome.
  4. **Password-Guarded Kiosk Exit:** Encapsulate the fullscreen Obsidian Black Kiosk header, live clock, and `POST /api/v1/check-in/verify-exit` password-lock modal inside `KioskShell.jsx` so members cannot exit into staff screens.

### ADR-011: Zero-Dependency ISO/IEC 18004 SVG QR Code Generator & Kiosk Exit Payload Alignment
* **Status**: Accepted (2026-11-21)
* **Context**: Both `MemberPassModal.jsx` and `ReceiptModal.jsx` require crisp, zero-dependency, optically scannable SVG QR codes encoding `MEM-YYYY-XXXX` without adding external npm packages, and `KioskShell.jsx` must match `checkin.service.js`'s `verifyKioskExit` contract.
* **Decision**:
  1. Implemented a compact, standards-compliant GF(256) Reed-Solomon QR encoder (`frontend/src/utils/qrCode.js`) paired with `frontend/src/components/common/QrCodeSvg.jsx` (4-module quiet zone, `shapeRendering="crispEdges"`, merged SVG path runs) for real optical scanning at the front-desk kiosk.
  2. Aligned `KioskShell.jsx` to send `{ staff_password: password }` to `POST /api/v1/check-in/verify-exit`, matching `backend/src/services/checkin.service.js`.

### ADR-012: Phase 6 Verification Suite & Failed-Attempt Sliding-Window Auth Rate Limiter (`skipSuccessfulRequests`)
* **Status**: Accepted (2026-11-21)
* **Context**: In a shared front-desk terminal environment, legitimate staff logins (`HTTP 200`) and password recovery lookups (`POST /api/v1/auth/forgot-password`) must not consume the brute-force failed-login quota on `POST /api/v1/auth/login`.
* **Decision**:
  1. Configure `authRateLimiter` (`windowMs: 15 * 60 * 1000`, `max: 5`, `skipSuccessfulRequests: true`) on `POST /api/v1/auth/login` so only failed login attempts (`HTTP >= 400`) count toward the 5-attempt lockout threshold, and isolate `forgotPasswordRateLimiter` on `POST /api/v1/auth/forgot-password`.
  2. Verified all 66 Phase 6 acceptance criteria, RBAC `HTTP 403` guards, `@media print` isolation rules, and zero-emoji SVG icon standards across the live stack.

### ADR-013: Cloud Production Readiness for Supabase (SSL Pooler), Render (`trust proxy`) & Vercel (`vercel.json`)
* **Status**: Accepted (2026-11-21)
* **Context**: Deploying the stack across Vercel (React Vite SPA), Render (Express API behind a reverse proxy), and Supabase (managed PostgreSQL over IPv4 Session Pooler) requires TLS on remote `DATABASE_URL` connections, proxy-aware client IP resolution for `express-rate-limit`, and SPA rewrite rules on Vercel.
* **Decision**:
  1. Auto-enable `ssl: { rejectUnauthorized: false }` in `backend/src/config/db.js` when `DATABASE_URL` points to a non-local host or `DB_SSL=true`.
  2. Configure `app.set('trust proxy', 1)` in `backend/src/server.js` so `express-rate-limit` reads client IPs accurately behind Render's proxy.
  3. Include `frontend/vercel.json` for SPA route rewrites and document the full cloud workflow in `Deployment.md`.
