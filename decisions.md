# Project Requirements & Feature Decisions Log (`decisions.md`)

This document is the official, persistent record of **User-Driven Decisions** regarding system requirements, scope, features, UX/UI patterns, and business rules for the **Gym Management System**.

> **Antigravity Operating Rule ([`rules/01-operating-rules.md`](./rules/01-operating-rules.md)):**
> Because this project is a **System Project**, the agent and engineers **MUST** continuously maintain this `decisions.md` log. Every time the user specifies, clarifies, or approves a requirement, feature, design choice, or behavioral rule, it must be recorded here with its context, user decision, rationale, and implementation status.
>
> *Note: For technical and architecture-level engineering decisions (ADRs), refer to [`decision.md`](./decision.md).*

---

## Decision Records Index

| Decision ID | Date | Area | Title | Status |
| :--- | :--- | :--- | :--- | :--- |
| [**UD-001**](#ud-001-project-framework-directory-structure-rules-and-docsfeatures) | 2026-11-21 | Project Framework & Governance | Project Framework Directory Structure (`rules/` at root & `docs/features/`) | Approved & Implemented |
| [**UD-002**](#ud-002-unified-ai-instruction-and-decision-governance-files) | 2026-11-21 | AI Agent Governance | Unified AI Instruction (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) & Decision Logs (`decisions.md`, `decision.md`) | Approved & Implemented |
| [**UD-003**](#ud-003-modular-rules-architecture-and-10-core-gym-feature-prds) | 2026-11-21 | System Scope & Feature PRDs | Modular Rules (`01`–`05`) Established | Superseded by UD-004 |
| [**UD-004**](#ud-004-keep-docsfeatures-empty-until-feature-planning-phase) | 2026-11-21 | Project Framework & Scope | Keep `docs/features/` Folder Empty During Initial Framework Phase | Approved & Implemented |
| [**UD-005**](#ud-005-dual-mode-fast-gym-sign-in-kiosk-self-check-in--front-desk-lookup) | 2026-11-21 | Check-In & Attendance | Dual-Mode Fast Gym Sign-In (Kiosk Self-Check-In + Front-Desk Staff Search) | Approved & Implemented |
| [**UD-006**](#ud-006-hybrid-membership-plans-time-based--sessionvisit-packs) | 2026-11-21 | Membership Plans | Hybrid Membership Plans: Time-Based Plans & Session/Visit Packs | Approved & Implemented |
| [**UD-007**](#ud-007-membership-payment--80mm-thermal-receipt-recording) | 2026-11-21 | Billing & Payments | Simple Membership Payment Recording (Cash / QR Wallet) & 80mm Thermal Receipt | Approved & Implemented |
| [**UD-008**](#ud-008-focused-6-module-core-system-scope) | 2026-11-21 | System Scope & Architecture | Focused 6-Module Core System Scope (Simple Membership & Usage Tracking) | Approved & Implemented |
| [**UD-009**](#ud-009-explicit-field-validation-rules-and-behavioral-acceptance-criteria-in-feature-prds) | 2026-11-21 | Feature Specifications & QA | Explicit Field Validation Rules & Behavioral Acceptance Criteria in `docs/features/` | Approved & Implemented |
| [**UD-010**](#ud-010-mad-max-gym-brand-identity-and-required-skills-specification) | 2026-11-21 | Brand Identity & Phase 0 Skills | **Mad Max Gym** Brand Identity (`brand.md`) Separated from 9 Official Skills (`docs/required-skills.md`) | Approved & Implemented |
| [**UD-011**](#ud-011-mandatory-gitignore-exclusion-for-installed-agent-skills) | 2026-11-21 | Git & Phase 0 Governance | Mandatory `.gitignore` Exclusion for Installed Agent Skills (`.agents/skills/`) | Approved & Implemented |
| [**UD-012**](#ud-012-mad-max-gym-shield--heavy-barbell-monogram-logo-asset-suite) | 2026-11-21 | Brand Identity & Visual Assets | **Mad Max Gym** Shield & Heavy Barbell Monogram Logo Suite (`docs/assets/`) | Approved & Implemented |
| [**UD-013**](#ud-013-master-end-to-end-implementation-plan-docsimplementation_planmd) | 2026-11-21 | Project Execution & Roadmap | Master End-to-End Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`) | Approved & Implemented |
| [**UD-014**](#ud-014-phase-0-mandatory-agent-skills-installation--verification-gate-completed) | 2026-11-21 | Phase 0 Skills Gate | Phase 0 Mandatory Agent Skills Installation & Verification Gate (9 Official Skills) | Approved & Implemented |
| [**UD-015**](#ud-015-dual-mode-interactive-design-canvas-prototype-docsdesignprototypehtml) | 2026-11-21 | UI/UX Prototyping | Dual-Mode Interactive Design Canvas Prototype (`docs/design/prototype.html`) — Complete 7-Screen Suite | Approved & Implemented |
| [**UD-016**](#ud-016-phase-1-foundation-setup--isolated-port-allocation-5435-4600-4601) | 2026-11-21 | Environment & Infrastructure | Phase 1 Foundation Setup & Isolated Port Allocation (`5435`, `4600`, `4601`) | Approved & Implemented |
| [**UD-017**](#ud-017-full-stack-docker-compose-services-db-backend-web) | 2026-11-21 | Environment & Infrastructure | Full-Stack Docker Compose Stack (`mad_max_gym_db`, `mad_max_gym_backend`, `mad_max_gym_web`) | Approved & Implemented |
| [**UD-018**](#ud-018-phase-2-database-modeling-migrations--realistic-mad-max-gym-seed-data) | 2026-11-21 | Database & Seed Data | Phase 2 Database Modeling, Migrations & Realistic **Mad Max Gym** Seed Data | Approved & Implemented |
| [**UD-019**](#ud-019-phase-5-complete-screen-delivery-parts-51-52-and-53) | 2026-11-21 | Full-Stack Screen Delivery | Phase 5 Complete Screen Delivery (Parts 5.1, 5.2, and 5.3 — All 7 Views Connected to Live API) | Approved & Implemented |
| [**UD-020**](#ud-020-phase-6-end-to-end-verification-zero-drift-audit--developer-runbook) | 2026-11-21 | Verification & Runbook | Phase 6 End-to-End Verification (66 Checks), RBAC & Print Isolation Audit, and Developer Runbooks (`HOW_TO_RUN.md`, `README.md`) | Approved & Implemented |
| [**UD-021**](#ud-021-cloud-production-deployment-guide-deploymentmd-vercel--render--supabase) | 2026-11-21 | Cloud Deployment | Cloud Production Deployment Guide (`Deployment.md`: Vercel Frontend + Render Backend + Supabase PostgreSQL) | Approved & Implemented |

---

## Detailed Decision Entries

### UD-001: Project Framework Directory Structure (`rules/` at root & `docs/features/`)
* **Date**: 2026-11-21
* **Area**: Project Framework & Governance
* **Context**: The user requested creating a folder of rules (to be referenced in `CLAUDE.md` and `GEMINI.md`) and a folder of features based on an analysis of `C:\Users\ETI\source\repos\POS invertory Systems`.
* **User Requirement**: Create `rules/` at the project root for modular rule files and `docs/features/` for numbered feature specifications following the proven POS Inventory System structure.
* **Implementation**:
  * Created `rules/` at the project root containing 5 focused rule documents (`01-operating-rules.md` through `05-workflow-and-docs-sync.md`).
  * Created `docs/features/` containing 10 numbered feature subdirectories (`01` through `10`).
* **Status**: Approved & Implemented.

---

### UD-002: Unified AI Instruction (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) & Decision Logs (`decisions.md`, `decision.md`)
* **Date**: 2026-11-21
* **Area**: AI Agent Governance
* **Context**: Clarified which root instruction and decision governance files should be created to reference the `rules/` folder.
* **User Requirement**: Scaffold `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md` (all explicitly referencing `rules/`), alongside `decisions.md` (user requirement decisions) and `decision.md` (technical ADRs).
* **Implementation**:
  * Created [`GEMINI.md`](./GEMINI.md), [`CLAUDE.md`](./CLAUDE.md), [`AGENTS.md`](./AGENTS.md), [`decisions.md`](./decisions.md), and [`decision.md`](./decision.md) in the project root.
* **Status**: Approved & Implemented.

---

### UD-003: Modular Rules (`01`–`05`) Established
* **Date**: 2026-11-21
* **Area**: System Scope & Feature PRDs
* **Context**: Structured `rules/` into 5 modular rule files (`01-operating-rules.md` through `05-workflow-and-docs-sync.md`).
* **Status**: Superseded in part by **UD-004** (feature files removed until the feature definition phase).

---

### UD-004: Keep `docs/features/` Folder Empty During Initial Framework Phase
* **Date**: 2026-11-21
* **Area**: Project Framework & Scope
* **Context**: The user clarified that they are currently building the project framework and are not yet at the feature definition phase, requesting all generated feature files inside `docs/features/` be deleted.
* **User Requirement**: Delete all pre-populated feature subdirectories and markdown files inside `docs/features/`, leaving `docs/features/` as an empty directory ready for when feature planning begins.
* **Implementation**:
  * Removed all `01`–`10` subdirectories and files inside `docs/features/`.
  * Updated [`CLAUDE.md`](./CLAUDE.md) to reflect that `docs/features/` is currently an empty framework folder.
* **Status**: Approved & Implemented.

---

### UD-005: Dual-Mode Fast Gym Sign-In (Kiosk Self-Check-In + Front-Desk Staff Search)
* **Date**: 2026-11-21
* **Area**: Check-In & Attendance
* **Context**: The user needs gym members to quickly sign in to the gym while allowing the business owner to track gym usage.
* **User Requirement**: Provide both a **Kiosk / Self-Check-In Mode** (where a member enters their Member Code `MEM-YYYY-XXXX` or Phone Number, or scans a QR pass on a dedicated front-desk screen) AND a **Front-Desk Staff Lookup** (where staff can search by name, code, or phone to sign a member in).
* **Status**: Approved & Planned.

---

### UD-006: Hybrid Membership Plans: Time-Based Plans & Session/Visit Packs
* **Date**: 2026-11-21
* **Area**: Membership Plans & Usage Tracking
* **Context**: Clarified which membership models the business owner wants to manage and track.
* **User Requirement**: Support both **Time-Based Plans** (`DAY_PASS`, `RECURRING` e.g., Monthly, Quarterly, Annual with start/end dates and unlimited visits) AND **Session/Visit Packs** (`SESSION_PACK` e.g., 10-Visit Pass where each gym sign-in atomically deducts 1 visit from `remaining_sessions`).
* **Status**: Approved & Planned.

---

### UD-007: Simple Membership Payment Recording (Cash / QR Wallet) & 80mm Thermal Receipt
* **Date**: 2026-11-21
* **Area**: Billing & Payments
* **Context**: Clarified whether activating or renewing a membership should record payment transactions and print receipts.
* **User Requirement**: Include simple Membership Payment & Receipt Recording supporting Cash (with quick denomination bills) and QR Digital Wallets (GCash / Maya), 12% BIR VAT-inclusive math, historical price freezing, and an 80mm thermal receipt preview/print.
* **Status**: Approved & Planned.

---

### UD-008: Focused 6-Module Core System Scope (Simple Membership & Usage Tracking)
* **Date**: 2026-11-21
* **Area**: System Scope & Architecture
* **Context**: To keep the system simple and directly focused on the owner's two core goals—(1) managing gym memberships & tracking usage and (2) fast member sign-in—without bloat (removing complex class scheduling, trainers, pro-shop inventory, and equipment maintenance).
* **User Requirement**: Structure the system around a **Focused 6-Module Core**:
  1. `01-auth-and-staff-management`: Owner (`ADMIN`) & Front-Desk (`FRONT_DESK`) Authentication & RBAC
  2. `02-membership-plans`: Time-Based Plans (`DAY_PASS`, `RECURRING`) & Visit Packs (`SESSION_PACK`)
  3. `03-members-and-subscriptions`: Member Directory, QR Pass Badge, Subscription Status (`ACTIVE`, `FROZEN`, `EXPIRED`, `CANCELLED`), Freeze & Renewal
  4. `04-fast-check-in-and-attendance`: Kiosk Self-Sign-In + Staff Search Terminal, Atomic Visit Deduction & Immutable Attendance Usage Log
  5. `05-membership-payments-and-receipts`: Membership Activation/Renewal Checkout, Payment Ledger, Admin Void & 80mm Thermal Receipt
  6. `06-owner-dashboard-and-settings`: Active Members, Daily Check-In Usage Traffic, Expiring Memberships Alert, Revenue KPIs & Gym Settings
* **Status**: Approved & Implemented.

---

### UD-009: Explicit Field Validation Rules & Behavioral Acceptance Criteria in `docs/features/`
* **Date**: 2026-11-21
* **Area**: Feature Specifications & QA
* **Context**: Upon approving the 6-module feature plan, the user requested that all generated feature specifications include explicit field-level validation rules (types, constraints, regex/ranges, and exact humanized error messages) alongside step-by-step behavioral acceptance criteria.
* **User Requirement**: Add detailed field validation rule tables and behavioral acceptance criteria (`AC-XX.X`) to all 6 approved feature specifications in `docs/features/`.
* **Implementation**:
  * Generated all 6 feature specifications in `docs/features/01-...` through `docs/features/06-...` complete with field validation tables, exact validation/error strings, behavioral acceptance criteria, Mermaid ER/workflow diagrams, and PostgreSQL `CHECK` constraints.
* **Status**: Approved & Implemented.

---

### UD-010: Mad Max Gym Brand Identity (`brand.md`) Separated from 9 Official Skills (`docs/required-skills.md`)
* **Date**: 2026-11-21
* **Area**: Brand Identity & Phase 0 Skills
* **Context**: The user specified the official gym name (**Mad Max Gym**), the brand color palette (**Black, Gray, Royal Blue, and Silver Gray**), provided the exact 9 GitHub repository URLs for the required agent skills, and requested separating `brand.md` from `docs/required-skills.md`.
* **User Requirement**:
  1. Create a standalone [`brand.md`](./brand.md) in the project root dedicated to the **Mad Max Gym** brand story, **Black (`#0B0D11`), Gunmetal Gray (`#374151`), Royal Blue (`#2563EB` / `#1D4ED8`), and Silver Gray (`#9CA3AF` / `#F3F4F6`)** color token system, tactile button physics, typography scale, and humanized messaging.
  2. Keep [`docs/required-skills.md`](./docs/required-skills.md) focused exclusively on the 9 required agent skills and their official GitHub repository links:
     * `frontend-design` (`https://github.com/anthropics/skills/tree/main/skills/frontend-design`)
     * `web-design-guidelines` (`https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines`)
     * `react-best-practices` (`https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices`)
     * `ui-ux-pro-max` (`https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`)
     * `code-review` (`https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review`)
     * `backend-patterns` (`https://github.com/affaan-m/ECC/tree/main/skills/backend-patterns`)
     * `ui-animation` (`https://github.com/mblode/agent-skills/tree/main/skills/ui-animation`)
     * `taste-skill` (`https://github.com/Leonxlnx/taste-skill`)
     * `impeccable` (`https://github.com/pbakaus/impeccable`)
* **Implementation**:
  * Created [`brand.md`](./brand.md) at the project root with the complete **Mad Max Gym** brand identity and design tokens.
  * Updated [`docs/required-skills.md`](./docs/required-skills.md) to contain only the 9 official external skill repositories, module mappings, and Phase 0 verification checklist.
* **Status**: Approved & Implemented.

---

### UD-011: Mandatory `.gitignore` Exclusion for Installed Agent Skills (`.agents/skills/`)
* **Date**: 2026-11-21
* **Area**: Git & Phase 0 Governance
* **Context**: The user requested adding a rule that installed agent skills must be gitignored.
* **User Requirement**: Codify in the project rules that `.agents/` and `.agents/skills/` must be excluded via `.gitignore` so external skill payloads are not committed to Git, while keeping `docs/required-skills.md` tracked as the canonical skill manifest.
* **Implementation**:
  * Created the root [`.gitignore`](./.gitignore) with `.agents/` and `.agents/skills/` explicitly ignored.
  * Updated [`rules/01-operating-rules.md`](./rules/01-operating-rules.md), [`GEMINI.md`](./GEMINI.md), and [`docs/required-skills.md`](./docs/required-skills.md) to enforce gitignoring `.agents/skills/`.
* **Status**: Approved & Implemented.

---

### UD-012: Mad Max Gym Shield & Heavy Barbell Monogram Logo Suite (`docs/assets/`)
* **Date**: 2026-11-21
* **Area**: Brand Identity & Visual Assets
* **Context**: The user requested generating a logo for **Mad Max Gym** and selected the **Shield & Heavy Barbell Monogram** concept along with the complete raster and vector brand asset suite in `docs/assets/`.
* **User Requirement**:
  1. Design a **Shield & Heavy Barbell Monogram** featuring a brushed silver-gray `"MM"` crest interlocked with a heavy barbell inside an obsidian-black and royal-blue shield.
  2. Deliver the complete asset suite in `docs/assets/` (`mad_max_gym_logo.jpg`, `mad-max-logo.svg`, `mad-max-icon.svg`, and `mad-max-badge.svg`) and embed them into [`brand.md`](./brand.md).
* **Implementation**:
  * Generated the master raster logo [`docs/assets/mad_max_gym_logo.jpg`](./docs/assets/mad_max_gym_logo.jpg).
  * Authored the transparent scalable vector assets: [`docs/assets/mad-max-logo.svg`](./docs/assets/mad-max-logo.svg), [`docs/assets/mad-max-icon.svg`](./docs/assets/mad-max-icon.svg), and [`docs/assets/mad-max-badge.svg`](./docs/assets/mad-max-badge.svg).
  * Embedded the logo suite into Section 3 of [`brand.md`](./brand.md).
* **Status**: Approved & Implemented.

---

### UD-013: Master End-to-End Implementation Plan (`docs/IMPLEMENTATION_PLAN.md`)
* **Date**: 2026-11-21
* **Area**: Project Execution & Roadmap
* **Context**: The user requested creating a complete implementation plan for the **Mad Max Gym Management System**.
* **User Requirement**: Author a structured, end-to-end implementation plan in `docs/IMPLEMENTATION_PLAN.md` covering the Phase 0 Skills Gate, Phases 1–4 Foundation, Phase 5 (3-Part Paired Screen Delivery with Review Gates 5.1, 5.2, and 5.3 across the 6 approved feature modules), and Phase 6 Verification.
* **Implementation**:
  * Created [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) and indexed it in [`CLAUDE.md`](./CLAUDE.md).
* **Status**: Approved & Implemented.

---

### UD-014: Phase 0 Mandatory Agent Skills Installation & Verification Gate Completed
* **Date**: 2026-11-21
* **Area**: Phase 0 Skills Gate
* **Context**: Per Rule 4 ([`rules/01-operating-rules.md`](./rules/01-operating-rules.md)) and [`docs/required-skills.md`](./docs/required-skills.md), the agent prompted the user via `ask_question` before executing any environment setup (`npm install` or `docker-compose up`) to confirm installing the 9 official agent skills.
* **User Requirement**: Confirm and install all 9 required agent skills (`frontend-design`, `web-design-guidelines`, `react-best-practices`, `ui-ux-pro-max`, `code-review`, `backend-patterns`, `ui-animation`, `taste-skill`, and `impeccable`) into both the project workspace (`.agents/skills/`) and global Antigravity directories (`~/.gemini/antigravity/skills/` and `~/.agents/skills/`), verify all `SKILL.md` manifests and subdirectories, and confirm `.gitignore` exclusion.
* **Implementation**:
  * Installed and synchronized all 9 skills across `.agents/skills/`, `C:\Users\ETI\.gemini\antigravity\skills\`, and `C:\Users\ETI\.agents\skills\`.
  * Verified every skill directory contains an intact `SKILL.md` manifest along with its supporting subdirectories (`references/`, `rules/`, `data/`, `scripts/`, `assets/`, `agents/`, `evals/`).
  * Verified `.agents/` and `.agents/skills/` are excluded in [`.gitignore`](./.gitignore).
  * Marked Phase 0 (`0.1`, `0.2`, `0.3`) as completed (`[x]`) in [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
* **Status**: Approved & Implemented.

---

### UD-015: Dual-Mode Interactive Design Canvas Prototype (`docs/design/prototype.html`)
* **Date**: 2026-11-21
* **Area**: UI/UX Prototyping & Design Validation
* **Context**: The user requested building a mock prototype of the **Mad Max Gym Management System** using a canvas approach guided by the `impeccable`, `design-taste-frontend`, and `frontend-design` skills.
* **User Requirement**:
  1. Build a **Dual-Mode Design Canvas (`docs/design/prototype.html`)** combining a Figma-style pan/zoom Canvas Board (all screens side-by-side) with a 1-click **Interactive Play Mode** to test every screen, 540px CRUD drawer, payment modal, and 80mm thermal receipt live.
  2. Include the **Complete 7-Screen Suite**: Staff Login, Fast Sign-In & Fullscreen Kiosk, Membership Plans & Visit Packs, Member Directory & QR Pass, Membership Payments & 80mm Receipt, Owner Usage Dashboard, and Staff Access & Gym Settings.
* **Implementation**:
  * Created self-contained interactive prototype at [`docs/design/prototype.html`](./docs/design/prototype.html) adhering strictly to [`brand.md`](./brand.md), [`rules/04-ui-ux-standards.md`](./rules/04-ui-ux-standards.md), and the 6 feature PRDs in [`docs/features/`](./docs/features/).
* **Status**: Approved & Implemented.

---

### UD-016: Phase 1 Foundation Setup & Isolated Port Allocation (`5435`, `4600`, `4601`)
* **Date**: 2026-11-21
* **Area**: Environment & Infrastructure
* **Context**: During Phase 1 execution, ports `5434`, `4500`, and `4501` were already allocated to the running `copper-crema-*` Docker stack (`copper-crema-postgres`, `copper-crema-backend`, `copper-crema-web`). Per Rule 1 (`rules/01-operating-rules.md`), the agent prompted the user via `ask_question` before modifying ports or stopping existing containers.
* **User Requirement**: Keep the running `copper-crema` stack untouched and assign **Mad Max Gym** to free local ports: **PostgreSQL 16 on `5435`**, **Express.js Backend on `4600`**, and **React 18 + Vite Frontend on `4601`**.
* **Implementation**:
  * Configured [`docker-compose.yml`](./docker-compose.yml) (`mad_max_gym_db` on `5435:5432` with persistent `pgdata` volume) and verified `(healthy)` status.
  * Scaffolded [`backend/`](./backend/) on port `4600` with boot-time environment validation (`env.js`), `pg.Pool` + `withTransaction` (`db.js`), standardized JSON error/success envelopes (`errorHandler.js`), and live PostgreSQL health check (`GET /api/v1/health`).
  * Scaffolded [`frontend/`](./frontend/) on port `4601` with React 18, Vite, Tailwind CSS **Mad Max Gym** brand tokens from [`brand.md`](./brand.md), Google Fonts (*Inter*, *Geist Mono*, *Roboto Mono*), vector SVG logos in `frontend/src/assets/`, and `frontend/src/services/api.js`.
  * Updated [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) with the isolated port mapping and marked Phase 1 (`1.1`, `1.2`, `1.3`) complete.
* **Status**: Approved & Implemented.

---

### UD-017: Full-Stack Docker Compose Services (`db`, `backend`, `web`)
* **Date**: 2026-11-21
* **Area**: Environment & Infrastructure
* **Context**: The user requested that the `gymmanagementsystem` Docker Compose stack include both the `backend` and `web` containers alongside PostgreSQL (mirroring the 3-container layout of `posinvertorysystems`).
* **User Requirement**: Containerize the Express.js API (`mad_max_gym_backend`) and the React/Nginx web client (`mad_max_gym_web`) inside [`docker-compose.yml`](./docker-compose.yml) alongside `mad_max_gym_db`.
* **Implementation**:
  * Added [`backend/Dockerfile`](./backend/Dockerfile) and [`backend/.dockerignore`](./backend/.dockerignore) with a built-in `/api/v1/health` Docker healthcheck.
  * Added multi-stage [`frontend/Dockerfile`](./frontend/Dockerfile), [`frontend/.dockerignore`](./frontend/.dockerignore), and [`frontend/nginx.conf`](./frontend/nginx.conf) (serving the Vite production bundle with SPA fallback and `/api/` reverse proxy to `http://backend:4600/api/`).
  * Updated [`docker-compose.yml`](./docker-compose.yml) to orchestrate `postgres` (`mad_max_gym_db` on `5435:5432`), `backend` (`mad_max_gym_backend` on `4600:4600`), and `web` (`mad_max_gym_web` on `127.0.0.1:4601:80`).
  * Codified the mandatory 3-tier Docker Compose requirement (`postgres`, `backend`, `web`) in [`rules/02-architecture-and-db.md`](./rules/02-architecture-and-db.md) and [`rules/05-workflow-and-docs-sync.md`](./rules/05-workflow-and-docs-sync.md).
* **Status**: Approved & Implemented.

---

### UD-018: Phase 2 Database Modeling, Migrations & Realistic Mad Max Gym Seed Data
* **Date**: 2026-11-21
* **Area**: Database & Seed Data
* **Context**: With Phase 1 PostgreSQL 16 (`mad_max_gym_db` on port `5435`) healthy and reachable, the user directed execution of Phase 2 to establish the complete relational schema, concurrency-safe sequences, and realistic **Mad Max Gym** demo data across all 6 approved feature modules.
* **User Requirement**:
  1. Author idempotent migration `001_initial_schema.sql` with `pgcrypto`, `member_code_seq`, `invoice_number_seq`, 6 natural-code reference tables, 6 UUID entity/transactional tables, and singleton `store_settings` (`id = 1`).
  2. Seed 2 staff accounts (`owner@madmaxgym.com` / `Admin123!` and `frontdesk@madmaxgym.com` / `Staff123!` using `bcryptjs` $\ge 10$ rounds), 7 **Mad Max Gym** 12% BIR VAT-inclusive membership plans, and 12 realistic members (`MEM-2026-0001`–`MEM-2026-0012`) across `ACTIVE`, `EXPIRING SOON`, `FROZEN`, and `EXPIRED` states with corresponding subscriptions, payments, and attendance logs.
  3. Expose idempotent `npm run db:migrate` (tracked in `schema_migrations`) and `npm run db:seed` commands in `backend/package.json`.
* **Implementation**:
  * Created [`backend/src/db/migrations/001_initial_schema.sql`](./backend/src/db/migrations/001_initial_schema.sql), [`backend/src/db/migrate.js`](./backend/src/db/migrate.js), and [`backend/src/db/seed.js`](./backend/src/db/seed.js).
  * Executed `npm run db:migrate` and `npm run db:seed` twice to confirm idempotency, verifying all 14 tables, sequence `last_value = 12`, `bcryptjs` hashes, and zero 12% VAT-inclusive math mismatches.
  * Marked Phase 2 (`2.1`, `2.2`) complete in [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
* **Status**: Approved & Implemented.

---

### UD-019: Phase 5 Complete Screen Delivery (Parts 5.1, 5.2, and 5.3)
* **Date**: 2026-11-21
* **Area**: Full-Stack Screen Delivery
* **Context**: With Phase 3 Backend REST API (port `4600`) and Phase 4 Component Library complete, the user directed delivering all Phase 5 operational screens across Parts 5.1, 5.2, and 5.3 wired directly to the live `/api/v1/*` endpoints.
* **User Requirement**:
  1. **Part 5.1:** Deliver `CheckIn.jsx` (Staff Lookup Mode + Fullscreen Self-Service Kiosk Mode inside `KioskShell` with 4s auto-reset countdown bar, 5-minute duplicate cooldown banner, and password-locked exit) and `Plans.jsx` + `PlanDrawer.jsx` (dynamic fields by plan type, live 12% BIR VAT helper, duplicate action, `FRONT_DESK` read-only mode).
  2. **Part 5.2:** Deliver `Members.jsx` + `MemberDrawer.jsx` + `MemberPassModal.jsx` (printable zero-dependency SVG QR Pass Card, Freeze/Unfreeze actions, `"Save & Enroll in Plan"`) and `Payments.jsx` + `PaymentModal.jsx` + `ReceiptModal.jsx` + `ConfirmVoidModal.jsx` (1-step Walk-In Day Pass, date-stacked renewals, Cash quick bills, GCash/Maya QR counter zoom, 80mm thermal receipt with embedded QR pass, and `ADMIN`-only void).
  3. **Part 5.3:** Deliver `Dashboard.jsx` (timeframe filters, 4 KPI cards, 6 AM–10 PM peak hours bar chart, Expiring Soon 1-click Renew table), `Login.jsx` + `ForgotPasswordModal.jsx`, `Staff.jsx` + `StaffDrawer.jsx` + `ResetPasswordModal.jsx`, and `Settings.jsx` (live 80mm VAT receipt preview, discount tiers, and instant auto-saved merchant QR codes), wired in `App.jsx` with `gym_active_screen` persistence and RBAC route protection.
* **Implementation**:
  * Built all 7 screens, 3 CRUD drawers, 5 transactional modals, zero-dependency ISO/IEC 18004 SVG QR encoder (`frontend/src/utils/qrCode.js` + `QrCodeSvg.jsx`), and updated `frontend/src/App.jsx`.
  * Verified `npm run build` in `frontend/` passes cleanly (0 errors) and verified live API endpoints on port `4600`.
  * Marked Phase 5 (`Part 5.1`, `Part 5.2`, `Part 5.3`) completed in [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
* **Status**: Approved & Implemented.

---

### UD-020: Phase 6 End-to-End Verification, Zero-Drift Audit & Developer Runbook
* **Date**: 2026-11-21
* **Area**: Verification & Runbook
* **Context**: With Phases 0–5 complete, the user directed execution of Phase 6 covering automated end-to-end functional & acceptance criteria verification across all 6 modules, RBAC & security audit, `@media print` isolation & UI ergonomics audit, zero-drift documentation reconciliation, and generation of [`HOW_TO_RUN.md`](./HOW_TO_RUN.md) and [`README.md`](./README.md).
* **User Requirement**:
  1. Execute an end-to-end verification suite auditing every field validation rule and behavioral Acceptance Criterion (`AC-XX.X`) across Modules `01` through `06`.
  2. Audit `FRONT_DESK` RBAC restrictions (`HTTP 403 Forbidden` on backend and frontend route guard toast), rate-limiting (`HTTP 429` after >5 failed login attempts / 15m), and `.gitignore` skill exclusion.
  3. Verify `@media print` isolation for both the 80mm thermal receipt (`ReceiptModal.jsx`) and Member QR Pass Card (`MemberPassModal.jsx`), zero emojis across `frontend/src/`, 540px drawers with `DirtyGuardModal`, in-column `KebabMenu`, shimmer `Skeleton` loaders, and clean Vite production build.
  4. Reconcile `docs/features/01`–`06`, `decisions.md`, `decision.md`, and `docs/IMPLEMENTATION_PLAN.md`, and author [`HOW_TO_RUN.md`](./HOW_TO_RUN.md) and [`README.md`](./README.md).
* **Implementation**:
  * Executed a 66-check automated Phase 6 verification suite against the live stack (0 failures) and reset PostgreSQL to the canonical seeded state.
  * Reconciled all documentation and marked Phase 6 (`6.1`, `6.2`, `6.3`, `6.4`) completed in [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).
  * Authored [`HOW_TO_RUN.md`](./HOW_TO_RUN.md) and [`README.md`](./README.md) at the project root.
* **Status**: Approved & Implemented.

---

### UD-021: Cloud Production Deployment Guide (`Deployment.md`: Vercel + Render + Supabase)
* **Date**: 2026-11-21
* **Area**: Cloud Deployment & Infrastructure
* **Context**: The user requested generating a `Deployment.md` guide for deploying the **Mad Max Gym Management System** to production using **Vercel** (Frontend), **Render** (Backend), and **Supabase** (PostgreSQL Database).
* **User Requirement**: Provide a step-by-step cloud deployment guide (`Deployment.md`) covering Supabase PostgreSQL provisioning & migration/seeding, Render Express API web service configuration, and Vercel React/Vite frontend deployment.
* **Implementation**:
  * Created [`Deployment.md`](./Deployment.md) at the project root with architecture diagrams, Supabase IPv4 Session Pooler setup, Render build/start/env/healthcheck settings, Vercel root-directory & `VITE_API_URL` setup, and a post-deployment verification & troubleshooting matrix.
  * Added remote PostgreSQL SSL auto-detection (`DB_SSL`) in [`backend/src/config/db.js`](./backend/src/config/db.js), `app.set('trust proxy', 1)` in [`backend/src/server.js`](./backend/src/server.js) for Render load-balancer rate limiting, and SPA routing rules in [`frontend/vercel.json`](./frontend/vercel.json).
* **Status**: Approved & Implemented.
