# Rule 01: Core Agent Operating Rules & Governance

> **Mandatory Reference:** This document defines the foundational operating rules that every AI agent (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) and engineer must follow when building and maintaining this system.

---

## 1. Proactive Clarification with Structured Options
Whenever a user prompt, requirement, or task specification is unclear, ambiguous, or presents multiple viable implementation paths:
* **Never assume or guess:** Do not make unilateral assumptions about functional scope, design details, business logic, or architecture tradeoffs.
* **Ask with options:** Proactively present the user with structured multiple-choice questions using the `ask_question` tool before executing or committing changes.
* **Recommendations First:** Always place the recommended option first, prefixed with `(Recommended)`, keeping options concise, concrete, and directly relevant to the decision at hand.

---

## 2. Mandatory User Decision Logging (`decisions.md`)
Because this project is a **System Project** (Gym Management System):
* **Create & Continuously Maintain `decisions.md`:** The agent **MUST** maintain [`decisions.md`](../decisions.md) in the project root to record all decisions made by the user regarding requirements, features, UI/UX behavior, and business scope.
* **Chronological Index:** Maintain an immutable chronological index of User Decisions (`UD-001`, `UD-002`, ...) throughout the project lifecycle.
* **Entry Structure:** Every entry must record:
  * **Decision ID** (`UD-XXX`)
  * **Date** (`YYYY-MM-DD`)
  * **Area** (e.g., Architecture, Memberships, POS/Billing, UI/UX)
  * **Context / Question**
  * **User Requirement / Decision**
  * **Implementation Details**
  * **Status** (`Approved & Codified`, `Approved & Implemented`)
* **Separation of Concerns:** User-facing requirement and product scope decisions belong in [`decisions.md`](../decisions.md); lower-level engineering and code architecture records (ADRs) belong in [`decision.md`](../decision.md).

---

## 3. Mandatory Feature Requirements Documentation Sync
Whenever code changes (new features, modifications, bug fixes, schema updates, or behavioral adjustments) are completed:
* **Locate Feature Domain:** Identify the corresponding feature document inside [`docs/features/`](../docs/features/).
* **Immediate Sync:** Update the user stories, acceptance criteria, validation rules, Mermaid diagrams, and database schema specifications in that feature document.
* **Zero Drift Guarantee:** Code implementation and feature documentation must remain in lockstep synchronization with zero drift at all times.

---

## 4. Mandatory Skill Installation Before Environment Setup (Phase 0 Gate)
Whenever starting or bootstrapping the system project:
* **Phase 0 Gate — Skills Before Environment:** Before installing or configuring the execution environment (Node.js / `npm install`, Docker containers, PostgreSQL setup, or runtime scaffolding), the agent **MUST** prompt the user using `ask_question` for the specific list of skills to install for this system project.
* **Workspace & Global Installation:** Download and integrate all confirmed skills into both the project workspace (`.agents/skills/`) and global Antigravity paths (`~/.gemini/antigravity/skills/`, `~/.agents/skills/`), verifying that manifests (`SKILL.md`) and reference files are intact.
* **Mandatory `.gitignore` Exclusion for Installed Skills:** Installed agent skill directories (`.agents/`, `.agents/skills/`) **MUST** always be added to the root [`.gitignore`](../.gitignore) so that large external skill repositories and reference payloads are never committed to project source control (while [`docs/required-skills.md`](../docs/required-skills.md) remains tracked in git as the canonical manifest of required skills).
* **Zero Premature Environment Setup:** Never run `npm install`, `docker-compose up`, or scaffold runtime dependencies until the confirmed skills are fully installed, verified, and gitignored.

---

## 5. Self-Annealing Error Resolution
When encountering a build error, test failure, or runtime exception:
1. **Isolate Root Cause:** Determine whether the root cause resides in the frontend (state, props, component rendering), backend (route, middleware, service, SQL query), or database schema/migration.
2. **Clean Fix:** Resolve the root cause directly without introducing workarounds or breaking existing functionality.
3. **End-to-End Verification:** Verify that both frontend and backend compile and run cleanly with zero warnings.
