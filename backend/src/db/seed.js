const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('../config/db');

const BCRYPT_ROUNDS = 10;

/**
 * Compute 12% Philippine BIR VAT-inclusive breakdown.
 * VAT = Total - (Total / 1.12)
 */
function computeVatBreakdown(price, discountPct = 0) {
  const discountAmount = Number(((price * discountPct) / 100).toFixed(2));
  const totalAmount = Number((price - discountAmount).toFixed(2));
  const subtotalAmount = Number((totalAmount / 1.12).toFixed(2));
  const taxAmount = Number((totalAmount - subtotalAmount).toFixed(2));
  return {
    discountPct,
    discountAmount,
    subtotalAmount,
    taxAmount,
    totalAmount,
  };
}

/**
 * Helper to format a YYYYMMDD string offset by daysAgo from today (local date).
 */
function formatDateStamp(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/**
 * Build a deterministic UUID for idempotent seed inserts.
 */
function seedUuid(prefixHex, index) {
  const tail = String(index).padStart(12, '0');
  return `${prefixHex}-0000-4000-8000-${tail}`;
}

async function runSeeds() {
  console.log('[seed] Starting Mad Max Gym idempotent database seed...');

  const adminPasswordHash = await bcrypt.hash('Admin123!', BCRYPT_ROUNDS);
  const frontDeskPasswordHash = await bcrypt.hash('Staff123!', BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    // 1. Seed Staff Accounts (ADMIN + FRONT_DESK)
    const staffRecords = [
      {
        name: 'Maximus Cruz',
        email: 'owner@madmaxgym.com',
        password_hash: adminPasswordHash,
        role_code: 'ADMIN',
      },
      {
        name: 'Elena Reyes',
        email: 'frontdesk@madmaxgym.com',
        password_hash: frontDeskPasswordHash,
        role_code: 'FRONT_DESK',
      },
    ];

    const staffByEmail = {};
    for (const staff of staffRecords) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role_code, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (email) DO NOTHING`,
        [staff.name, staff.email, staff.password_hash, staff.role_code]
      );
      const { rows } = await client.query(
        'SELECT id, email FROM users WHERE email = $1',
        [staff.email]
      );
      staffByEmail[staff.email] = rows[0].id;
    }

    const ownerId = staffByEmail['owner@madmaxgym.com'];
    const frontDeskId = staffByEmail['frontdesk@madmaxgym.com'];

    // 2. Seed 7 Mad Max Gym Membership Plans (12% BIR VAT-Inclusive PHP)
    const planRecords = [
      {
        code: 'PASS-DAY',
        name: 'Walk-In Day Pass',
        plan_type_code: 'DAY_PASS',
        duration_days: 1,
        included_sessions: null,
        price: 150.0,
        badge_color_hex: '#4B5563',
        description: 'Single-day unlimited gym floor access for walk-in athletes and guests.',
      },
      {
        code: 'PLAN-WEEKLY',
        name: '7-Day Power Pass',
        plan_type_code: 'RECURRING',
        duration_days: 7,
        included_sessions: null,
        price: 500.0,
        badge_color_hex: '#374151',
        description: 'Seven consecutive days of unlimited gym access and free locker use.',
      },
      {
        code: 'PLAN-MONTHLY',
        name: 'Monthly Unlimited Iron',
        plan_type_code: 'RECURRING',
        duration_days: 30,
        included_sessions: null,
        price: 1500.0,
        badge_color_hex: '#2563EB',
        description: '30-day unlimited access to all free weights, racks, and cardio zones.',
      },
      {
        code: 'PLAN-QUARTERLY',
        name: '90-Day Strength Transformation',
        plan_type_code: 'RECURRING',
        duration_days: 90,
        included_sessions: null,
        price: 4000.0,
        badge_color_hex: '#1D4ED8',
        description: '90 days of unlimited access with priority renewal rate savings.',
      },
      {
        code: 'PLAN-ANNUAL',
        name: '365-Day Mad Max VIP',
        plan_type_code: 'RECURRING',
        duration_days: 365,
        included_sessions: null,
        price: 14000.0,
        badge_color_hex: '#0B0D11',
        description: 'Full-year VIP unlimited membership with complimentary freeze privileges.',
      },
      {
        code: 'PACK-10-VISITS',
        name: '10-Visit Flex Pack',
        plan_type_code: 'SESSION_PACK',
        duration_days: 90,
        included_sessions: 10,
        price: 1200.0,
        badge_color_hex: '#2563EB',
        description: '10 flexible gym visits valid for 90 days from activation.',
      },
      {
        code: 'PACK-20-VISITS',
        name: '20-Visit Warrior Pack',
        plan_type_code: 'SESSION_PACK',
        duration_days: 180,
        included_sessions: 20,
        price: 2200.0,
        badge_color_hex: '#1D4ED8',
        description: '20 flexible gym visits valid for 180 days — ideal for hybrid athletes.',
      },
    ];

    const planByCode = {};
    for (const plan of planRecords) {
      await client.query(
        `INSERT INTO membership_plans
          (code, name, plan_type_code, duration_days, included_sessions, price, badge_color_hex, description, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (code) DO NOTHING`,
        [
          plan.code,
          plan.name,
          plan.plan_type_code,
          plan.duration_days,
          plan.included_sessions,
          plan.price,
          plan.badge_color_hex,
          plan.description,
        ]
      );
      const { rows } = await client.query(
        'SELECT id, code, name, price, duration_days, included_sessions FROM membership_plans WHERE code = $1',
        [plan.code]
      );
      planByCode[plan.code] = rows[0];
    }

    // 3. Seed 12 Realistic Gym Members across ACTIVE, EXPIRING SOON, FROZEN, and EXPIRED
    const memberFixtures = [
      // --- ACTIVE (4) ---
      {
        idx: 1,
        member_code: 'MEM-2026-0001',
        name: 'Marcus Reyes',
        phone: '09171000001',
        email: 'marcus.reyes@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Carla Reyes',
        emergency_contact_phone: '09179990001',
        notes: 'Prefers morning powerlifting sessions (6 AM - 8 AM).',
        planCode: 'PLAN-MONTHLY',
        status_code: 'ACTIVE',
        startOffsetDays: -10,
        endOffsetDays: 20,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 0, // Today (recent renewal / sale)
        cashierId: frontDeskId,
      },
      {
        idx: 2,
        member_code: 'MEM-2026-0002',
        name: 'Sofia Mendoza',
        phone: '09171000002',
        email: 'sofia.mendoza@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Luis Mendoza',
        emergency_contact_phone: '09179990002',
        notes: 'Competitive cross-training athlete.',
        planCode: 'PLAN-QUARTERLY',
        status_code: 'ACTIVE',
        startOffsetDays: -25,
        endOffsetDays: 65,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'DIGITAL_WALLET',
        paymentRef: 'GCash REF-884210',
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 2,
        cashierId: frontDeskId,
      },
      {
        idx: 3,
        member_code: 'MEM-2026-0003',
        name: 'Rafael Tan',
        phone: '09171000003',
        email: 'rafael.tan@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Grace Tan',
        emergency_contact_phone: '09179990003',
        notes: 'VIP Annual member, permanent locker #14.',
        planCode: 'PLAN-ANNUAL',
        status_code: 'ACTIVE',
        startOffsetDays: -45,
        endOffsetDays: 320,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'DIGITAL_WALLET',
        paymentRef: 'Maya REF-550192',
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 5,
        cashierId: ownerId,
      },
      {
        idx: 4,
        member_code: 'MEM-2026-0004',
        name: 'Camille Bautista',
        phone: '09171000004',
        email: 'camille.bautista@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Marco Bautista',
        emergency_contact_phone: '09179990004',
        notes: 'Hybrid runner using 20-visit pack 3x/week.',
        planCode: 'PACK-20-VISITS',
        status_code: 'ACTIVE',
        startOffsetDays: -20,
        endOffsetDays: 160,
        total_sessions: 20,
        remaining_sessions: 14,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 10, // Student 10%
        tenderedExtra: 20,
        paidDaysAgo: 1,
        cashierId: frontDeskId,
      },

      // --- EXPIRING SOON (4: <= 3 days left or <= 2 visits left) ---
      {
        idx: 5,
        member_code: 'MEM-2026-0005',
        name: 'Diego Villanueva',
        phone: '09171000005',
        email: 'diego.villanueva@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Teresa Villanueva',
        emergency_contact_phone: '09179990005',
        notes: 'Monthly plan expires in 2 days — interested in Quarterly upgrade.',
        planCode: 'PLAN-MONTHLY',
        status_code: 'ACTIVE',
        startOffsetDays: -28,
        endOffsetDays: 2,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 500,
        paidDaysAgo: 12,
        cashierId: frontDeskId,
      },
      {
        idx: 6,
        member_code: 'MEM-2026-0006',
        name: 'Bianca Cruz',
        phone: '09171000006',
        email: 'bianca.cruz@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Noel Cruz',
        emergency_contact_phone: '09179990006',
        notes: '7-day trial pass ending tomorrow.',
        planCode: 'PLAN-WEEKLY',
        status_code: 'ACTIVE',
        startOffsetDays: -6,
        endOffsetDays: 1,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'DIGITAL_WALLET',
        paymentRef: 'GCash REF-772104',
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 6,
        cashierId: frontDeskId,
      },
      {
        idx: 7,
        member_code: 'MEM-2026-0007',
        name: 'Paolo Lim',
        phone: '09171000007',
        email: 'paolo.lim@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Helen Lim',
        emergency_contact_phone: '09179990007',
        notes: 'Only 2 visits remaining on 10-Visit Flex Pack.',
        planCode: 'PACK-10-VISITS',
        status_code: 'ACTIVE',
        startOffsetDays: -35,
        endOffsetDays: 55,
        total_sessions: 10,
        remaining_sessions: 2,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 300,
        paidDaysAgo: 18,
        cashierId: ownerId,
      },
      {
        idx: 8,
        member_code: 'MEM-2026-0008',
        name: 'Andrea Santos',
        phone: '09171000008',
        email: 'andrea.santos@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Ramon Santos',
        emergency_contact_phone: '09179990008',
        notes: 'Down to final visit on 10-Visit Flex Pack.',
        planCode: 'PACK-10-VISITS',
        status_code: 'ACTIVE',
        startOffsetDays: -40,
        endOffsetDays: 50,
        total_sessions: 10,
        remaining_sessions: 1,
        frozenOffsetDays: null,
        paymentMethod: 'DIGITAL_WALLET',
        paymentRef: 'Maya REF-331849',
        discountPct: 20, // Senior / PWD 20%
        tenderedExtra: 0,
        paidDaysAgo: 0, // Today
        cashierId: frontDeskId,
      },

      // --- FROZEN (2) ---
      {
        idx: 9,
        member_code: 'MEM-2026-0009',
        name: 'Gabriel Aquino',
        phone: '09171000009',
        email: 'gabriel.aquino@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Liza Aquino',
        emergency_contact_phone: '09179990009',
        notes: 'Frozen due to business travel in Cebu.',
        planCode: 'PLAN-QUARTERLY',
        status_code: 'FROZEN',
        startOffsetDays: -30,
        endOffsetDays: 60,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: -4,
        paymentMethod: 'DIGITAL_WALLET',
        paymentRef: 'GCash REF-661029',
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 15,
        cashierId: ownerId,
      },
      {
        idx: 10,
        member_code: 'MEM-2026-0010',
        name: 'Alyssa Soriano',
        phone: '09171000010',
        email: 'alyssa.soriano@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Jun Soriano',
        emergency_contact_phone: '09179990010',
        notes: 'Short 1-week freeze for minor ankle recovery.',
        planCode: 'PLAN-MONTHLY',
        status_code: 'FROZEN',
        startOffsetDays: -15,
        endOffsetDays: 15,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: -2,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 0,
        paidDaysAgo: 14,
        cashierId: frontDeskId,
      },

      // --- EXPIRED (2) ---
      {
        idx: 11,
        member_code: 'MEM-2026-0011',
        name: 'Miguel Navarro',
        phone: '09171000011',
        email: 'miguel.navarro@example.com',
        gender_code: 'MALE',
        emergency_contact_name: 'Rosa Navarro',
        emergency_contact_phone: '09179990011',
        notes: 'Monthly plan expired 5 days ago; follow up for renewal.',
        planCode: 'PLAN-MONTHLY',
        status_code: 'EXPIRED',
        startOffsetDays: -35,
        endOffsetDays: -5,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 500,
        paidDaysAgo: 25,
        cashierId: frontDeskId,
      },
      {
        idx: 12,
        member_code: 'MEM-2026-0012',
        name: 'Trisha Gomez',
        phone: '09171000012',
        email: 'trisha.gomez@example.com',
        gender_code: 'FEMALE',
        emergency_contact_name: 'Dennis Gomez',
        emergency_contact_phone: '09179990012',
        notes: 'Walk-in Day Pass guest from 3 days ago.',
        planCode: 'PASS-DAY',
        status_code: 'EXPIRED',
        startOffsetDays: -3,
        endOffsetDays: -3,
        total_sessions: null,
        remaining_sessions: null,
        frozenOffsetDays: null,
        paymentMethod: 'CASH',
        paymentRef: null,
        discountPct: 0,
        tenderedExtra: 50,
        paidDaysAgo: 3,
        cashierId: frontDeskId,
      },
    ];

    const memberByCode = {};
    const subByMemberCode = {};

    for (const m of memberFixtures) {
      await client.query(
        `INSERT INTO members
          (member_code, name, phone, email, gender_code, emergency_contact_name, emergency_contact_phone, notes, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
         ON CONFLICT (member_code) DO NOTHING`,
        [
          m.member_code,
          m.name,
          m.phone,
          m.email,
          m.gender_code,
          m.emergency_contact_name,
          m.emergency_contact_phone,
          m.notes,
        ]
      );

      const { rows: mRows } = await client.query(
        'SELECT id, member_code FROM members WHERE member_code = $1',
        [m.member_code]
      );
      const memberId = mRows[0].id;
      memberByCode[m.member_code] = memberId;

      const plan = planByCode[m.planCode];
      const subId = seedUuid('11111111', m.idx);
      subByMemberCode[m.member_code] = subId;

      await client.query(
        `INSERT INTO member_subscriptions
          (id, member_id, plan_id, status_code, start_date, end_date, total_sessions, remaining_sessions, plan_price_at_purchase, frozen_at, created_by)
         VALUES (
          $1, $2, $3, $4,
          CURRENT_DATE + ($5 * INTERVAL '1 day'),
          CURRENT_DATE + ($6 * INTERVAL '1 day'),
          $7, $8, $9,
          CASE WHEN $10::INT IS NOT NULL THEN NOW() + ($10::INT * INTERVAL '1 day') ELSE NULL END,
          $11
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          subId,
          memberId,
          plan.id,
          m.status_code,
          m.startOffsetDays,
          m.endOffsetDays,
          m.total_sessions,
          m.remaining_sessions,
          Number(plan.price),
          m.frozenOffsetDays,
          m.cashierId,
        ]
      );

      // Seed corresponding Payment with exact 12% BIR VAT-inclusive math
      const payId = seedUuid('22222222', m.idx);
      const vat = computeVatBreakdown(Number(plan.price), m.discountPct);
      const amountTendered = Number((vat.totalAmount + m.tenderedExtra).toFixed(2));
      const changeAmount = Number((amountTendered - vat.totalAmount).toFixed(2));
      const invoiceNumber = `INV-${formatDateStamp(m.paidDaysAgo)}-${String(m.idx).padStart(4, '0')}`;

      await client.query(
        `INSERT INTO payments
          (id, invoice_number, member_id, subscription_id, plan_name_snapshot, cashier_id, payment_method_code,
           subtotal_amount, discount_pct, discount_amount, tax_amount, total_amount, amount_tendered, change_amount,
           payment_ref, status_code, created_at)
         VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          $15, 'COMPLETED',
          NOW() - ($16 * INTERVAL '1 day')
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          payId,
          invoiceNumber,
          memberId,
          subId,
          plan.name,
          m.cashierId,
          m.paymentMethod,
          vat.subtotalAmount,
          vat.discountPct,
          vat.discountAmount,
          vat.taxAmount,
          vat.totalAmount,
          amountTendered,
          changeAmount,
          m.paymentRef,
          m.paidDaysAgo,
        ]
      );
    }

    // 4. Seed Realistic Attendance Logs across Today & Last 7 Days
    // hoursOffset places check-ins across morning/noon/evening peak gym hours
    const attendanceFixtures = [
      // Today's check-ins (using CURRENT_DATE + hour intervals so Peak Hours chart populates cleanly)
      { idx: 1, code: 'MEM-2026-0001', daysAgo: 0, hour: 6, min: 15, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 20, remSess: null, staff: null, notes: 'Early morning strength session' },
      { idx: 2, code: 'MEM-2026-0002', daysAgo: 0, hour: 7, min: 20, method: 'KIOSK_QR', status: 'GRANTED', remDays: 65, remSess: null, staff: null, notes: null },
      { idx: 3, code: 'MEM-2026-0003', daysAgo: 0, hour: 8, min: 5, method: 'KIOSK_QR', status: 'GRANTED', remDays: 320, remSess: null, staff: null, notes: null },
      { idx: 4, code: 'MEM-2026-0004', daysAgo: 0, hour: 9, min: 30, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 160, remSess: 14, staff: null, notes: null },
      { idx: 5, code: 'MEM-2026-0005', daysAgo: 0, hour: 12, min: 10, method: 'STAFF_LOOKUP', status: 'GRANTED', remDays: 2, remSess: null, staff: frontDeskId, notes: 'Reminded member about renewal in 2 days' },
      { idx: 6, code: 'MEM-2026-0007', daysAgo: 0, hour: 14, min: 45, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 55, remSess: 2, staff: null, notes: null },
      { idx: 7, code: 'MEM-2026-0008', daysAgo: 0, hour: 15, min: 15, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 50, remSess: 1, staff: null, notes: null },
      { idx: 8, code: 'MEM-2026-0009', daysAgo: 0, hour: 10, min: 5, method: 'KIOSK_CODE', status: 'DENIED_FROZEN', remDays: 60, remSess: null, staff: null, notes: 'Subscription currently frozen' },
      { idx: 9, code: 'MEM-2026-0011', daysAgo: 0, hour: 11, min: 40, method: 'KIOSK_PHONE', status: 'DENIED_EXPIRED', remDays: -5, remSess: null, staff: null, notes: 'Membership expired 5 days ago' },

      // Yesterday (daysAgo: 1) — Evening peak + morning
      { idx: 10, code: 'MEM-2026-0001', daysAgo: 1, hour: 6, min: 30, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 21, remSess: null, staff: null, notes: null },
      { idx: 11, code: 'MEM-2026-0002', daysAgo: 1, hour: 17, min: 30, method: 'KIOSK_QR', status: 'GRANTED', remDays: 66, remSess: null, staff: null, notes: null },
      { idx: 12, code: 'MEM-2026-0003', daysAgo: 1, hour: 18, min: 15, method: 'KIOSK_QR', status: 'GRANTED', remDays: 321, remSess: null, staff: null, notes: null },
      { idx: 13, code: 'MEM-2026-0005', daysAgo: 1, hour: 18, min: 45, method: 'STAFF_LOOKUP', status: 'GRANTED', remDays: 3, remSess: null, staff: frontDeskId, notes: null },
      { idx: 14, code: 'MEM-2026-0006', daysAgo: 1, hour: 19, min: 10, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 2, remSess: null, staff: null, notes: null },

      // 2 Days Ago
      { idx: 15, code: 'MEM-2026-0001', daysAgo: 2, hour: 7, min: 0, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 22, remSess: null, staff: null, notes: null },
      { idx: 16, code: 'MEM-2026-0004', daysAgo: 2, hour: 17, min: 50, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 162, remSess: 15, staff: null, notes: null },
      { idx: 17, code: 'MEM-2026-0007', daysAgo: 2, hour: 18, min: 20, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 57, remSess: 3, staff: null, notes: null },
      { idx: 18, code: 'MEM-2026-0008', daysAgo: 2, hour: 19, min: 5, method: 'KIOSK_QR', status: 'GRANTED', remDays: 52, remSess: 2, staff: null, notes: null },

      // 3 Days Ago
      { idx: 19, code: 'MEM-2026-0002', daysAgo: 3, hour: 8, min: 10, method: 'KIOSK_QR', status: 'GRANTED', remDays: 68, remSess: null, staff: null, notes: null },
      { idx: 20, code: 'MEM-2026-0003', daysAgo: 3, hour: 17, min: 15, method: 'KIOSK_QR', status: 'GRANTED', remDays: 323, remSess: null, staff: null, notes: null },
      { idx: 21, code: 'MEM-2026-0006', daysAgo: 3, hour: 18, min: 30, method: 'STAFF_LOOKUP', status: 'GRANTED', remDays: 4, remSess: null, staff: frontDeskId, notes: null },
      { idx: 22, code: 'MEM-2026-0012', daysAgo: 3, hour: 14, min: 0, method: 'STAFF_LOOKUP', status: 'GRANTED', remDays: 0, remSess: null, staff: frontDeskId, notes: 'Walk-in Day Pass auto check-in' },

      // 4-6 Days Ago
      { idx: 23, code: 'MEM-2026-0001', daysAgo: 4, hour: 6, min: 45, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 24, remSess: null, staff: null, notes: null },
      { idx: 24, code: 'MEM-2026-0004', daysAgo: 4, hour: 18, min: 5, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 164, remSess: 16, staff: null, notes: null },
      { idx: 25, code: 'MEM-2026-0005', daysAgo: 5, hour: 19, min: 25, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 7, remSess: null, staff: null, notes: null },
      { idx: 26, code: 'MEM-2026-0006', daysAgo: 5, hour: 17, min: 40, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 6, remSess: null, staff: null, notes: null },
      { idx: 27, code: 'MEM-2026-0010', daysAgo: 5, hour: 16, min: 20, method: 'KIOSK_QR', status: 'GRANTED', remDays: 20, remSess: null, staff: null, notes: 'Last visit prior to freeze' },
      { idx: 28, code: 'MEM-2026-0009', daysAgo: 6, hour: 18, min: 0, method: 'KIOSK_CODE', status: 'GRANTED', remDays: 66, remSess: null, staff: null, notes: 'Last visit prior to travel freeze' },
      { idx: 29, code: 'MEM-2026-0003', daysAgo: 6, hour: 7, min: 30, method: 'KIOSK_QR', status: 'GRANTED', remDays: 326, remSess: null, staff: null, notes: null },
      { idx: 30, code: 'MEM-2026-0011', daysAgo: 6, hour: 18, min: 50, method: 'KIOSK_PHONE', status: 'GRANTED', remDays: 1, remSess: null, staff: null, notes: 'Last visit before expiration' },
    ];

    for (const log of attendanceFixtures) {
      const logId = seedUuid('33333333', log.idx);
      const memberId = memberByCode[log.code];
      const subId = subByMemberCode[log.code];

      await client.query(
        `INSERT INTO attendance_logs
          (id, member_id, subscription_id, check_in_method, access_status,
           remaining_days_at_checkin, remaining_sessions_at_checkin, checked_in_by, check_in_at, notes)
         VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          (CURRENT_DATE - ($9 * INTERVAL '1 day')) + ($10 * INTERVAL '1 hour') + ($11 * INTERVAL '1 minute'),
          $12
         )
         ON CONFLICT (id) DO NOTHING`,
        [
          logId,
          memberId,
          subId,
          log.method,
          log.status,
          log.remDays,
          log.remSess,
          log.staff,
          log.daysAgo,
          log.hour,
          log.min,
          log.notes,
        ]
      );
    }

    // 5. Sync members.total_visits and members.last_check_in_at from GRANTED attendance_logs
    await client.query(`
      UPDATE members m
      SET
        total_visits = COALESCE(agg.visit_count, 0),
        last_check_in_at = agg.last_visit
      FROM (
        SELECT
          member_id,
          COUNT(*)::INT AS visit_count,
          MAX(check_in_at) AS last_visit
        FROM attendance_logs
        WHERE access_status = 'GRANTED'
        GROUP BY member_id
      ) agg
      WHERE m.id = agg.member_id;
    `);

    // 6. Advance PostgreSQL sequences safely past seeded records to avoid 23505 collisions
    await client.query(`
      SELECT setval(
        'member_code_seq',
        GREATEST((SELECT COUNT(*) FROM members), 12),
        TRUE
      );
    `);
    await client.query(`
      SELECT setval(
        'invoice_number_seq',
        GREATEST((SELECT COUNT(*) FROM payments), 12),
        TRUE
      );
    `);
  });

  console.log('[seed] Mad Max Gym database seeded successfully (idempotent).');
}

runSeeds()
  .catch((err) => {
    console.error('[seed] Seeding failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
