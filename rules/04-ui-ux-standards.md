# Rule 04: UI/UX, Design System & Component Ergonomics

> **Mandatory Reference:** This document codifies the UI/UX design patterns, layout ergonomics, tactile feedback, and component conventions proven in the reference POS & Inventory System framework.

---

## 1. Layout & Interaction Architecture

### 1.1. Slide-In Drawers for All CRUD Forms
* **Standardized Right Drawers (`max-w-[540px]`):** All create and edit forms (*Add/Edit Member, Create Membership Plan, Schedule Class, Add Trainer, Adjust Inventory/Equipment, Add Staff*) must use a right slide-in `Drawer` (`px-7 py-5`) with a backdrop overlay.
* **Context Subtitles:** Every drawer header must include a concise title and a descriptive purpose subtitle underneath.
* **Unsaved Changes Guard:** Closing a dirty CRUD drawer (via backdrop click, `Esc`, or Cancel button) must trigger an confirmation guard modal warning the user before discarding unsaved input.

### 1.2. Centered Modals for High-Focus Terminal Actions
* Reserve centered `Modal` dialogs for high-focus transactional workflows:
  * **Payment & Membership Checkout Tender** (Cash quick bills: **Exact**, **₱100**, **₱200**, **₱500**, **₱1,000**, plus Digital Wallet QR counter display with fullscreen zoom).
  * **80mm ESC/POS Thermal Receipt Preview & Print** (`@media print` isolation).
  * **Destructive / Administrative Confirmations** (Void Payment/Invoice, Freeze/Cancel Membership, Reset Staff Password).

### 1.3. Persistent Collapsible Navigation Sidebar
* **230px Full Sidebar $\leftrightarrow$ 64px Icon Rail:** Collapsible dark sidebar organized under logical group headers (`Front Desk`, `Members & Fitness`, `Operations`, `Administration`).
* **Persistent Minimized State:** Store collapsed state in `localStorage`. Clicking an icon while minimized must navigate directly to the target screen **without** auto-expanding the sidebar rail.
* **Hover Tooltips:** When collapsed to the 64px icon rail, display instantaneous hover tooltips showing the page title.

---

## 2. Data Table & Action Ergonomics
* **In-Column Kebab Action Menus (`⋮`):** Place the hover-highlighted kebab menu (`KebabMenu`) inside the rightmost data column rather than creating an empty dedicated "Actions" column, maximizing horizontal table density.
* **No Redundant Action Buttons:** Consolidate row actions (*View Profile, Renew Membership, Freeze Plan, Edit, View History, Deactivate*) inside the Kebab menu or row click handler.
* **Tactile Shimmer Skeleton Loaders:** Never display raw `"Loading..."` text. All data tables, KPI cards, and grids must render smooth shimmer skeleton placeholders while awaiting API responses.

---

## 3. Brand Identity, Visual Polish, Icons & Localization (`Mad Max Gym`)
* **Official Gym Brand & Color Palette (`Mad Max Gym`):**
  * **Obsidian Black (`#0B0D11` / `#111827`):** Collapsible sidebar chassis, Fullscreen Kiosk frame, modal headers, and high-contrast headings.
  * **Gunmetal Gray (`#374151`):** Elevated secondary surfaces, neutral controls, table headers, and structural borders.
  * **Royal Blue (`#2563EB` / `#1D4ED8` / `#DBEAFE`):** Primary tactile CTA buttons (`Sign In`, `Complete Payment`, `+ New Member`), active navigation accents, focus rings, and QR Pass badge highlights.
  * **Silver Gray (`#9CA3AF` / `#E5E7EB` / `#F3F4F6`):** Metallic chrome subtext, subtle card borders, backoffice canvas surface, and shimmer skeleton placeholders.
* **Zero Emojis in UI:** Never use raw emoji characters in production UI components. Use a dedicated zero-dependency flat SVG icon component (`SvgIcon`) with consistent `stroke-width="1.8"`.
* **Branded Vector Fallbacks:** When a member photo, trainer avatar, or retail product image is missing or fails to load (`onError`), automatically render a branded vector SVG illustration fallback instead of a broken image icon.
* **Typography & Currency:**
  * Primary UI Font: *Inter* (clean geometric sans-serif).
  * Numeric / Monospace Font: *Geist Mono* or *Roboto Mono* (`tabular-nums`) for all currency amounts, membership IDs, timestamps, SKUs, and countdown badges.
  * Currency: Philippine Peso (`₱`) formatted to 2 decimal places (`₱1,500.00`).
* **Form Validation & Accessibility:**
  * Mark all required input labels with `<span className="text-red-600 ml-0.5">*</span>`.
  * Top-right polymorphic toast notifications (`ToastContext`) with semantic status colors (`success`, `error`, `warning`, `info`).
  * Humanized, actionable validation and error messages—never dump raw stack traces or SQL constraint codes to the user.
