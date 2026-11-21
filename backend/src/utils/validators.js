const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_FORMAT_REGEX = /^[0-9+\-\s()]{7,20}$/;
const PLAN_CODE_REGEX = /^[A-Z0-9-]+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 255 && EMAIL_REGEX.test(trimmed);
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 72) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!PHONE_FORMAT_REGEX.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function normalizePhone(phone) {
  return String(phone || '').trim();
}

function stripPhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isValidPlanCode(code) {
  if (typeof code !== 'string') return false;
  const upper = code.trim().toUpperCase();
  return upper.length >= 3 && upper.length <= 40 && PLAN_CODE_REGEX.test(upper);
}

function isValidHexColor(hex) {
  return typeof hex === 'string' && HEX_COLOR_REGEX.test(hex.trim());
}

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id.trim());
}

function isValidIsoDate(dateStr) {
  if (typeof dateStr !== 'string' || !ISO_DATE_REGEX.test(dateStr.trim())) {
    return false;
  }
  const d = new Date(`${dateStr.trim()}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(dateStr.trim());
}

/**
 * Compute Philippine BIR 12% VAT-inclusive breakdown.
 * VAT = Total - round(Total / (1 + taxRate / 100), 2)
 */
function computeVatBreakdown(price, discountPct = 0, taxRatePct = 12) {
  const numericPrice = Number(price);
  const numericDiscountPct = Number(discountPct || 0);
  const numericTaxRate = Number(taxRatePct ?? 12);

  const discountAmount = Number(((numericPrice * numericDiscountPct) / 100).toFixed(2));
  const totalAmount = Number((numericPrice - discountAmount).toFixed(2));
  const divisor = 1 + numericTaxRate / 100;
  const subtotalAmount = Number((totalAmount / divisor).toFixed(2));
  const taxAmount = Number((totalAmount - subtotalAmount).toFixed(2));

  return {
    discountPct: numericDiscountPct,
    discountAmount,
    subtotalAmount,
    taxAmount,
    totalAmount,
  };
}

function parsePagination(query = {}, defaultLimit = 20, maxLimit = 100) {
  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginationMeta(total, page, limit) {
  const numericTotal = Number(total || 0);
  const totalPages = Math.max(1, Math.ceil(numericTotal / limit));
  return {
    total: numericTotal,
    page,
    limit,
    totalPages,
    hasMore: page < totalPages,
  };
}

function formatPhp(amount) {
  return Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  normalizePhone,
  stripPhoneDigits,
  isValidPlanCode,
  isValidHexColor,
  isValidUuid,
  isValidIsoDate,
  computeVatBreakdown,
  parsePagination,
  buildPaginationMeta,
  formatPhp,
};
