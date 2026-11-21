# Agent Instructions & Workflow Guide: Gym Management System (`AGENTS.md`)

You are the lead software engineer, system architect, and pair programmer responsible for building and maintaining the **Gym Management System**—a high-performance, touch-friendly, full-stack management platform for fitness clubs, athletic centers, and gyms.

> **Central Rule Enforcement:** This project uses a modular rules architecture located in [`rules/`](./rules/). You must read and follow every rule file in [`rules/`](./rules/) alongside [`CLAUDE.md`](./CLAUDE.md) and [`GEMINI.md`](./GEMINI.md).

---

## 1. Modular Rules Directory (`rules/`)

* [**Rule 01 — Core Agent Operating Rules**](./rules/01-operating-rules.md): Proactive clarification via `ask_question` with `(Recommended)` option first, mandatory user decision logging in [`decisions.md`](./decisions.md), zero-drift PRD sync in [`docs/features/`](./docs/features/), Phase 0 skill installation gate, and self-annealing error resolution.
* [**Rule 02 — System Architecture & Database Conventions**](./rules/02-architecture-and-db.md): React 18 (Vite + Tailwind CSS) + Express.js + PostgreSQL 16 stack, layered backend (`Routes -> Middlewares -> Controllers -> Services -> DB`), `UUID` vs. natural `code` primary keys, concurrency-safe PostgreSQL sequences, ACID transactions (`FOR UPDATE`), and 12% BIR VAT-inclusive math.
* [**Rule 03 — Authentication, RBAC & Security**](./rules/03-auth-and-security.md): Email + password login with eye-icon visibility toggle, `bcryptjs` password hashing, reference-driven RBAC (`ADMIN`, `FRONT_DESK`, `TRAINER`), `express-rate-limit` on auth endpoints, and active screen persistence.
* [**Rule 04 — UI/UX & Component Ergonomics**](./rules/04-ui-ux-standards.md): 540px slide-in CRUD drawers (`Drawer`) with purpose subtitles and unsaved-changes guard modal, centered modals (`Modal`) for payment/80mm thermal receipts/voids, persistent collapsible sidebar rail with hover tooltips, in-column Kebab action menus (`⋮`), shimmer skeleton loaders, and zero-emoji flat 1.8px-stroke SVG icons (`SvgIcon`).
* [**Rule 05 — Phased Workflow & Documentation Sync**](./rules/05-workflow-and-docs-sync.md): 7-Phase execution model (Phase 0 through Phase 6) with 5-Part Paired Screen Delivery and Review Gates.

---

## 2. Target Full-Stack Architecture Blueprint

```
Gym Management System/
├── GEMINI.md                          # Antigravity rules entry point
├── CLAUDE.md                          # Technical operating guide
├── AGENTS.md                          # Agent workflow instructions (this file)
├── decisions.md                       # User Requirements & Feature Decisions Log (UD-XXX)
├── decision.md                        # Technical & Architecture Decision Records (ADR-XXX)
├── rules/                             # Modular rule specifications (01 to 05)
├── docs/
│   ├── design/                        # Design system, wireframes & HTML prototypes
│   └── features/                      # 10 Feature PRD specifications (01 to 10)
├── backend/                           # Express.js + PostgreSQL REST API
│   └── src/
│       ├── config/                    # Env validator & pg.Pool connection
│       ├── db/                        # Numbered SQL migrations & seeds
│       ├── middlewares/               # requireAuth, requireRole, rateLimiter, errorHandler
│       ├── controllers/               # Thin HTTP envelope handlers
│       ├── services/                  # ACID transactional domain services
│       ├── routes/                    # /api/v1/* endpoints
│       └── server.js                  # Express entrypoint
└── frontend/                          # React 18 + Vite + Tailwind CSS client
    └── src/
        ├── components/
        │   ├── common/                # Button, Input, KebabMenu, SvgIcon, Skeleton
        │   ├── layout/                # AppShell, CollapsibleSidebar, PosShell
        │   ├── drawers/               # 540px Slide-in CRUD Drawers (Member, Plan, Class, etc.)
        │   └── modals/                # PaymentModal, ReceiptModal, ConfirmVoidModal, DirtyGuardModal
        ├── context/                   # AuthContext, CartContext, ToastContext
        ├── pages/                     # 10 Core Screens delivered in 5 Paired Review Gates
        └── services/                  # API client modules
```

---

## 3. Execution Lifecycle & Phase 0 Gate

Before scaffolding `backend/`, `frontend/`, or `docker-compose.yml`, you **MUST** execute **Phase 0** as defined in [`rules/01-operating-rules.md`](./rules/01-operating-rules.md) and [`rules/05-workflow-and-docs-sync.md`](./rules/05-workflow-and-docs-sync.md):
1. Prompt the user via `ask_question` to confirm the agent skills to install for this project.
2. Install and verify all confirmed skills in `.agents/skills/` and global skill paths (`~/.gemini/antigravity/skills/`, `~/.agents/skills/`).
3. Only proceed to Phase 1 (Docker PostgreSQL, Express, React Vite) after Phase 0 is verified.
