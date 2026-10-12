import { isValidISODate } from './finance.js';
import { SCHEMA_VERSION, STORAGE_KEY } from './constants.js';

export { SCHEMA_VERSION, STORAGE_KEY };

const isInt = Number.isSafeInteger;
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Structural + referential validation of persisted/imported data. Returns an error string or null. */
export function validateData(d) {
  if (!isObj(d)) return 'Data is not an object.';
  if (d.version !== SCHEMA_VERSION) return `Unsupported data version (${d.version}).`;
  if (!Array.isArray(d.roommates) || d.roommates.length !== 3) return 'Exactly three roommates are required.';
  const ids = d.roommates.map((r) => r?.id);
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== 3) return 'Roommate IDs are missing or duplicated.';
  if (!d.roommates.every((r) => typeof r.name === 'string' && r.name.trim())) return 'Roommate names cannot be blank.';
  if (!Array.isArray(d.expenses) || !Array.isArray(d.settlements)) return 'Expenses and settlements must be lists.';

  const seen = new Set();
  for (const e of d.expenses) {
    if (!isObj(e) || typeof e.id !== 'string' || typeof e.description !== 'string') return 'An expense record is malformed.';
    if (seen.has(e.id)) return 'Duplicate expense ID found.';
    seen.add(e.id);
    if (!isInt(e.amountPaise) || e.amountPaise <= 0) return `Expense "${e.description}" has an invalid amount.`;
    if (!ids.includes(e.payerId)) return `Expense "${e.description}" refers to an unknown roommate.`;
    if (!isValidISODate(e.date)) return `Expense "${e.description}" has an invalid date.`;
    if (e.shares !== undefined) {
      if (!isObj(e.shares)) return `Expense "${e.description}" has invalid shares.`;
      const vals = ids.map((id) => e.shares[id]);
      if (!vals.every((v) => isInt(v) && v >= 0) || vals.reduce((a, b) => a + b, 0) !== e.amountPaise)
        return `Expense "${e.description}" shares do not add up to its amount.`;
    }
  }
  const seenS = new Set();
  for (const s of d.settlements) {
    if (!isObj(s) || typeof s.id !== 'string') return 'A settlement record is malformed.';
    if (seenS.has(s.id)) return 'Duplicate settlement ID found.';
    seenS.add(s.id);
    if (!ids.includes(s.fromId) || !ids.includes(s.toId) || s.fromId === s.toId) return 'A settlement refers to invalid roommates.';
    if (!isInt(s.amountPaise) || s.amountPaise <= 0) return 'A settlement has an invalid amount.';
    if (!isValidISODate(s.date)) return 'A settlement has an invalid date.';
    if (!['completed', 'reversed'].includes(s.status)) return 'A settlement has an invalid status.';
  }
  if (d.auditLog !== undefined && !Array.isArray(d.auditLog)) return 'Audit log is malformed.';
  return null;
}

export const isValidData = (d) => validateData(d) === null;

/** Fill optional sections so older/minimal data is always well-formed. */
export function normalizeData(d) {
  return {
    ...d,
    version: SCHEMA_VERSION,
    roommates: d.roommates.map((r, i) => ({ color: i, icon: i, ...r })),
    expenses: d.expenses.map((e) => ({ notes: '', category: 'Other', ...e })),
    auditLog: d.auditLog ?? [],
    preferences: { theme: 'light', onboarded: true, ...(isObj(d.preferences) ? d.preferences : {}) },
  };
}

/** Future schema migrations hook in here. */
function migrate(d) {
  return d;
}

/**
 * Safely load. Returns { data, status }: 'empty' | 'ok' | 'corrupt'.
 * Corrupt payloads are copied to a backup key (never destroyed) and the caller falls back to defaults.
 */
export function loadStoredData(storage = globalThis.localStorage) {
  let raw = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return { data: null, status: 'empty' };
  }
  if (raw === null) return { data: null, status: 'empty' };
  try {
    const parsed = migrate(JSON.parse(raw));
    if (isValidData(parsed)) return { data: normalizeData(parsed), status: 'ok' };
  } catch {
    /* fall through */
  }
  try {
    storage.setItem(`${STORAGE_KEY}:backup`, raw);
  } catch { /* ignore */ }
  return { data: null, status: 'corrupt' };
}

export function saveStoredData(data, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: SCHEMA_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredData(storage = globalThis.localStorage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

/** JSON backup string. */
export function exportData(data) {
  return JSON.stringify({ ...data, version: SCHEMA_VERSION, exportedAt: new Date().toISOString() }, null, 2);
}

/** Validate an imported backup. Returns { ok, data } or { ok:false, error }. Never throws. */
export function parseImport(text) {
  let parsed;
  try {
    parsed = migrate(JSON.parse(text));
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  const error = validateData(parsed);
  if (error) return { ok: false, error };
  return { ok: true, data: normalizeData(parsed) };
}
