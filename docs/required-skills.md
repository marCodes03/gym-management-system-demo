# Required Agent Skills Specification (`docs/required-skills.md`)

> **Governance Rule ([`rules/01-operating-rules.md`](../rules/01-operating-rules.md)):** Before executing **Phase 1** (Node.js / `npm install`, Docker PostgreSQL setup, or runtime scaffolding), all required agent skills listed below must be confirmed by the user and installed into both the project workspace (`.agents/skills/`) and global Antigravity skill directories (`~/.gemini/antigravity/skills/`, `~/.agents/skills/`).
>
> *Note: For brand identity, color tokens (Black, Gray, Royal Blue, Silver Gray), and typography specifications for **Mad Max Gym**, refer to [`brand.md`](../brand.md).*

---

## 1. Official Required Skills List (9 External Skill Repositories)

The following **9 curated agent skills** are required for building, styling, animating, and auditing the **Mad Max Gym Management System**:

| # | Skill Name | Official Source Repository URL | Category | Purpose in Project |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `frontend-design` | https://github.com/anthropics/skills/tree/main/skills/frontend-design | Frontend Architecture & UI | Guides distinctive, production-grade frontend component architecture (`AppShell`, 540px `Drawer`, `Modal`, Kiosk terminal, QR Pass cards) adhering to [`brand.md`](../brand.md). |
| **02** | `web-design-guidelines` | https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines | Accessibility, Forms & UX Polish | Enforces keyboard focus management (auto-focused Kiosk input, `Esc` dirty-drawer guard), semantic labels with required asterisks (`*`), eye-icon toggles, and contrast compliance. |
| **03** | `react-best-practices` | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices | React 18 Performance & State | Governs clean React 18 hooks, `AuthContext` / `ToastContext`, `localStorage` screen persistence (`gym_active_screen`), debounced search, and rendering performance. |
| **04** | `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | High-Velocity Touch & System UX | Drives touch-friendly ergonomics ($\ge 48\text{px}$ tap targets), 2-second Kiosk sign-in flows, in-column Kebab menus (`⋮`), shimmer skeleton loaders, and 1-step Walk-In Day Pass checkout. |
| **05** | `code-review` | https://github.com/mattpocock/skills/tree/main/skills/engineering/code-review | Engineering Audit & Security | Audits parameterized SQL queries, `bcryptjs` hashing, `express-rate-limit` on `/auth/login`, RBAC guards (`ADMIN` vs. `FRONT_DESK`), and edge-case validation rules. |
| **06** | `backend-patterns` | https://github.com/affaan-m/ECC/tree/main/skills/backend-patterns | Express API & ACID Transactions | Enforces layered backend architecture (`Routes -> Middlewares -> Controllers -> Services -> DB`), `FOR UPDATE` row locking, PostgreSQL sequences, and standardized JSON envelopes. |
| **07** | `ui-animation` | https://github.com/mblode/agent-skills/tree/main/skills/ui-animation | Tactile Motion & Transitions | Implements responsive 540px drawer slide-ins, symmetric modal exit transitions, `75ms` tactile button depression, and the 4-second Kiosk welcome banner auto-reset countdown. |
| **08** | `taste-skill` | https://github.com/Leonxlnx/taste-skill | Visual Restraint & Aesthetic Craft | Ensures high-taste visual hierarchy, balanced spacing, zero-emoji flat SVG iconography (`SvgIcon`), and cohesive metallic/royal-blue surface contrast. |
| **09** | `impeccable` | https://github.com/pbakaus/impeccable | Zero-Defect Polish & Precision | Enforces pixel-level alignment, tabular monospace numeric precision (`tabular-nums`), zero layout shift during shimmer loading, and `@media print` 80mm receipt isolation. |

---

## 2. Skill Mapping to the 6 Approved Feature Modules

| Feature Module (`docs/features/`) | Primary Active Skills |
| :--- | :--- |
| **Module 01:** [`01-auth-and-staff-management`](./features/01-auth-and-staff-management/auth-and-staff-management.md) | `backend-patterns`, `code-review`, `react-best-practices`, `web-design-guidelines`, `impeccable` |
| **Module 02:** [`02-membership-plans`](./features/02-membership-plans/membership-plans.md) | `frontend-design`, `ui-ux-pro-max`, `taste-skill`, `backend-patterns`, `web-design-guidelines` |
| **Module 03:** [`03-members-and-subscriptions`](./features/03-members-and-subscriptions/members-and-subscriptions.md) | `frontend-design`, `ui-ux-pro-max`, `backend-patterns`, `taste-skill`, `impeccable` |
| **Module 04:** [`04-fast-check-in-and-attendance`](./features/04-fast-check-in-and-attendance/fast-check-in-and-attendance.md) | `ui-ux-pro-max`, `ui-animation`, `backend-patterns` *(`FOR UPDATE` session deduction)*, `web-design-guidelines`, `impeccable` |
| **Module 05:** [`05-membership-payments-and-receipts`](./features/05-membership-payments-and-receipts/membership-payments-and-receipts.md) | `backend-patterns` *(ACID payment + 12% VAT math)*, `impeccable` *(80mm `@media print` receipt)*, `ui-ux-pro-max`, `code-review` |
| **Module 06:** [`06-owner-dashboard-and-settings`](./features/06-owner-dashboard-and-settings/owner-dashboard-and-settings.md) | `frontend-design`, `react-best-practices` *(auto-save QR codes & timeframe filters)*, `taste-skill`, `ui-animation` |

---

## 3. Phase 0 Installation & Verification Checklist

Per **Rule 4 ([`rules/01-operating-rules.md`](../rules/01-operating-rules.md))**, before running `npm install`, `docker-compose up`, or scaffolding application code:

1. **Workspace Target Path:**
   ```
   c:\Users\ETI\source\repos\Gym Management System\.agents\skills\<skill-name>\SKILL.md
   ```
2. **Global Antigravity Target Paths:**
   ```
   C:\Users\ETI\.gemini\antigravity\skills\<skill-name>\SKILL.md
   C:\Users\ETI\.agents\skills\<skill-name>\SKILL.md
   ```
3. **Verification & `.gitignore` Gate:**
   * Confirm every installed skill folder contains its `SKILL.md` manifest and any associated `references/`, `rules/`, or `scripts/` directories before proceeding to **Phase 1**.
   * Verify that `.agents/` and `.agents/skills/` are listed in the root [`.gitignore`](../.gitignore) so downloaded skill directories are excluded from Git commits while [`docs/required-skills.md`](./required-skills.md) remains tracked as the source-controlled manifest.
