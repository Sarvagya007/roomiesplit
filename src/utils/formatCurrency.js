/** Display-only formatting. Never feed formatted output back into arithmetic. */

/** Format integer paise as ₹1,234.50 (Indian digit grouping). */
export function formatCurrency(paise, { showSign = false } = {}) {
  if (!Number.isSafeInteger(paise)) throw new TypeError(`formatCurrency expects integer paise, got ${paise}`);
  const abs = Math.abs(paise);
  const rupees = Math.floor(abs / 100).toLocaleString('en-IN');
  const frac = String(abs % 100).padStart(2, '0');
  const sign = paise < 0 ? '-' : showSign && paise > 0 ? '+' : '';
  return `${sign}₹${rupees}.${frac}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Consistent date display: 12 Oct 2026. Parsed from the string, so there are no timezone shifts. */
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return iso || '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function formatMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym ?? '');
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : ym;
}
