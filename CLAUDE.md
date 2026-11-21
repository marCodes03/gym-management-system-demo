# CLAUDE.md — Technical Operating Guide: Gym Management System

This file is the primary technical operating guide for building and maintaining the **Gym Management System**. It references the modular rule specifications in [`rules/`](./rules/) and the feature specifications in [`docs/features/`](./docs/features/) so that any AI assistant or developer writes clean, consistent, and production-grade code.

---

## 0. Modular Rules Reference (`rules/`)

All project rules are organized inside [`rules/`](./rules/). **Always read and enforce these rule files before making changes:**

1. [**`rules/01-operating-rules.md`**](./rules/01-operating-rules.md) — Proactive Clarification (`ask_question`), Mandatory `decisions.md` Logging (`UD-XXX`), Feature PRD Sync (`docs/features/`), and Phase 0 Skills Gate.
2. [**`rules/02-architecture-and-db.md`**](./rules/02-architecture-and-db.md) — Full-Stack Architecture, Layered Services, `UUID` vs. Natural `code` Primary Keys, Sequences, ACID Transactions (`FOR UPDATE`), and 12% BIR Inclusive VAT.
3. [**`rules/03-auth-and-security.md`**](./rules/03-auth-and-security.md) — Email + Password Login, Eye-Icon Toggle, `bcryptjs`, Reference-Driven RBAC (`ADMIN`, `FRONT_DESK`, `TRAINER`), and Rate Limiting.
4. [**`rules/04-ui-ux-standards.md`**](./rules/04-ui-ux-standards.md) — 540px Slide-In CRUD Drawers, Unsaved Changes Guard, Centered Payment/Receipt Modals, Persistent Collapsible Sidebar, In-Column Kebab Menus (`⋮`), Shimmer Skeletons, and Flat SVG Icons (`SvgIcon`).
5. [**`rules/05-workflow-and-docs-sync.md`**](./rules/05-workflow-and-docs-sync.md) — Phased Delivery Roadmap (Phase 0 to Phase 6), 5-Part Paired Screen Delivery with Review Gates, and PRD Synchronization Standards.

---

## 1. Feature Modules Index (`docs/features/`)

| Module | Feature Specification Path | Core Scope & Validation Coverage |
| :--- | :--- | :--- |
| **01** | [`docs/features/01-auth-and-staff-management/auth-and-staff-management.md`](./docs/features/01-auth-and-staff-management/auth-and-staff-management.md) | Email + password login, eye toggle, rate limiting (`HTTP 429`), `roles(code)` (`ADMIN`, `FRONT_DESK`), staff CRUD (`StaffDrawer`), password reset & self-lockout guard |
| **02** | [`docs/features/02-membership-plans/membership-plans.md`](./docs/features/02-membership-plans/membership-plans.md) | `DAY_PASS`, `RECURRING`, and `SESSION_PACK` plans (`PlanDrawer`), dynamic conditional visit/day validation, 12% BIR VAT-inclusive PHP pricing & safe deactivation |
| **03** | [`docs/features/03-members-and-subscriptions/members-and-subscriptions.md`](./docs/features/03-members-and-subscriptions/members-and-subscriptions.md) | Member registration (`MEM-YYYY-XXXX` sequence), phone uniqueness, printable/scannable Member QR Pass Card (`MemberPassModal`), freeze/unfreeze date-extension math |
| **04** | [`docs/features/04-fast-check-in-and-attendance/fast-check-in-and-attendance.md`](./docs/features/04-fast-check-in-and-attendance/fast-check-in-and-attendance.md) | Dual-mode Fast Sign-In (Kiosk Code/Phone/QR + Staff Search), 5-minute duplicate cooldown guard, atomic visit pack deduction (`FOR UPDATE`), live usage ledger |
| **05** | [`docs/features/05-membership-payments-and-receipts/membership-payments-and-receipts.md`](./docs/features/05-membership-payments-and-receipts/membership-payments-and-receipts.md) | 1-step Walk-In Day Pass & plan renewal checkout (`PaymentModal`), cash quick bills, QR wallet zoom, date-stacked renewals, 80mm receipt (`ReceiptModal`) & owner void |
| **06** | [`docs/features/06-owner-dashboard-and-settings/owner-dashboard-and-settings.md`](./docs/features/06-owner-dashboard-and-settings/owner-dashboard-and-settings.md) | Timeframe-filtered usage traffic (`Today`, `Last 7 Days`, `This Month`), peak hours chart, expiring memberships ($\le 7$ days / $\le 2$ visits) & auto-saved payment QRs |

---

## 2. Repository Layout Blueprint

```
Gym Management System/
├── GEMINI.md                             # Antigravity operating rules & rules/ index
├── CLAUDE.md                             # Technical operating guide & feature index
├── AGENTS.md                             # Detailed agent architecture & workflow guide
├── brand.md                              # Mad Max Gym brand identity, color tokens & typography
├── decisions.md                          # User-Driven Requirements & Feature Decisions (UD-XXX)
├── decision.md                           # Architecture Decision Records (ADR-XXX)
├── rules/                                # Modular project rule specifications
│   ├── 01-operating-rules.md
│   ├── 02-architecture-and-db.md
│   ├── 03-auth-and-security.md
│   ├── 04-ui-ux-standards.md
│   └── 05-workflow-and-docs-sync.md
├── docs/
│   ├── IMPLEMENTATION_PLAN.md            # Master 7-Phase (Phase 0 to Phase 6) execution roadmap
│   ├── required-skills.md                # Official 9 required external agent skills (Phase 0 Gate)
│   ├── assets/                           # Mad Max Gym master raster & SVG vector logos
│   └── features/                         # 6 approved zero-gap feature PRD specifications
│       ├── 01-auth-and-staff-management/
│       ├── 02-membership-plans/
│       ├── 03-members-and-subscriptions/
│       ├── 04-fast-check-in-and-attendance/
│       ├── 05-membership-payments-and-receipts/
│       └── 06-owner-dashboard-and-settings/
├── docker-compose.yml                    # Full-stack 3-tier Docker Compose (postgres, backend, web)
├── HOW_TO_RUN.md                         # Complete developer & business-owner operational runbook
├── README.md                             # Project overview, architecture & quick-start guide
├── backend/                              # Express.js REST API (/api/v1/*) + PostgreSQL migrations & seeds
└── frontend/                             # React 18 + Vite + Tailwind CSS Soft UI client & Kiosk terminal
```

---

## 3. Database & Transaction Golden Rules (Summary of [`rules/02-architecture-and-db.md`](./rules/02-architecture-and-db.md))

1. **Primary Keys:**
   * **Entity & Transactional Tables:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   * **Reference / Lookup Tables:** `code VARCHAR(30) PRIMARY KEY` (e.g., `roles`, `genders`, `plan_types`, `membership_statuses`, `payment_methods`, `order_statuses`, `booking_statuses`, `movement_types`, `equipment_statuses`).
2. **Historical Price Freezing:** Always store `plan_price_at_purchase`, `unit_cost_at_sale`, and `unit_price_at_sale` on transactional records.
3. **ACID Pessimistic Locking (`FOR UPDATE`):** All POS checkouts, session deductions, stock adjustments, and class capacity bookings must execute inside `BEGIN ... COMMIT` transactions with row locking.
4. **12% BIR VAT-Inclusive Standard:** Menu and membership prices are tax-inclusive ($\text{VAT} = \text{Total} - \text{Total} / 1.12$).
