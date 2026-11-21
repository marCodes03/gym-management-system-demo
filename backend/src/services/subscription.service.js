const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const { isValidUuid } = require('../utils/validators');

/**
 * Transitions any stale ACTIVE subscriptions to EXPIRED where
 * CURRENT_DATE > end_date OR remaining_sessions <= 0.
 */
async function expireStaleSubscriptions(executor = db, memberId = null) {
  if (memberId) {
    await executor.query(
      `UPDATE member_subscriptions
       SET status_code = 'EXPIRED', updated_at = NOW()
       WHERE member_id = $1
         AND status_code = 'ACTIVE'
         AND (
           CURRENT_DATE > end_date
           OR (remaining_sessions IS NOT NULL AND remaining_sessions <= 0)
         )`,
      [memberId]
    );
  } else {
    await executor.query(
      `UPDATE member_subscriptions
       SET status_code = 'EXPIRED', updated_at = NOW()
       WHERE status_code = 'ACTIVE'
         AND (
           CURRENT_DATE > end_date
           OR (remaining_sessions IS NOT NULL AND remaining_sessions <= 0)
         )`
    );
  }
}

/**
 * Freezes an ACTIVE recurring or session-pack subscription inside an ACID transaction.
 */
async function freezeSubscription(subscriptionId) {
  if (!isValidUuid(subscriptionId)) {
    throw new AppError('Subscription record not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT
          ms.id,
          ms.member_id,
          ms.plan_id,
          ms.status_code,
          ms.start_date,
          ms.end_date,
          ms.total_sessions,
          ms.remaining_sessions,
          ms.frozen_at,
          mp.plan_type_code,
          mp.name AS plan_name,
          m.name AS member_name
       FROM member_subscriptions ms
       JOIN membership_plans mp ON mp.id = ms.plan_id
       JOIN members m ON m.id = ms.member_id
       WHERE ms.id = $1
       FOR UPDATE OF ms`,
      [subscriptionId]
    );

    if (rows.length === 0) {
      throw new AppError('Subscription record not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const sub = rows[0];

    // Check if already expired by date or session count before freezing
    const { rows: dateCheck } = await client.query(
      `SELECT (CURRENT_DATE > $1::DATE) AS is_date_past`,
      [sub.end_date]
    );
    if (
      sub.status_code === 'ACTIVE' &&
      (dateCheck[0].is_date_past ||
        (sub.remaining_sessions !== null && sub.remaining_sessions <= 0))
    ) {
      await client.query(
        `UPDATE member_subscriptions SET status_code = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
        [subscriptionId]
      );
      throw new AppError(
        'Only active recurring memberships or visit packs can be frozen.',
        400,
        'INVALID_SUBSCRIPTION_STATE'
      );
    }

    if (sub.status_code !== 'ACTIVE' || sub.plan_type_code === 'DAY_PASS') {
      throw new AppError(
        'Only active recurring memberships or visit packs can be frozen.',
        400,
        'INVALID_SUBSCRIPTION_STATE'
      );
    }

    const { rows: updated } = await client.query(
      `UPDATE member_subscriptions
       SET status_code = 'FROZEN',
           frozen_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, member_id, plan_id, status_code, start_date, end_date,
                 total_sessions, remaining_sessions, plan_price_at_purchase, frozen_at, updated_at`,
      [subscriptionId]
    );

    return {
      ...updated[0],
      plan_name: sub.plan_name,
      plan_type_code: sub.plan_type_code,
      member_name: sub.member_name,
      message: `Membership for ${sub.member_name} is now frozen. Check-in is paused until unfrozen.`,
    };
  });
}

/**
 * Unfreezes a FROZEN subscription, computes frozen_days, extends end_date,
 * clears frozen_at, and restores status_code = 'ACTIVE' inside an ACID transaction.
 */
async function unfreezeSubscription(subscriptionId) {
  if (!isValidUuid(subscriptionId)) {
    throw new AppError('Subscription record not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT
          ms.id,
          ms.member_id,
          ms.plan_id,
          ms.status_code,
          ms.start_date,
          ms.end_date,
          ms.total_sessions,
          ms.remaining_sessions,
          ms.frozen_at,
          mp.plan_type_code,
          mp.name AS plan_name,
          m.name AS member_name,
          GREATEST(0, (CURRENT_DATE - DATE(COALESCE(ms.frozen_at, NOW()))))::INT AS frozen_days
       FROM member_subscriptions ms
       JOIN membership_plans mp ON mp.id = ms.plan_id
       JOIN members m ON m.id = ms.member_id
       WHERE ms.id = $1
       FOR UPDATE OF ms`,
      [subscriptionId]
    );

    if (rows.length === 0) {
      throw new AppError('Subscription record not found.', 404, 'SUBSCRIPTION_NOT_FOUND');
    }

    const sub = rows[0];
    if (sub.status_code !== 'FROZEN') {
      throw new AppError(
        'Only a frozen membership can be unfrozen.',
        400,
        'INVALID_SUBSCRIPTION_STATE'
      );
    }

    const frozenDays = sub.frozen_days;

    const { rows: updated } = await client.query(
      `UPDATE member_subscriptions
       SET status_code = 'ACTIVE',
           end_date = (end_date + ($2 * INTERVAL '1 day'))::DATE,
           frozen_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, member_id, plan_id, status_code, start_date, end_date,
                 total_sessions, remaining_sessions, plan_price_at_purchase, frozen_at, updated_at`,
      [subscriptionId, frozenDays]
    );

    const updatedSub = updated[0];
    const formattedEndDate =
      updatedSub.end_date instanceof Date
        ? updatedSub.end_date.toISOString().slice(0, 10)
        : String(updatedSub.end_date).slice(0, 10);

    return {
      ...updatedSub,
      plan_name: sub.plan_name,
      plan_type_code: sub.plan_type_code,
      member_name: sub.member_name,
      frozen_days: frozenDays,
      message: `Membership unfrozen! Expiration date extended by ${frozenDays} day(s) to ${formattedEndDate}.`,
    };
  });
}

module.exports = {
  expireStaleSubscriptions,
  freezeSubscription,
  unfreezeSubscription,
};
