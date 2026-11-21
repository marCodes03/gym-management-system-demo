const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const { expireStaleSubscriptions } = require('./subscription.service');

const VALID_PERIODS = new Set(['today', '7d', 'month']);

function getPeriodStartSql(period) {
  if (period === 'today') {
    return `CURRENT_DATE::TIMESTAMPTZ`;
  }
  if (period === '7d') {
    return `(CURRENT_DATE - INTERVAL '6 days')::TIMESTAMPTZ`;
  }
  // 'month'
  return `date_trunc('month', CURRENT_DATE)::TIMESTAMPTZ`;
}

function formatHourLabel(hour24) {
  if (hour24 === 0) return '12 AM';
  if (hour24 < 12) return `${hour24} AM`;
  if (hour24 === 12) return '12 PM';
  return `${hour24 - 12} PM`;
}

async function getSummary(query = {}) {
  const rawPeriod = query.period !== undefined ? String(query.period).trim().toLowerCase() : 'today';
  if (!VALID_PERIODS.has(rawPeriod)) {
    throw new AppError(
      'Invalid dashboard timeframe filter. Choose Today, Last 7 Days, or This Month.',
      400,
      'VALIDATION_ERROR'
    );
  }

  await expireStaleSubscriptions(db);

  const periodStartSql = getPeriodStartSql(rawPeriod);

  const [
    usageRes,
    activeMembershipsRes,
    expiringSoonRes,
    peakHoursRes,
    revenueRes,
    paymentMethodSplitRes,
  ] = await Promise.all([
    // 1. Sign-in usage counts (GRANTED vs DENIED)
    db.query(
      `SELECT
          COUNT(*) FILTER (WHERE access_status = 'GRANTED')::INT AS granted_count,
          COUNT(DISTINCT member_id) FILTER (WHERE access_status = 'GRANTED')::INT AS unique_members_visited,
          COUNT(*) FILTER (WHERE access_status <> 'GRANTED')::INT AS denied_count,
          COUNT(*) FILTER (WHERE access_status = 'DENIED_EXPIRED')::INT AS denied_expired_count,
          COUNT(*) FILTER (WHERE access_status = 'DENIED_FROZEN')::INT AS denied_frozen_count,
          COUNT(*) FILTER (WHERE access_status = 'DENIED_NO_PLAN')::INT AS denied_no_plan_count
       FROM attendance_logs
       WHERE check_in_at >= ${periodStartSql}`
    ),

    // 2. Active memberships split (Recurring vs Visit Packs vs Day Pass + Frozen)
    db.query(
      `SELECT
          COUNT(*) FILTER (WHERE ms.status_code = 'ACTIVE')::INT AS total_active,
          COUNT(*) FILTER (WHERE ms.status_code = 'ACTIVE' AND mp.plan_type_code = 'RECURRING')::INT AS recurring_count,
          COUNT(*) FILTER (WHERE ms.status_code = 'ACTIVE' AND mp.plan_type_code = 'SESSION_PACK')::INT AS session_pack_count,
          COUNT(*) FILTER (WHERE ms.status_code = 'ACTIVE' AND mp.plan_type_code = 'DAY_PASS')::INT AS day_pass_count,
          COUNT(*) FILTER (WHERE ms.status_code = 'FROZEN')::INT AS frozen_count
       FROM member_subscriptions ms
       JOIN membership_plans mp ON mp.id = ms.plan_id
       WHERE ms.status_code IN ('ACTIVE', 'FROZEN')`
    ),

    // 3. Expiring Soon Action Table (<= 7 days or <= 2 visits remaining)
    db.query(
      `SELECT
          ms.id AS subscription_id,
          m.id AS member_id,
          m.member_code,
          m.name AS member_name,
          m.phone AS member_phone,
          mp.id AS plan_id,
          mp.code AS plan_code,
          mp.name AS plan_name,
          mp.plan_type_code,
          ms.start_date,
          ms.end_date,
          (ms.end_date - CURRENT_DATE)::INT AS remaining_days,
          ms.total_sessions,
          ms.remaining_sessions
       FROM member_subscriptions ms
       JOIN members m ON m.id = ms.member_id
       JOIN membership_plans mp ON mp.id = ms.plan_id
       WHERE ms.status_code = 'ACTIVE'
         AND m.is_active = TRUE
         AND (
           (ms.end_date - CURRENT_DATE) BETWEEN 0 AND 7
           OR (ms.remaining_sessions IS NOT NULL AND ms.remaining_sessions BETWEEN 1 AND 2)
         )
       ORDER BY
         LEAST(
           COALESCE((ms.end_date - CURRENT_DATE), 9999),
           COALESCE(ms.remaining_sessions, 9999)
         ) ASC,
         ms.end_date ASC`
    ),

    // 4. Peak Check-In Hours (6 AM to 10 PM hourly distribution of GRANTED check-ins)
    db.query(
      `SELECT
          EXTRACT(HOUR FROM check_in_at)::INT AS hour_of_day,
          COUNT(*)::INT AS check_ins
       FROM attendance_logs
       WHERE access_status = 'GRANTED'
         AND check_in_at >= ${periodStartSql}
       GROUP BY hour_of_day
       ORDER BY hour_of_day ASC`
    ),

    // 5. Net revenue + 12% VAT summary (excluding VOIDED from net revenue, reporting voided separately)
    db.query(
      `SELECT
          COUNT(*) FILTER (WHERE status_code = 'COMPLETED')::INT AS completed_count,
          COALESCE(SUM(total_amount) FILTER (WHERE status_code = 'COMPLETED'), 0)::NUMERIC(12,2) AS gross_revenue,
          COALESCE(SUM(subtotal_amount) FILTER (WHERE status_code = 'COMPLETED'), 0)::NUMERIC(12,2) AS net_subtotal,
          COALESCE(SUM(tax_amount) FILTER (WHERE status_code = 'COMPLETED'), 0)::NUMERIC(12,2) AS tax_amount,
          COALESCE(SUM(discount_amount) FILTER (WHERE status_code = 'COMPLETED'), 0)::NUMERIC(12,2) AS discount_amount,
          COUNT(*) FILTER (WHERE status_code = 'VOIDED')::INT AS voided_count,
          COALESCE(SUM(total_amount) FILTER (WHERE status_code = 'VOIDED'), 0)::NUMERIC(12,2) AS voided_amount
       FROM payments
       WHERE created_at >= ${periodStartSql}`
    ),

    // 6. Payment method breakdown for completed payments
    db.query(
      `SELECT
          payment_method_code,
          COUNT(*)::INT AS transaction_count,
          COALESCE(SUM(total_amount), 0)::NUMERIC(12,2) AS total_amount
       FROM payments
       WHERE status_code = 'COMPLETED'
         AND created_at >= ${periodStartSql}
       GROUP BY payment_method_code`
    ),
  ]);

  // Zero-fill Peak Check-In Hours from 6 AM (6) to 10 PM (22)
  const hourMap = new Map(
    peakHoursRes.rows.map((r) => [Number(r.hour_of_day), Number(r.check_ins)])
  );
  const peak_hours = [];
  for (let h = 6; h <= 22; h += 1) {
    peak_hours.push({
      hour: h,
      label: formatHourLabel(h),
      check_ins: hourMap.get(h) || 0,
    });
  }

  const rev = revenueRes.rows[0];
  const byMethod = {};
  for (const row of paymentMethodSplitRes.rows) {
    byMethod[row.payment_method_code] = {
      count: row.transaction_count,
      total: Number(row.total_amount),
    };
  }

  return {
    period: rawPeriod,
    usage: usageRes.rows[0],
    memberships: activeMembershipsRes.rows[0],
    expiring_soon: {
      count: expiringSoonRes.rows.length,
      items: expiringSoonRes.rows,
    },
    peak_hours,
    revenue: {
      completed_count: rev.completed_count,
      gross_revenue: Number(rev.gross_revenue),
      net_subtotal: Number(rev.net_subtotal),
      tax_amount: Number(rev.tax_amount),
      discount_amount: Number(rev.discount_amount),
      voided_count: rev.voided_count,
      voided_amount: Number(rev.voided_amount),
      by_method: byMethod,
    },
  };
}

module.exports = {
  getSummary,
};
