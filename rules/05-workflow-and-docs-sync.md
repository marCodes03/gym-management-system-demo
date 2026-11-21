# Rule 05: Phased Development Workflow & Documentation Sync

> **Mandatory Reference:** This document defines the 7-phase delivery roadmap (Phase 0 through Phase 6), review gates, and documentation synchronization discipline.

---

## 1. Pre-Coding Inspection Checklist
Before writing or modifying code for any feature, the agent must inspect:
1. **Rules Folder (`rules/01` to `05`):** Verify architectural, security, and UI/UX compliance.
2. **Feature PRD (`docs/features/XX-...`):** Review the module's user stories, acceptance criteria, Mermaid diagrams, and SQL schema.
3. **User Decisions Log (`decisions.md`):** Respect all previously approved user requirement decisions (`UD-XXX`).
4. **Architecture Decisions Log (`decision.md`):** Follow all recorded technical ADRs (`ADR-XXX`).

---

## 2. Phased Foundation & Paired Screen Delivery Model

Every system build follows this structured, review-gated lifecycle:

| Phase | Name | Gate / Deliverable |
| :--- | :--- | :--- |
| **Phase 0** | **Skills Installation & Verification** | **Mandatory Gate:** Prompt user via `ask_question` for required skills; install to `.agents/skills/` and global skill paths before any Node/Docker setup. |
| **Phase 1** | **Environment & Foundation Setup** | Full 3-container Docker Compose stack (`db`, `backend`, `web`), Express API boilerplate (`/api/v1/health`), React 18 + Vite + Tailwind CSS tokens + Nginx proxy. |
| **Phase 2** | **Database Modeling, Migrations & Seeds** | Numbered SQL migrations (reference tables with natural `code` PKs, domain tables with `UUID` PKs, sequences) + realistic Philippine Gym seed data. |
| **Phase 3** | **Backend REST API & ACID Services** | Layered Controllers & Services, JWT Auth + Rate Limiter, Membership Subscription & Check-in transactions, POS Checkout & Void reversals. |
| **Phase 4** | **Frontend Component Library & Shell** | `AppShell` (collapsible sidebar), `Drawer` (540px + dirty guard), `Modal`, `KebabMenu`, `SvgIcon`, `ToastContext`, Shimmer Skeletons. |
| **Phase 5** | **3-Part Paired Screen Delivery** | Deliver 6 core screens in 3 logical pairs (Parts 5.1–5.3), pausing at a **Review Gate** after each pair for user verification. |
| **Phase 6** | **End-to-End Verification & Runbook** | Full RBAC audit, thermal receipt print verification, documentation reconciliation (`docs/features/`), and `HOW_TO_RUN.md`. |

### Phase 5 Paired Screen Delivery Plan (Simple Gym Management System)
* **Part 5.1 (Fast Sign-In & Membership Plans):**
  * **Screen 1:** Fast Gym Sign-In Terminal (Staff Lookup + Fullscreen Self-Service Kiosk Mode)
  * **Screen 2:** Membership Plans & Visit Packs (`PlanDrawer`) $\to$ **Review Gate 5.1**
* **Part 5.2 (Member Directory & Membership Billing):**
  * **Screen 3:** Member Directory, Subscriptions & QR Pass Card (`MemberDrawer`, `MemberPassModal`)
  * **Screen 4:** Membership Checkout, Payment History & 80mm Receipt (`PaymentModal`, `ReceiptModal`, `ConfirmVoidModal`) $\to$ **Review Gate 5.2**
* **Part 5.3 (Owner Oversight, Staff Access & Gym Settings):**
  * **Screen 5:** Owner Usage & Membership Dashboard (Sign-In Traffic, Peak Hours & Expiring Alerts)
  * **Screen 6:** Staff Access (`StaffDrawer`, `ResetPasswordModal`) & Gym Settings (Discounts & Auto-Saved Payment QRs) $\to$ **Review Gate 5.3**

---

## 3. Feature Documentation Structure (`docs/features/`)
Every feature specification under `docs/features/XX-feature-name/feature-name.md` must maintain:
1. **Module Overview:** Concise summary of purpose, primary keys used (`UUID` vs. natural `code`), and scope.
2. **Database Schema Architecture:** Mermaid `erDiagram` illustrating tables, primary keys, and foreign key relationships.
3. **Features & Capabilities Breakdown:** Numbered list of core capabilities.
4. **User Stories & Acceptance Criteria:**
   * Mermaid `flowchart TD` of the primary user/transaction workflows.
   * Structured user stories (`US-XXX-01`, `US-XXX-02`, ...) with explicit **Validation Rules** and itemized **Acceptance Criteria** (`AC-01.1`, `AC-01.2`, ...) including exact humanized validation/error strings.
5. **Database Schema Relational Specification:** Idempotent PostgreSQL `CREATE TABLE` and `CREATE INDEX` statements.
