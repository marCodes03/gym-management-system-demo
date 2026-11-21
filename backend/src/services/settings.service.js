const crypto = require('crypto');
const db = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const { isValidPhone } = require('../utils/validators');

const VALID_QR_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;
const VALID_HTTP_URL_REGEX = /^https?:\/\/.+/i;
const MAX_QR_BYTES = 2 * 1024 * 1024; // 2 MB

function formatSettingsRow(row) {
  return {
    ...row,
    tax_rate_pct: Number(row.tax_rate_pct),
    discount_tiers: Array.isArray(row.discount_tiers) ? row.discount_tiers : [],
    payment_qr_codes: Array.isArray(row.payment_qr_codes) ? row.payment_qr_codes : [],
  };
}

function validateDiscountTiers(tiers) {
  if (!Array.isArray(tiers)) {
    throw new AppError('Discount tiers must be a valid list.', 400, 'VALIDATION_ERROR');
  }

  return tiers.map((tier) => {
    const name = typeof tier?.name === 'string' ? tier.name.trim() : '';
    if (name.length < 2 || name.length > 40) {
      throw new AppError(
        'Discount tier name must be between 2 and 40 characters (e.g., Student 10%).',
        400,
        'VALIDATION_ERROR'
      );
    }

    const pct = Number(tier?.pct);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) {
      throw new AppError(
        'Discount percentage must be between 1% and 100%.',
        400,
        'VALIDATION_ERROR'
      );
    }

    return {
      id:
        typeof tier.id === 'string' && tier.id.trim()
          ? tier.id.trim()
          : `disc-${crypto.randomBytes(4).toString('hex')}`,
      name,
      pct: Number(pct.toFixed(2)),
      is_active: tier.is_active !== undefined ? Boolean(tier.is_active) : true,
    };
  });
}

function validateQrCodes(qrCodes) {
  if (!Array.isArray(qrCodes)) {
    throw new AppError('Payment QR codes must be a valid list.', 400, 'VALIDATION_ERROR');
  }

  return qrCodes.map((qr) => {
    const provider_name =
      typeof qr?.provider_name === 'string' ? qr.provider_name.trim() : '';
    if (provider_name.length < 2 || provider_name.length > 40) {
      throw new AppError(
        'Please enter a wallet/bank provider name (2 to 40 characters).',
        400,
        'VALIDATION_ERROR'
      );
    }

    const rawAccount = qr?.account_name ?? null;
    let account_name = null;
    if (rawAccount !== null && rawAccount !== undefined && String(rawAccount).trim() !== '') {
      account_name = String(rawAccount).trim();
      if (account_name.length > 80) {
        throw new AppError(
          'Account name cannot exceed 80 characters.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    const image_data = typeof qr?.image_data === 'string' ? qr.image_data.trim() : '';
    if (!image_data) {
      throw new AppError(
        'Please upload a valid PNG, JPG, or WEBP QR image under 2 MB.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (VALID_QR_DATA_URL_REGEX.test(image_data)) {
      const base64Part = image_data.split(',')[1] || '';
      const approxBytes = Math.ceil((base64Part.length * 3) / 4);
      if (approxBytes > MAX_QR_BYTES) {
        throw new AppError(
          'Please upload a valid PNG, JPG, or WEBP QR image under 2 MB.',
          400,
          'VALIDATION_ERROR'
        );
      }
    } else if (!VALID_HTTP_URL_REGEX.test(image_data)) {
      throw new AppError(
        'Please upload a valid PNG, JPG, or WEBP QR image under 2 MB.',
        400,
        'VALIDATION_ERROR'
      );
    }

    return {
      id:
        typeof qr.id === 'string' && qr.id.trim()
          ? qr.id.trim()
          : `qr-${crypto.randomBytes(4).toString('hex')}`,
      provider_name,
      account_name,
      image_data,
    };
  });
}

async function getSettings() {
  const { rows } = await db.query('SELECT * FROM store_settings WHERE id = 1');
  if (rows.length === 0) {
    const inserted = await db.query(
      'INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING RETURNING *'
    );
    if (inserted.rows.length > 0) {
      return formatSettingsRow(inserted.rows[0]);
    }
    const retry = await db.query('SELECT * FROM store_settings WHERE id = 1');
    return formatSettingsRow(retry.rows[0]);
  }
  return formatSettingsRow(rows[0]);
}

async function updateSettings(payload) {
  const current = await getSettings();

  const rawGymName =
    payload.gym_name !== undefined ? payload.gym_name : current.gym_name;
  const gym_name = typeof rawGymName === 'string' ? rawGymName.trim() : '';
  if (gym_name.length < 2 || gym_name.length > 120) {
    throw new AppError(
      'Gym name must be between 2 and 120 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawAddress = payload.address !== undefined ? payload.address : current.address;
  const address = typeof rawAddress === 'string' ? rawAddress.trim() : '';
  if (address.length < 5 || address.length > 250) {
    throw new AppError(
      'Gym address must be between 5 and 250 characters.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawPhone = payload.phone !== undefined ? payload.phone : current.phone;
  const phone = typeof rawPhone === 'string' ? rawPhone.trim() : '';
  if (!isValidPhone(phone)) {
    throw new AppError(
      'Please enter a valid gym contact phone number.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const rawTin =
    payload.tin_number !== undefined ? payload.tin_number : current.tin_number;
  let tin_number = null;
  if (rawTin !== null && rawTin !== undefined && String(rawTin).trim() !== '') {
    tin_number = String(rawTin).trim();
    if (tin_number.length > 40) {
      throw new AppError(
        'TIN number cannot exceed 40 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const rawTax =
    payload.tax_rate_pct !== undefined ? payload.tax_rate_pct : current.tax_rate_pct;
  const parsedTax = Number(rawTax);
  if (!Number.isFinite(parsedTax) || parsedTax < 0 || parsedTax > 50) {
    throw new AppError(
      'Tax rate percentage must be between 0% and 50%.',
      400,
      'VALIDATION_ERROR'
    );
  }
  const tax_rate_pct = Number(parsedTax.toFixed(2));

  const rawHeader =
    payload.receipt_header !== undefined
      ? payload.receipt_header
      : current.receipt_header;
  let receipt_header = null;
  if (rawHeader !== null && rawHeader !== undefined && String(rawHeader).trim() !== '') {
    receipt_header = String(rawHeader).trim();
    if (receipt_header.length > 200) {
      throw new AppError(
        'Receipt header/footer cannot exceed 200 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const rawFooter =
    payload.receipt_footer !== undefined
      ? payload.receipt_footer
      : current.receipt_footer;
  let receipt_footer = null;
  if (rawFooter !== null && rawFooter !== undefined && String(rawFooter).trim() !== '') {
    receipt_footer = String(rawFooter).trim();
    if (receipt_footer.length > 200) {
      throw new AppError(
        'Receipt header/footer cannot exceed 200 characters.',
        400,
        'VALIDATION_ERROR'
      );
    }
  }

  const discount_tiers =
    payload.discount_tiers !== undefined
      ? validateDiscountTiers(payload.discount_tiers)
      : current.discount_tiers;

  const payment_qr_codes =
    payload.payment_qr_codes !== undefined
      ? validateQrCodes(payload.payment_qr_codes)
      : current.payment_qr_codes;

  const { rows } = await db.query(
    `UPDATE store_settings
     SET gym_name = $1,
         address = $2,
         phone = $3,
         tin_number = $4,
         tax_rate_pct = $5,
         receipt_header = $6,
         receipt_footer = $7,
         discount_tiers = $8::jsonb,
         payment_qr_codes = $9::jsonb,
         updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [
      gym_name,
      address,
      phone,
      tin_number,
      tax_rate_pct,
      receipt_header,
      receipt_footer,
      JSON.stringify(discount_tiers),
      JSON.stringify(payment_qr_codes),
    ]
  );

  return formatSettingsRow(rows[0]);
}

async function updateQrCodes(payload) {
  const qrList = Array.isArray(payload) ? payload : payload?.payment_qr_codes;
  const validatedQrs = validateQrCodes(qrList);

  const { rows } = await db.query(
    `UPDATE store_settings
     SET payment_qr_codes = $1::jsonb,
         updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [JSON.stringify(validatedQrs)]
  );

  return {
    ...formatSettingsRow(rows[0]),
    message: 'Payment QR code saved automatically.',
  };
}

module.exports = {
  getSettings,
  updateSettings,
  updateQrCodes,
};
