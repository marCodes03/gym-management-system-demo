-- ============================================================================
-- Mad Max Gym Management System — Initial Database Schema (Migration 001)
-- PostgreSQL 16 | Hybrid Primary Keys (UUID Entities + Natural Code Lookups)
-- 12% Philippine BIR VAT-Inclusive Standard
-- ============================================================================

-- 1. Cryptographic UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Concurrency-Safe Sequential Identifier Generators
CREATE SEQUENCE IF NOT EXISTS member_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- ============================================================================
-- 3. Reference / Lookup Tables (Natural Uppercase String Code Primary Keys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (code, name, description) VALUES
    ('ADMIN', 'Owner / Administrator', 'Full access to memberships, usage analytics, payments, staff, and gym settings'),
    ('FRONT_DESK', 'Front Desk Staff', 'Access to fast check-in terminal, kiosk mode, member registration, and membership payments')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS plan_types (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO plan_types (code, name) VALUES
    ('DAY_PASS', 'Day Pass / Walk-In'),
    ('RECURRING', 'Time-Based Recurring Plan'),
    ('SESSION_PACK', 'Visit / Session Pack')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS genders (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO genders (code, name) VALUES
    ('MALE', 'Male'),
    ('FEMALE', 'Female'),
    ('NON_BINARY', 'Non-Binary'),
    ('PREFER_NOT_TO_SAY', 'Prefer Not to Say')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS membership_statuses (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO membership_statuses (code, name) VALUES
    ('ACTIVE', 'Active'),
    ('FROZEN', 'Frozen / On Hold'),
    ('EXPIRED', 'Expired'),
    ('CANCELLED', 'Cancelled / Voided')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_methods (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO payment_methods (code, name) VALUES
    ('CASH', 'Cash'),
    ('DIGITAL_WALLET', 'QR Digital Wallet (GCash / Maya)'),
    ('CARD', 'Debit / Credit Card')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_statuses (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL
);

INSERT INTO payment_statuses (code, name) VALUES
    ('COMPLETED', 'Completed'),
    ('VOIDED', 'Voided / Cancelled')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. Entity & Transactional Tables (UUID Primary Keys via gen_random_uuid())
-- ============================================================================

-- Module 1: Staff Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_code VARCHAR(30) NOT NULL REFERENCES roles(code),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Module 2: Membership Plans & Visit Packs
CREATE TABLE IF NOT EXISTS membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(40) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    plan_type_code VARCHAR(30) NOT NULL REFERENCES plan_types(code),
    duration_days INT NOT NULL CHECK (duration_days BETWEEN 1 AND 3650),
    included_sessions INT CHECK (
        (plan_type_code = 'SESSION_PACK' AND included_sessions BETWEEN 1 AND 1000) OR
        (plan_type_code IN ('DAY_PASS', 'RECURRING') AND included_sessions IS NULL)
    ),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    badge_color_hex VARCHAR(20) NOT NULL DEFAULT '#2563EB',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plans_active ON membership_plans(is_active, plan_type_code);

-- Module 3: Members & Subscriptions
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255),
    gender_code VARCHAR(30) NOT NULL REFERENCES genders(code),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(30),
    notes TEXT,
    total_visits INT NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
    last_check_in_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_code ON members(member_code);

CREATE TABLE IF NOT EXISTS member_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    plan_id UUID NOT NULL REFERENCES membership_plans(id),
    status_code VARCHAR(30) NOT NULL REFERENCES membership_statuses(code),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    total_sessions INT,
    remaining_sessions INT CHECK (remaining_sessions IS NULL OR remaining_sessions >= 0),
    plan_price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (plan_price_at_purchase >= 0),
    frozen_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_status ON member_subscriptions(member_id, status_code, end_date DESC);

-- Module 4: Immutable Attendance & Usage Logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    subscription_id UUID REFERENCES member_subscriptions(id),
    check_in_method VARCHAR(20) NOT NULL CHECK (
        check_in_method IN ('KIOSK_CODE', 'KIOSK_PHONE', 'KIOSK_QR', 'STAFF_LOOKUP')
    ),
    access_status VARCHAR(30) NOT NULL CHECK (
        access_status IN ('GRANTED', 'DENIED_EXPIRED', 'DENIED_FROZEN', 'DENIED_NO_PLAN')
    ),
    remaining_days_at_checkin INT,
    remaining_sessions_at_checkin INT,
    checked_in_by UUID REFERENCES users(id),
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_attendance_member_time ON attendance_logs(member_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_time_status ON attendance_logs(check_in_at DESC, access_status);

-- Module 5: Membership Payments & 12% BIR VAT-Inclusive Invoices
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(40) UNIQUE NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id),
    subscription_id UUID NOT NULL REFERENCES member_subscriptions(id),
    plan_name_snapshot VARCHAR(100) NOT NULL,
    cashier_id UUID NOT NULL REFERENCES users(id),
    payment_method_code VARCHAR(30) NOT NULL REFERENCES payment_methods(code),
    subtotal_amount NUMERIC(12, 2) NOT NULL,
    discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (discount_pct BETWEEN 0 AND 100),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL CHECK (tax_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    amount_tendered NUMERIC(12, 2) NOT NULL CHECK (amount_tendered >= total_amount),
    change_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (change_amount >= 0),
    payment_ref VARCHAR(100),
    status_code VARCHAR(30) NOT NULL REFERENCES payment_statuses(code),
    void_reason TEXT,
    voided_by UUID REFERENCES users(id),
    voided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_created_status ON payments(created_at DESC, status_code);
CREATE INDEX IF NOT EXISTS idx_payments_member ON payments(member_id);

-- Module 6: Singleton Gym Settings (id = 1)
CREATE TABLE IF NOT EXISTS store_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    gym_name VARCHAR(120) NOT NULL DEFAULT 'Mad Max Gym',
    address TEXT NOT NULL DEFAULT 'BGC High Street, Taguig City, Metro Manila',
    phone VARCHAR(40) NOT NULL DEFAULT '+63 917 555 0199',
    tin_number VARCHAR(40) DEFAULT '000-123-456-000 VAT',
    tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 12.00 CHECK (tax_rate_pct BETWEEN 0 AND 50),
    receipt_header TEXT DEFAULT 'MAD MAX GYM • TRAIN HARD • SIGN IN FAST',
    receipt_footer TEXT DEFAULT 'Keep your receipt or QR pass to sign in at the front desk kiosk!',
    discount_tiers JSONB NOT NULL DEFAULT '[
        {"id": "disc-student", "name": "Student", "pct": 10, "is_active": true},
        {"id": "disc-senior", "name": "Senior / PWD", "pct": 20, "is_active": true}
    ]'::jsonb,
    payment_qr_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
