# Antigravity Operating Rules: Gym Management System (`GEMINI.md`)

> **Framework Architecture:** All operational, architectural, security, UI/UX, and workflow rules for this system project are modularized inside the [`rules/`](./rules/) directory and must be strictly followed without exception.

---

## 1. Modular Rules Index (`rules/`)

Every agent or engineer working in this repository **MUST** consult and enforce the modular rule specifications below:

| Rule File | Scope & Responsibility |
| :--- | :--- |
| [**`rules/01-operating-rules.md`**](./rules/01-operating-rules.md) | **Core Agent Operating Rules:** Proactive clarification via `ask_question` with `(Recommended)` first, mandatory `decisions.md` logging (`UD-XXX`), feature documentation sync (`docs/features/`), and Phase 0 skill installation gate. |
| [**`rules/02-architecture-and-db.md`**](./rules/02-architecture-and-db.md) | **Architecture & Database Conventions:** React 18 + Express + PostgreSQL 16 stack, layered backend (`Routes -> Middlewares -> Controllers -> Services -> DB`), `UUID` vs. natural `code` primary keys, PostgreSQL sequences, ACID transactions, and 12% BIR VAT-inclusive math. |
| [**`rules/03-auth-and-security.md`**](./rules/03-auth-and-security.md) | **Authentication, RBAC & Security:** Email + password login with eye-icon visibility toggle, `bcryptjs` hashing, reference-driven RBAC (`ADMIN`, `FRONT_DESK`, `TRAINER`), `express-rate-limit` auth defense, and active screen persistence. |
| [**`rules/04-ui-ux-standards.md`**](./rules/04-ui-ux-standards.md) | **UI/UX & Component Ergonomics:** 540px slide-in CRUD drawers with subtitles & dirty-state guard, centered modals for payment/thermal receipt, persistent collapsible sidebar rail with tooltips, in-column Kebab menus (`⋮`), shimmer skeletons, and zero-emoji flat SVG icons. |
| [**`rules/05-workflow-and-docs-sync.md`**](./rules/05-workflow-and-docs-sync.md) | **Phased Workflow & Feature PRDs:** Phase 0–6 delivery roadmap, 5-Part Paired Screen Delivery with Review Gates (Parts 5.1–5.5), and mandatory zero-drift synchronization with [`docs/features/`](./docs/features/). |

---

## 2. Quick-Reference Core Operating Mandates

### Rule 1: Proactive Clarification with Options ([`rules/01-operating-rules.md`](./rules/01-operating-rules.md))
* Never assume or guess when a prompt is ambiguous or has multiple implementation paths.
* Always ask structured multiple-choice questions using `ask_question` with the recommended choice first (`(Recommended)`).

### Rule 2: Mandatory Decision Logging ([`decisions.md`](./decisions.md) & [`decision.md`](./decision.md))
* Continuously maintain [`decisions.md`](./decisions.md) in the project root for all user-driven requirement, feature, and UX decisions (`UD-001`, `UD-002`, ...).
* Record lower-level engineering and architectural decisions (ADRs) in [`decision.md`](./decision.md) (`ADR-001`, ...).

### Rule 3: Mandatory Feature Requirements Documentation Sync ([`docs/features/`](./docs/features/))
* Whenever code changes are completed, immediately update the corresponding module PRD in [`docs/features/`](./docs/features/) (`01` through `10`) so code and documentation have zero drift.

### Rule 4: Mandatory Skill Installation Before Environment Setup ([`rules/01-operating-rules.md`](./rules/01-operating-rules.md))
* **Phase 0 Gate:** Before running `npm install`, `docker-compose up`, or scaffolding runtime dependencies, prompt the user via `ask_question` for the skills to install and verify them in `.agents/skills/` and global skill directories.
* **Gitignore Skills:** Always ensure `.agents/` and `.agents/skills/` are excluded in [`.gitignore`](./.gitignore) while tracking [`docs/required-skills.md`](./docs/required-skills.md).
