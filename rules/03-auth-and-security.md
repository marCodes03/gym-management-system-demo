# Rule 03: Authentication, RBAC & Security Standards

> **Mandatory Reference:** This document governs user authentication, password security, role-based access control (RBAC), rate limiting, and session persistence across the system.

---

## 1. Authentication & Credential Rules
* **Login Identifier:** Authentication is strictly **Email Address + Password** (no username-based login).
* **Password Visibility Toggle:** All password inputs (Login, Reset Password, Staff Creation) must include an interactive eye-icon toggle (`type="password"` $\leftrightarrow$ `type="text"`).
* **Password Hashing & Policy:**
  * Minimum 8 characters.
  * Hashed using `bcryptjs` with salt rounds $\ge 10$.
  * Plaintext passwords must never be stored in the database, returned in API responses, or written to logs.
* **Password Recovery Flow:**
  * Provide an interactive `"Forgot password?"` assistance modal (`ForgotPasswordModal`) on the Login screen that verifies registered staff emails and displays administrator recovery instructions (plus optional demo credential helpers in educational/dev mode).
  * Administrators can directly issue password resets for staff via `POST /api/v1/staff/:id/reset-password` (`ResetPasswordModal`).

---

## 2. Reference-Driven Role-Based Access Control (RBAC)
* **Natural Code Primary Key:** Roles are stored in the `roles` lookup table (`code VARCHAR(30) PRIMARY KEY`).
* **Core System Roles:**
  * `ADMIN` (Gym Owner / General Manager): Full access to Analytics Dashboard, Member Management, Membership Plans, Trainers & Classes, Check-in Terminal, POS & Billing, Equipment & Inventory, Staff Management, and Gym Settings.
  * `RECEPTIONIST` / `FRONT_DESK` (Front-of-House Staff): Access to Member Check-In & Attendance Terminal, POS & Membership Billing, Member Registration/Lookup, and Class Bookings. Restricted from Staff Management, Financial/System Settings, and Payment Voiding.
  * `TRAINER` (Coach / Instructor): Access to assigned Class Schedules, Member Attendance rosters, and Personal Profile.
* **Defense in Depth:**
  * **Frontend Route Guards:** Intercept unauthorized role navigation and redirect to the role's default home screen (`/dashboard` for `ADMIN`, `/check-in` or `/pos` for `FRONT_DESK`) with a friendly warning toast.
  * **Backend Middleware (`requireAuth`, `requireRole`):** Every protected endpoint must verify the Bearer JWT signature, confirm `user.is_active === true`, and enforce role authorization (`HTTP 403 Forbidden` on mismatch).

---

## 3. Rate Limiting & Environment Hardening
* **Authentication Rate Limiter:** Apply `express-rate-limit` (max 5 attempts per 15-minute sliding window per IP) to `/api/v1/auth/login` and `/api/v1/auth/forgot-password`, returning `HTTP 429 Too Many Requests` in the standard API error envelope.
* **Environment Validation at Boot:** The backend server (`server.js`) must validate critical environment variables (`DATABASE_URL` / DB config, `JWT_SECRET`) on startup and fail fast if running in production without a strong cryptographic secret.

---

## 4. Session Persistence & Strict Sign-Out
* **Active Screen Persistence:** Store the authenticated user's active navigation screen in `localStorage` so browser refreshes stay on the current view rather than resetting unexpectedly.
* **Unauthenticated Guard:** Unauthenticated users must strictly see the `Login` view with zero flash of protected backoffice content.
* **Prominent Log Out:** Provide a direct `Log Out` action both in the collapsible sidebar footer and in the front-desk terminal top header, clearing JWT tokens and active screen state immediately on sign-out.
