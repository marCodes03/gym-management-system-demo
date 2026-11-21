# Mad Max Gym — Developer & Business Owner Runbook (`HOW_TO_RUN.md`)

> **System**: **Mad Max Gym — Membership Management, Usage Tracker & Fast Sign-In System**  
> **Tagline**: *"Forged in Iron. Built for Speed."*  
> **Stack**: React 18 (Vite + Tailwind CSS) • Node.js (Express.js REST API) • PostgreSQL 16 (Docker Compose)

---

## 1. Prerequisites

Ensure the following tools are installed on your machine:
* **Docker Desktop** (with Docker Compose v2 enabled)
* **Node.js** `v20.x` or newer & **npm** `v10.x` or newer
* A modern Chromium, Firefox, or Edge browser (supports `@media print` for 80mm thermal receipts and Member QR Pass cards)

---

## 2. Port Allocation Overview

By default (per [`decisions.md`](./decisions.md) `UD-016` & [`decision.md`](./decision.md) `ADR-007`), **Mad Max Gym** is configured on isolated ports so it runs side-by-side with other local Docker stacks without port collisions:

| Service Tier | Container Name | Default Host Port (`UD-016`) | Standalone / Reference Port | URL / Connection String |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16 Database** | `mad_max_gym_db` | **`5435`** (`5435:5432`) | `5434` (`5434:5432`) | `postgresql://postgres:postgres@localhost:5435/mad_max_gym` |
| **Express.js Backend API** | `mad_max_gym_backend` | **`4600`** (`4600:4600`) | `4500` (`4500:4500`) | `http://localhost:4600/api/v1/health` |
| **React 18 Web Client** | `mad_max_gym_web` | **`4601`** (`4601:80` / Vite) | `4501` (`4501:80` / Vite) | `http://localhost:4601` |

> **Using Standalone Ports (`5434` / `4500` / `4501`):**  
> If no other stack is occupying ports `5434`, `4500`, and `4501` and you prefer those ports, set `DB_PORT=5434` and `PORT=4500` in `backend/.env`, pass `--port 4501` to Vite (`npm run dev -- --port 4501`), and map `5434:5432` in `docker-compose.yml`.

---

## 3. Startup Guide (Two Supported Modes)

### Option A: Full 3-Container Docker Compose Stack (Recommended for Production / Instant Demo)

1. **Start all 3 containers (`postgres`, `backend`, `web`):**
   ```powershell
   docker compose up -d --build
   ```
2. **Run database migrations and seed realistic Mad Max Gym demo data:**
   ```powershell
   cd backend
   npm install
   npm run db:migrate
   npm run db:seed
   ```
3. **Verify container health:**
   ```powershell
   docker ps --filter "name=mad_max_gym"
   ```
4. **Open the application:**
   * **Web App & Kiosk Terminal:** [http://localhost:4601](http://localhost:4601)
   * **Backend Health Check:** [http://localhost:4600/api/v1/health](http://localhost:4600/api/v1/health)

---

### Option B: Hybrid Local Development Mode (Docker PostgreSQL + Local Node/Vite Hot-Reload)

1. **Start only the PostgreSQL 16 container:**
   ```powershell
   docker compose up -d postgres
   ```
   *(Configured on host port `5435`, or `5434` in standalone mode.)*

2. **Install dependencies, run migrations, seed data, and start the Express Backend API:**
   ```powershell
   cd backend
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```
   * The API boots on **`http://localhost:4600`** (or `http://localhost:4500` when `PORT=4500`).
   * Verify health at `GET /api/v1/health` $\to$ `{"success":true,"data":{"status":"ok","database":"connected"}}`.

3. **Install dependencies and start the React 18 + Vite Frontend:**
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   * The Vite dev server runs on **`http://localhost:4601`** (or `http://localhost:4501` with `npm run dev -- --port 4501`) and proxies `/api` requests to the backend.
   * To verify a clean production bundle at any time:
     ```powershell
     npm run build
     ```

---

## 4. Demo Login Credentials & Seeded Data

### 4.1. Demo Staff Accounts

| Role | Role Code | Email Address | Password | Default Landing Screen | Permissions Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Gym Owner / Admin** | `ADMIN` | `owner@madmaxgym.com` | `Admin123!` | **Owner Dashboard** (`/dashboard`) | Full access to all 6 modules: Dashboard, Fast Check-In, Kiosk Mode, Members, Plans CRUD, Payments, Payment Voids, Staff RBAC, and Gym Settings |
| **Front-Desk Staff** | `FRONT_DESK` | `frontdesk@madmaxgym.com` | `Staff123!` | **Fast Check-In Terminal** (`/check-in`) | Access to Fast Check-In Terminal, Fullscreen Kiosk, Member Directory (Register/Freeze/Unfreeze/QR Pass), Read-Only Plans Catalog, and Membership Payments/Receipts. Blocked (`HTTP 403`) from Owner Dashboard, Staff Access, Gym Settings, Plan CRUD, and Payment Voids |

> **Tip:** On the Login screen, click **"Forgot Password?"** or **"Quick Autofill →"** to test password recovery lookup or 1-click autofill for either demo account.

### 4.2. Seeded Membership Plans (12% Philippine BIR VAT-Inclusive)

| Plan Code | Plan Name | Type | Duration / Visits | 12% VAT-Inclusive Price |
| :--- | :--- | :--- | :--- | :--- |
| `PASS-DAY` | **Walk-In Day Pass** | `DAY_PASS` | 1 Day (Unlimited Day Access) | `₱150.00` |
| `PLAN-WEEKLY` | **7-Day Power Pass** | `RECURRING` | 7 Days Unlimited | `₱500.00` |
| `PLAN-MONTHLY` | **Monthly Unlimited Iron** | `RECURRING` | 30 Days Unlimited | `₱1,500.00` |
| `PLAN-QUARTERLY` | **90-Day Strength Transformation** | `RECURRING` | 90 Days Unlimited | `₱4,000.00` |
| `PLAN-ANNUAL` | **365-Day Mad Max VIP** | `RECURRING` | 365 Days Unlimited | `₱14,000.00` |
| `PACK-10-VISITS` | **10-Visit Flex Pack** | `SESSION_PACK` | 10 Visits (Valid 90 Days) | `₱1,200.00` |
| `PACK-20-VISITS` | **20-Visit Warrior Pack** | `SESSION_PACK` | 20 Visits (Valid 180 Days) | `₱2,200.00` |

### 4.3. Key Sample Members for Testing Sign-In Scenarios

| Member Code | Member Name | Phone Number | Seeded Plan | Status | Ideal Test Scenario |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `MEM-2026-0001` | **Marcus Reyes** | `09171000001` | Monthly Unlimited Iron | `ACTIVE` | Fast Kiosk sign-in (`MEM-2026-0001` or `0001`) & 5-minute duplicate cooldown test |
| `MEM-2026-0004` | **Camille Bautista** | `09171000004` | 20-Visit Warrior Pack | `ACTIVE` (14 visits left) | Atomic `SESSION_PACK` visit deduction test |
| `MEM-2026-0005` | **Diego Villanueva** | `09171000005` | Monthly Unlimited Iron | `EXPIRING SOON` (2 days left) | Amber `EXPIRING SOON` warning pill & 1-click Date-Stacked Renewal |
| `MEM-2026-0008` | **Andrea Santos** | `09171000008` | 10-Visit Flex Pack | `EXPIRING SOON` (1 visit left) | Final visit deduction transitioning subscription to `'EXPIRED'` |
| `MEM-2026-0009` | **Gabriel Aquino** | `09171000009` | 90-Day Strength | `FROZEN` (Frozen 4 days ago) | `DENIED_FROZEN` check-in alert & Unfreeze date-extension math (+4 days) |
| `MEM-2026-0011` | **Miguel Navarro** | `09171000011` | Monthly Unlimited Iron | `EXPIRED` | `DENIED_EXPIRED` red alert banner & Front-Desk 1-click renewal |

---

## 5. Guided 10-Step End-to-End Walkthrough

Follow these 10 steps to verify every core workflow across **Mad Max Gym**:

### Step 1: Sign In & Verify Eye-Icon Toggle
1. Open [http://localhost:4601](http://localhost:4601).
2. Click **"Quick Autofill →"** to open `ForgotPasswordModal`, type `frontdesk@madmaxgym.com` to test account verification, then click **"Owner Admin"** to pre-fill `owner@madmaxgym.com` / `Admin123!`.
3. Click the **eye icon** inside the password field to verify plaintext/masked toggling, then click **Sign In to Mad Max Gym**. You land on the **Owner Usage & Membership Dashboard**.

### Step 2: Audit Owner Usage Dashboard & 1-Click Expiring Renewal
1. On **Owner Dashboard**, toggle the timeframe pills between **`Today`**, **`Last 7 Days`**, and **`This Month`**. Observe the metallic shimmer skeletons, the 4 KPI cards, and the **Peak Gym Usage Hours (6 AM – 10 PM)** bar chart.
2. Scroll down to the **Expiring Soon — Renewal Action Queue** ($\le 7$ days or $\le 2$ visits remaining).
3. Click **`Renew`** next to **Diego Villanueva (`MEM-2026-0005`)** to open `PaymentModal` pre-selected with his profile and note the green **`Date-Stacked`** validity badge (`current_end_date + 1 day`). Close the modal for now or complete the renewal.

### Step 3: Test Fullscreen Self-Service Kiosk Sign-In & 5-Minute Duplicate Cooldown
1. Navigate to **Fast Check-In** in the left sidebar and click **`Launch Fullscreen Kiosk`**.
2. Type `0001` (4-digit suffix for `MEM-2026-0001` Marcus Reyes) and press `Enter`:
   * A high-contrast **Green `ACCESS GRANTED`** banner appears with a 4-second auto-reset countdown bar.
3. Immediately type `MEM-2026-0001` or `09171000001` again within 5 minutes:
   * The **5-Minute Duplicate Sign-In Cooldown Guard** triggers (*"You are already signed in today at {HH:MM}!"*) with **zero** extra visit deduction.

### Step 4: Test Atomic Visit Pack Deduction & Denied Alerts in Kiosk Mode
1. In Kiosk Mode, type `0004` (`MEM-2026-0004` Camille Bautista on a 20-Visit Warrior Pack) and press `Enter`:
   * Verify `remaining_sessions` atomically decrements by `1` (*"1 visit deducted • 13 visit(s) left"*).
2. Type `0008` (`MEM-2026-0008` Andrea Santos with `1` visit remaining):
   * Today's entry is **`ACCESS GRANTED`** (*"0 visit(s) left"*), and her subscription automatically transitions to `'EXPIRED'` for future visits.
3. Type `0009` (`MEM-2026-0009` Gabriel Aquino — `FROZEN`) $\to$ observe the **Amber `ACCESS DENIED` (Frozen)** banner.
4. Type `0011` (`MEM-2026-0011` Miguel Navarro — `EXPIRED`) $\to$ observe the **Red `ACCESS DENIED` (Expired)** banner.

### Step 5: Test Password-Guarded Kiosk Exit Lock
1. Click **`Exit Kiosk`** in the top-right corner of the Kiosk header.
2. Enter an invalid password (e.g., `wrongpass`) and submit $\to$ verify exit is blocked with *"Incorrect staff password. Kiosk mode remains locked."*
3. Enter `Admin123!` (or `Staff123!` if logged in as Front Desk) $\to$ Kiosk Mode unlocks and returns to the Staff Lookup view, where all your Kiosk sign-in attempts appear in the **Live Sign-In Feed**.

### Step 6: View & Print the Mad Max Gym Member QR Pass Card
1. Navigate to **Members** in the sidebar.
2. Click the in-column Kebab menu (`⋮`) on **Marcus Reyes (`MEM-2026-0001`)** and select **`View Member Pass`**.
3. `MemberPassModal` displays the official **Mad Max Gym Athlete Pass** with `mad-max-badge.svg` seal and a crisp, zero-dependency ISO/IEC 18004 SVG QR code.
4. Click **`Print QR Pass`** to verify `@media print` isolation (only the 90mm badge card is visible in print preview).

### Step 7: Test Subscription Freeze & Unfreeze Date-Extension Math
1. On the **Members** screen, filter by **`Frozen`** to locate **Gabriel Aquino (`MEM-2026-0009`)** (frozen 4 days ago).
2. Open his Kebab menu (`⋮`) and click **`Unfreeze Plan`**:
   * Verify the toast confirms: *"Membership unfrozen! Expiration date extended by 4 day(s) to {new_end_date}."*
3. Open the Kebab menu on any **`Active`** recurring member and click **`Freeze Plan`** to pause their membership (`status_code = 'FROZEN'`, `frozen_at = NOW()`).

### Step 8: Process a 1-Step Quick Walk-In Day Pass & Print 80mm Thermal Receipt
1. Navigate to **Payments** and click **`Quick Walk-In Pass`**.
2. In `PaymentModal` (**Quick Walk-In Guest** tab), enter Name `Juan Dela Cruz` and Phone `09178889900`.
3. Select **Walk-In Day Pass (`₱150.00`)**, click the **`Student (10%)`** discount pill (Total becomes `₱135.00`, Net Vatable Sales `₱120.54`, 12% VAT `₱14.46`), and click the **`₱200`** Cash quick-bill button (Change Due: `₱65.00`).
4. Ensure **`Auto Check-In Member Now`** is checked and click **`Complete Payment & Print (₱135.00)`**.
5. `ReceiptModal` opens immediately showing `INV-YYYYMMDD-XXXX`, the 12% BIR VAT breakdown, and the new member's embedded **QR Pass** at the bottom. Click **`Print Thermal Receipt`** to verify 80mm thermal paper print isolation.

### Step 9: Create/Duplicate a Membership Plan (540px Drawer + Dirty Guard) & Void a Payment
1. Navigate to **Plans**, open any plan's Kebab menu (`⋮`), and click **`Duplicate Plan`**.
2. Modify a field in the `540px` `PlanDrawer`, then press `Esc` or click the backdrop $\to$ verify the **Unsaved Changes Guard Modal (`DirtyGuardModal`)** intercepts the close action. Click **Keep Editing**, verify the live 12% BIR VAT preview caption below the price input, and save the plan.
3. Navigate to **Payments**, open the Kebab menu (`⋮`) on a recent completed invoice, and click **`Void Payment`**. Enter an audit reason ($\ge 5$ characters) in `ConfirmVoidModal` and confirm $\to$ the invoice is marked **`VOIDED`** and its linked subscription is atomically marked **`CANCELLED`**.

### Step 10: Configure Auto-Saved Merchant QR Codes & Verify Front-Desk RBAC
1. Navigate to **Gym Settings** (`/settings`). Edit the **Receipt Header Line** and watch the **Live 80mm Receipt Preview** update in real time.
2. Under **Merchant Payment QR Codes (GCash / Maya)**, enter Provider `GCash`, choose any PNG/JPG/WEBP image ($\le 2\text{ MB}$), and click **`Upload & Auto-Save QR`** $\to$ verify it saves immediately via `PUT /api/v1/settings/qr-codes` without clicking the main Save button.
3. Click **`Log Out`** in the collapsible sidebar rail (test collapsing/expanding the 230px $\leftrightarrow$ 64px sidebar rail and hover tooltips first), then sign in as **Front Desk (`frontdesk@madmaxgym.com` / `Staff123!`)**:
   * Confirm the user lands directly on **Fast Check-In**, **Owner Dashboard / Staff Access / Gym Settings** are hidden from navigation, **Plans** is in **`Read-Only Catalog`** mode, and **`Void Payment`** is hidden from invoice Kebab menus.
