/**
 * RoomieSplit financial logic. Pure functions, no React, no DOM.
 * ALL money is an integer number of paise (₹1 = 100 paise).
 */

import { MAX_PAISE, CATEGORIES, DEFAULT_ROOMMATES, SCHEMA_VERSION } from './constants.js';
import { formatCurrency, formatDate } from './formatCurrency.js';

export { MAX_PAISE, CATEGORIES, formatCurrency, formatDate };

const isInt = (n) => Number.isSafeInteger(n);

export function makeId(prefix = 'id') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

/**
 * Parse user input ("125.50", "₹1,200", 300) into integer paise.
 * Returns null for anything invalid (blank, negative, NaN, Infinity, >2 decimals, exponent...).
 * Uses string parsing only, never float multiplication.
 */
export function convertToPaise(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    value = String(value);
  }
  if (typeof value !== 'string') return null;
  const s = value.trim().replace(/^₹\s*/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [rupees, frac = ''] = s.split('.');
  const paise = Number(rupees) * 100 + Number(frac.padEnd(2, '0'));
  return isInt(paise) ? paise : null;
}

/**
 * Largest-remainder equal split in paise.
 * base = floor(A/3), remainder r = A mod 3 (0..2). The first r roommates in the FIXED
 * roommate order (roommate.order) each receive one extra paisa. The payer gets no special treatment.
 * Result always sums exactly to `amountPaise`.
 * @param {number} amountPaise
 * @param {string[]} orderedIds roommate ids in rounding-priority order (sorted stable IDs)
 * @returns {Record<string, number>}
 */
export function allocateEqualShares(amountPaise, orderedIds) {
  if (!isInt(amountPaise) || amountPaise < 0) throw new RangeError('Amount must be a non-negative integer of paise');
  const n = orderedIds.length;
  const base = Math.floor(amountPaise / n);
  const remainder = amountPaise % n;
  const shares = {};
  orderedIds.forEach((id, i) => {
    shares[id] = base + (i < remainder ? 1 : 0);
  });
  return shares;
}

/** Fixed rounding priority: roommates sorted by their stable ID (never by name). */
export const sortedRoommateIds = (roommates) =>
  roommates.map((r) => r.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/** Use the share snapshot stored with the expense when valid; otherwise re-derive deterministically. */
function sharesFor(expense, ids) {
  const s = expense.shares;
  const valid =
    s && ids.every((id) => isInt(s[id]) && s[id] >= 0) && sum(ids.map((id) => s[id])) === expense.amountPaise;
  return valid ? s : allocateEqualShares(expense.amountPaise, ids);
}

/**
 * Per-roommate paid / share / net (paid - share) from expenses only (ignores settlements).
 */
export function calculateExpenseBalances(expenses, roommates) {
  const ids = sortedRoommateIds(roommates);
  const byId = Object.fromEntries(ids.map((id) => [id, { paid: 0, share: 0, net: 0 }]));
  let totalExpenses = 0;
  for (const e of expenses) {
    const shares = sharesFor(e, ids);
    totalExpenses += e.amountPaise;
    if (byId[e.payerId]) byId[e.payerId].paid += e.amountPaise;
    for (const id of ids) byId[id].share += shares[id];
  }
  for (const id of ids) byId[id].net = byId[id].paid - byId[id].share;
  return { byId, totalExpenses };
}

/**
 * Outstanding = expense net + (amount sent) - (amount received), over completed settlements.
 * A payer's negative balance moves up toward zero; the receiver's positive balance moves down toward zero.
 */
export function calculateOutstandingBalances(expenseBalances, settlements) {
  const out = Object.fromEntries(Object.entries(expenseBalances.byId).map(([id, b]) => [id, b.net]));
  for (const s of settlements) {
    if (s.status !== 'completed') continue;
    if (s.fromId in out) out[s.fromId] += s.amountPaise;
    if (s.toId in out) out[s.toId] -= s.amountPaise;
  }
  return out;
}

/**
 * Greedy creditor/debtor matching (deterministic: roommate order).
 * Each step pays min(debt, credit); at most (n-1) payments.
 */
export function generateSettlementSuggestions(outstanding, roommates) {
  const ids = sortedRoommateIds(roommates);
  const debtors = ids.filter((id) => outstanding[id] < 0).map((id) => ({ id, left: -outstanding[id] }));
  const creditors = ids.filter((id) => outstanding[id] > 0).map((id) => ({ id, left: outstanding[id] }));
  const result = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].left, creditors[c].left);
    result.push({
      id: `${debtors[d].id}->${creditors[c].id}`,
      fromId: debtors[d].id,
      toId: creditors[c].id,
      amountPaise: amount,
    });
    debtors[d].left -= amount;
    creditors[c].left -= amount;
    if (debtors[d].left === 0) d++;
    if (creditors[c].left === 0) c++;
  }
  return result;
}

/** Returns a list of human-readable invariant violations (empty = healthy). */
export function checkInvariants(expenses, roommates, settlements = []) {
  const problems = [];
  const bal = calculateExpenseBalances(expenses, roommates);
  const vals = Object.values(bal.byId);
  const totalShares = sum(vals.map((v) => v.share));
  if (totalShares !== bal.totalExpenses) problems.push('Allocated shares do not equal total expenses.');
  if (sum(vals.map((v) => v.net)) !== 0) problems.push('Expense net balances do not sum to zero.');
  const out = calculateOutstandingBalances(bal, settlements);
  if (sum(Object.values(out)) !== 0) problems.push('Outstanding balances do not sum to zero.');
  for (const e of expenses) {
    if (!isInt(e.amountPaise) || e.amountPaise <= 0) problems.push(`Expense "${e.description}" has an invalid amount.`);
  }
  return problems;
}

export function todayISO(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function isValidISODate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Validate raw form input.
 * @returns {{valid:boolean, errors:Object, value:Object|null}}
 */
export function validateExpense(form, roommates) {
  const errors = {};
  const description = (form.description ?? '').trim();
  if (!description) errors.description = 'Description is required.';
  else if (description.length > 100) errors.description = 'Keep the description under 100 characters.';

  const raw = String(form.amount ?? '').trim();
  const amountPaise = convertToPaise(raw);
  if (!raw) errors.amount = 'Amount is required.';
  else if (amountPaise === null) errors.amount = 'Enter a valid positive amount with up to 2 decimals.';
  else if (amountPaise <= 0) errors.amount = 'Amount must be greater than zero.';
  else if (amountPaise > MAX_PAISE) errors.amount = `Amount cannot exceed ${formatCurrency(MAX_PAISE)}.`;

  if (!roommates.some((r) => r.id === form.payerId)) errors.payerId = 'Choose who paid.';
  if (!isValidISODate(form.date)) errors.date = 'Enter a valid date.';
  const category = form.category && CATEGORIES.includes(form.category) ? form.category : 'Other';
  const notes = (form.notes ?? '').trim();
  if (notes.length > 300) errors.notes = 'Keep notes under 300 characters.';

  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    value: valid ? { description, amountPaise, payerId: form.payerId, date: form.date, category, notes } : null,
  };
}

/** Create or update an expense record (update keeps id + createdAt and re-allocates shares). */
export function buildExpenseRecord(value, roommates, existing = null, now = new Date()) {
  const ts = now.toISOString();
  return {
    id: existing?.id ?? value.id ?? makeId('exp'),
    description: value.description,
    amountPaise: value.amountPaise,
    payerId: value.payerId,
    date: value.date,
    category: value.category,
    notes: value.notes ?? '',
    shares: allocateEqualShares(value.amountPaise, sortedRoommateIds(roommates)),
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
}

/** Build an immutable settlement ledger entry with audit info. */
export function buildSettlementRecord({ suggestion, amountPaise, outstandingBefore, id, note = '' }, now = new Date()) {
  const after = { ...outstandingBefore };
  after[suggestion.fromId] += amountPaise;
  after[suggestion.toId] -= amountPaise;
  return {
    id: id ?? makeId('stl'),
    note,
    fromId: suggestion.fromId,
    toId: suggestion.toId,
    amountPaise,
    date: todayISO(now),
    status: 'completed',
    suggestionRef: suggestion.id,
    createdAt: now.toISOString(),
    audit: {
      suggestedAmountPaise: suggestion.amountPaise,
      exceededSuggestion: amountPaise > suggestion.amountPaise,
      outstandingBefore,
      outstandingAfter: after,
      note: 'Manually confirmed by a user. No money was moved by this app.',
    },
  };
}

export function calculateSummary(expenses, outstanding, today = todayISO(), settlements = []) {
  const month = today.slice(0, 7);
  return {
    totalExpenses: sum(expenses.map((e) => e.amountPaise)),
    monthExpenses: sum(expenses.filter((e) => e.date.startsWith(month)).map((e) => e.amountPaise)),
    // each debt counted once: sum of what debtors owe (== sum of what creditors are owed)
    pendingPaise: sum(Object.values(outstanding).filter((v) => v < 0).map((v) => -v)),
    count: expenses.length,
    repaymentsPaise: sum(settlements.filter((s) => s.status === 'completed').map((s) => s.amountPaise)),
    repaymentsCount: settlements.filter((s) => s.status === 'completed').length,
  };
}

/* ------------------------------------------------------------------ *
 * Ledger operations: pure functions (state in -> new state out).
 * The hook calls these; they never touch React or localStorage.
 * ------------------------------------------------------------------ */

export function createDefaultData() {
  return {
    version: SCHEMA_VERSION,
    roommates: DEFAULT_ROOMMATES.map((r) => ({ ...r })),
    expenses: [],
    settlements: [],
    auditLog: [],
    preferences: { theme: 'light', onboarded: false },
  };
}

/** Current derived view of a dataset (never stored). */
export function deriveState(data) {
  const balances = calculateExpenseBalances(data.expenses, data.roommates);
  const outstanding = calculateOutstandingBalances(balances, data.settlements);
  const suggestions = generateSettlementSuggestions(outstanding, data.roommates);
  return { balances, outstanding, suggestions };
}

/** Idempotent: re-submitting the same expense id (double click / StrictMode) is a no-op. */
export function addExpense(data, record) {
  if (data.expenses.some((e) => e.id === record.id)) return data;
  return { ...data, expenses: [...data.expenses, record] };
}

export function updateExpense(data, record, now = new Date()) {
  const before = data.expenses.find((e) => e.id === record.id);
  if (!before) return data;
  return {
    ...data,
    expenses: data.expenses.map((e) => (e.id === record.id ? record : e)),
    auditLog: [
      ...data.auditLog,
      {
        id: makeId('aud'),
        type: 'expense_edited',
        at: now.toISOString(),
        expenseId: before.id,
        description: record.description,
        beforeAmountPaise: before.amountPaise,
        afterAmountPaise: record.amountPaise,
        beforePayerId: before.payerId,
        afterPayerId: record.payerId,
      },
    ],
  };
}

/**
 * Deleting an expense never deletes repayments. A snapshot goes to the audit log so the
 * activity feed stays truthful; outstanding balances are simply recomputed from what remains.
 */
export function deleteExpense(data, id, now = new Date()) {
  const gone = data.expenses.find((e) => e.id === id);
  if (!gone) return data;
  return {
    ...data,
    expenses: data.expenses.filter((e) => e.id !== id),
    auditLog: [
      ...data.auditLog,
      {
        id: makeId('aud'),
        type: 'expense_deleted',
        at: now.toISOString(),
        expenseId: gone.id,
        description: gone.description,
        amountPaise: gone.amountPaise,
        payerId: gone.payerId,
        repaymentsExisted: data.settlements.length > 0,
      },
    ],
  };
}

/**
 * Record a repayment. Rejects invalid input; ignores an already-recorded id (duplicate submit).
 * A repayment may not exceed what the payer still owes or what the receiver is still owed.
 */
export function recordSettlement(data, record) {
  if (data.settlements.some((s) => s.id === record.id)) return data;
  const ids = data.roommates.map((r) => r.id);
  if (!ids.includes(record.fromId) || !ids.includes(record.toId)) throw new RangeError('Unknown roommate.');
  if (record.fromId === record.toId) throw new RangeError('A roommate cannot pay themselves.');
  if (!Number.isSafeInteger(record.amountPaise) || record.amountPaise <= 0) throw new RangeError('Amount must be a positive whole number of paise.');
  const { outstanding } = deriveState(data);
  if (record.amountPaise > -outstanding[record.fromId] || record.amountPaise > outstanding[record.toId])
    throw new RangeError('Repayment is larger than the remaining debt.');
  return { ...data, settlements: [...data.settlements, record] };
}

/** Roommate names must be non-blank and unique (case-insensitive). Returns an error string or null. */
export function validateRoommateNames(names) {
  const trimmed = names.map((n) => (n ?? '').trim());
  if (trimmed.some((n) => !n)) return 'Names cannot be blank.';
  if (trimmed.some((n) => n.length > 24)) return 'Keep names under 25 characters.';
  if (new Set(trimmed.map((n) => n.toLowerCase())).size !== trimmed.length) return 'Each roommate needs a different name.';
  return null;
}

/** Edit name/avatar only; IDs never change, so history is unaffected. */
export function updateRoommates(data, edits) {
  return {
    ...data,
    roommates: data.roommates.map((r) => (edits[r.id] ? { ...r, ...edits[r.id], name: (edits[r.id].name ?? r.name).trim() } : r)),
  };
}

export function filterExpenses(expenses, { payerId = '', category = '', from = '', to = '', query = '', sort = 'newest' } = {}) {
  const q = query.trim().toLowerCase();
  const list = expenses.filter(
    (e) =>
      (!payerId || e.payerId === payerId) &&
      (!category || e.category === category) &&
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (!q || e.description.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q)),
  );
  const dir = sort === 'oldest' ? 1 : -1;
  return list.sort((a, b) => dir * (a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)));
}

export function categoryBreakdown(expenses) {
  const total = expenses.reduce((s, e) => s + e.amountPaise, 0);
  const map = new Map();
  for (const e of expenses) map.set(e.category, (map.get(e.category) ?? 0) + e.amountPaise);
  return [...map.entries()]
    .map(([category, amountPaise]) => ({ category, amountPaise, pct: total ? Math.round((amountPaise / total) * 100) : 0 }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

export function monthlySummary(expenses) {
  const map = new Map();
  for (const e of expenses) map.set(e.date.slice(0, 7), (map.get(e.date.slice(0, 7)) ?? 0) + e.amountPaise);
  return [...map.entries()].map(([month, amountPaise]) => ({ month, amountPaise })).sort((a, b) => b.month.localeCompare(a.month));
}

/** Activity feed generated only from stored records. */
export function buildActivityFeed(data) {
  const name = (id) => data.roommates.find((r) => r.id === id)?.name ?? 'Someone';
  const items = [];
  for (const e of data.expenses)
    items.push({ id: `e-${e.id}`, at: e.createdAt, kind: 'expense', actorId: e.payerId, text: `${name(e.payerId)} added ${e.description}`, amountPaise: e.amountPaise });
  for (const s of data.settlements)
    items.push({ id: `s-${s.id}`, at: s.createdAt, kind: 'repayment', actorId: s.fromId, text: `${name(s.fromId)} recorded a repayment to ${name(s.toId)}`, amountPaise: s.amountPaise });
  for (const a of data.auditLog) {
    if (a.type === 'expense_edited')
      items.push({ id: `a-${a.id}`, at: a.at, kind: 'edit', actorId: a.afterPayerId, text: `${a.description} was edited`, detail: a.beforeAmountPaise !== a.afterAmountPaise ? `${formatCurrency(a.beforeAmountPaise)} → ${formatCurrency(a.afterAmountPaise)}` : '' });
    if (a.type === 'expense_deleted')
      items.push({ id: `a-${a.id}`, at: a.at, kind: 'delete', actorId: a.payerId, text: `${a.description} was deleted`, amountPaise: a.amountPaise });
  }
  return items.sort((x, y) => y.at.localeCompare(x.at));
}

function csvCell(v) {
  const s = String(v ?? '');
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // neutralise spreadsheet formula injection
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function expensesToCSV(expenses, roommates) {
  const name = (id) => roommates.find((r) => r.id === id)?.name ?? id;
  const header = ['Date', 'Description', 'Category', 'Amount (INR)', 'Paid by', ...roommates.map((r) => `${r.name} share`), 'Notes'];
  const rows = expenses.map((e) => [
    e.date, e.description, e.category,
    formatCurrency(e.amountPaise).slice(1).replace(/,/g, ''),
    name(e.payerId),
    ...roommates.map((r) => formatCurrency(e.shares?.[r.id] ?? 0).slice(1).replace(/,/g, '')),
    e.notes ?? '',
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
