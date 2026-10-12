import { describe, it, expect } from 'vitest';
import {
  createDefaultData, deriveState, addExpense, updateExpense, deleteExpense, recordSettlement,
  buildExpenseRecord, buildSettlementRecord, validateExpense, validateRoommateNames, updateRoommates,
  checkInvariants, buildActivityFeed, filterExpenses, categoryBreakdown, expensesToCSV, convertToPaise,
} from '../utils/finance.js';
import { loadStoredData, saveStoredData, exportData, parseImport, STORAGE_KEY } from '../utils/storage.js';

const A = 'roommate-a', B = 'roommate-b', C = 'roommate-c';
const add = (data, amt, payerId, extra = {}) =>
  addExpense(data, buildExpenseRecord({ description: 'x', amountPaise: amt, payerId, date: '2026-10-01', category: 'Other', ...extra }, data.roommates));
const net = (data) => deriveState(data).outstanding;
const sugg = (data) => deriveState(data).suggestions.map((s) => [s.fromId, s.toId, s.amountPaise]);
const memStorage = () => {
  const m = {};
  return { m, getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => delete m[k] };
};

describe('spec scenarios', () => {
  it('1. initial balances are zero, no suggestions', () => {
    const d = createDefaultData();
    expect(net(d)).toEqual({ [A]: 0, [B]: 0, [C]: 0 });
    expect(sugg(d)).toEqual([]);
    expect(d.roommates.map((r) => r.name)).toEqual(['A', 'B', 'C']);
  });
  it('2. ₹900 gives three ₹300 shares', () => {
    const d = add(createDefaultData(), 90000, A);
    expect(d.expenses[0].shares).toEqual({ [A]: 30000, [B]: 30000, [C]: 30000 });
  });
  it('3/4. ₹1,000 grocery by C then ₹600 electricity by A (exact spec numbers), history intact', () => {
    let d = add(createDefaultData(), 100000, C, { description: 'Groceries' });
    const grocery = d.expenses[0];
    expect(grocery.shares).toEqual({ [A]: 33334, [B]: 33333, [C]: 33333 });
    expect(net(d)).toEqual({ [A]: -33334, [B]: -33333, [C]: 66667 });
    expect(sugg(d)).toEqual([[A, C, 33334], [B, C, 33333]]);
    d = add(d, 60000, A, { description: 'Electricity' });
    expect(net(d)).toEqual({ [A]: 6666, [B]: -53333, [C]: 46667 });
    expect(sugg(d)).toEqual([[B, A, 6666], [B, C, 46667]]);
    expect(Object.values(net(d)).reduce((x, y) => x + y)).toBe(0);
    expect(d.expenses[0]).toEqual(grocery);
    expect(d.expenses).toHaveLength(2);
  });
  it('5. a roommate can flip from debtor to creditor', () => {
    let d = add(createDefaultData(), 30000, B);
    expect(net(d)[A]).toBeLessThan(0);
    d = add(d, 120000, A);
    expect(net(d)[A]).toBeGreaterThan(0);
  });
  it('6/7. paying all suggestions settles everyone; each reduces the right balances', () => {
    let d = add(add(createDefaultData(), 100000, C), 60000, A);
    for (let i = 0; i < 5 && deriveState(d).suggestions.length; i++) {
      const s = deriveState(d).suggestions[0];
      const before = net(d);
      d = recordSettlement(d, buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: before }));
      const after = net(d);
      expect(after[s.fromId]).toBe(before[s.fromId] + s.amountPaise);
      expect(after[s.toId]).toBe(before[s.toId] - s.amountPaise);
    }
    expect(net(d)).toEqual({ [A]: 0, [B]: 0, [C]: 0 });
    expect(sugg(d)).toEqual([]);
    expect(d.expenses).toHaveLength(2);
  });
  it('8. duplicate settlement submission is ignored', () => {
    let d = add(createDefaultData(), 30000, A);
    const s = deriveState(d).suggestions[0];
    const rec = buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: net(d), id: 'stl_fixed' });
    d = recordSettlement(d, rec);
    d = recordSettlement(d, rec);
    expect(d.settlements).toHaveLength(1);
    // Same for expenses
    const e = buildExpenseRecord({ description: 'y', amountPaise: 100, payerId: A, date: '2026-10-01', category: 'Other', id: 'exp_fixed' }, d.roommates);
    expect(addExpense(addExpense(d, e), e).expenses.filter((x) => x.id === 'exp_fixed')).toHaveLength(1);
  });
  it('rejects overpayment, self-payment, bad ids and amounts', () => {
    const d = add(createDefaultData(), 30000, A);
    const s = deriveState(d).suggestions[0];
    const mk = (over) => ({ ...buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: net(d) }), ...over });
    expect(() => recordSettlement(d, mk({ amountPaise: s.amountPaise + 1 }))).toThrow();
    expect(() => recordSettlement(d, mk({ toId: s.fromId }))).toThrow();
    expect(() => recordSettlement(d, mk({ toId: 'nobody' }))).toThrow();
    expect(() => recordSettlement(d, mk({ amountPaise: 0 }))).toThrow();
    expect(() => recordSettlement(d, mk({ amountPaise: 1.5 }))).toThrow();
  });
  it('9. editing recalculates balances and keeps the id', () => {
    let d = add(createDefaultData(), 30000, A);
    const orig = d.expenses[0];
    d = updateExpense(d, buildExpenseRecord({ description: 'x', amountPaise: 60000, payerId: B, date: '2026-10-01', category: 'Other' }, d.roommates, orig));
    expect(d.expenses).toHaveLength(1);
    expect(d.expenses[0].id).toBe(orig.id);
    expect(net(d)).toEqual({ [A]: -20000, [B]: 40000, [C]: -20000 });
    expect(d.auditLog[0]).toMatchObject({ type: 'expense_edited', beforeAmountPaise: 30000, afterAmountPaise: 60000 });
  });
  it('10. deleting an expense keeps repayments, stays consistent, and is audited', () => {
    let d = add(createDefaultData(), 30000, A);
    const s = deriveState(d).suggestions[0];
    d = recordSettlement(d, buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: net(d) }));
    d = deleteExpense(d, d.expenses[0].id);
    expect(d.expenses).toHaveLength(0);
    expect(d.settlements).toHaveLength(1);
    expect(Object.values(net(d)).reduce((x, y) => x + y)).toBe(0);
    expect(sugg(d)).toEqual([[A, B, 10000]]); // reverse correction is suggested, not hidden
    expect(d.auditLog[0]).toMatchObject({ type: 'expense_deleted', repaymentsExisted: true });
    expect(checkInvariants(d.expenses, d.roommates, d.settlements)).toEqual([]);
    expect(buildActivityFeed(d).map((i) => i.kind).sort()).toEqual(['delete', 'repayment']);
  });
  it('11. invalid amounts and roommate ids are rejected', () => {
    const d = createDefaultData();
    const f = { description: 'ok', amount: '10', payerId: A, date: '2026-10-01', category: 'Other' };
    expect(validateExpense(f, d.roommates).valid).toBe(true);
    expect(validateExpense({ ...f, amount: '-5' }, d.roommates).valid).toBe(false);
    expect(validateExpense({ ...f, amount: '0.001' }, d.roommates).valid).toBe(false);
    expect(validateExpense({ ...f, payerId: 'x' }, d.roommates).valid).toBe(false);
    expect(convertToPaise('1e3')).toBeNull();
  });
  it('12. net balances always sum to zero', () => {
    let d = createDefaultData();
    for (const [amt, who] of [[1, A], [99999, B], [33333, C], [7, B], [100001, A]]) {
      d = add(d, amt, who);
      expect(Object.values(net(d)).reduce((x, y) => x + y)).toBe(0);
    }
  });
  it('renaming keeps IDs and history; names validated', () => {
    let d = add(createDefaultData(), 30000, A);
    d = updateRoommates(d, { [A]: { name: '  Aarav ' } });
    expect(d.roommates[0]).toMatchObject({ id: A, name: 'Aarav' });
    expect(d.expenses[0].payerId).toBe(A);
    expect(validateRoommateNames(['A', 'a', 'C'])).toBeTruthy();
    expect(validateRoommateNames(['A', ' ', 'C'])).toBeTruthy();
    expect(validateRoommateNames(['A', 'B', 'C'])).toBeNull();
  });
});

describe('persistence and backups', () => {
  it('13. data survives a refresh', () => {
    const s = memStorage();
    const d = add(createDefaultData(), 12345, B, { description: 'Wi-Fi' });
    expect(saveStoredData(d, s)).toBe(true);
    const { data, status } = loadStoredData(s);
    expect(status).toBe('ok');
    expect(data.expenses).toEqual(d.expenses);
    expect(data.roommates).toEqual(d.roommates);
  });
  it('14. corrupted storage does not crash and is backed up', () => {
    for (const raw of ['{{{', 'null', '"x"', '{"version":1}', JSON.stringify({ ...createDefaultData(), expenses: [{ id: 'e' }] })]) {
      const s = memStorage();
      s.setItem(STORAGE_KEY, raw);
      expect(loadStoredData(s).status).toBe('corrupt');
      expect(s.m[`${STORAGE_KEY}:backup`]).toBe(raw);
    }
    expect(loadStoredData({ getItem() { throw new Error('denied'); } }).status).toBe('empty');
    expect(saveStoredData(createDefaultData(), { setItem() { throw new Error('quota'); } })).toBe(false);
  });
  it('15. export then import restores the same data', () => {
    let d = add(add(createDefaultData(), 100000, C), 60000, A);
    const s0 = deriveState(d).suggestions[0];
    d = recordSettlement(d, buildSettlementRecord({ suggestion: s0, amountPaise: s0.amountPaise, outstandingBefore: net(d), note: 'UPI' }));
    const res = parseImport(exportData(d));
    expect(res.ok).toBe(true);
    expect(res.data.expenses).toEqual(d.expenses);
    expect(res.data.settlements).toEqual(d.settlements);
    expect(net(res.data)).toEqual(net(d));
  });
  it('rejects bad imports', () => {
    const d = add(createDefaultData(), 30000, A);
    const bad = (mut) => parseImport(JSON.stringify(mut(JSON.parse(JSON.stringify(d)))));
    expect(parseImport('nope').ok).toBe(false);
    expect(bad((x) => { x.version = 2; return x; }).ok).toBe(false);
    expect(bad((x) => { x.expenses[0].payerId = 'ghost'; return x; }).ok).toBe(false);
    expect(bad((x) => { x.expenses[0].amountPaise = 10.5; return x; }).ok).toBe(false);
    expect(bad((x) => { x.expenses[0].shares[A] += 1; return x; }).ok).toBe(false);
    expect(bad((x) => { x.expenses.push(x.expenses[0]); return x; }).ok).toBe(false);
  });
});

describe('history helpers', () => {
  it('filters, sorts, breaks down and exports CSV safely', () => {
    let d = createDefaultData();
    d = add(d, 30000, A, { description: 'Milk', category: 'Groceries', date: '2026-10-02' });
    d = add(d, 50000, B, { description: '=HYPERLINK("x")', category: 'Rent', date: '2026-09-02' });
    expect(filterExpenses(d.expenses, { payerId: A }).map((e) => e.description)).toEqual(['Milk']);
    expect(filterExpenses(d.expenses, { query: 'mil' })).toHaveLength(1);
    expect(filterExpenses(d.expenses, { from: '2026-10-01' })).toHaveLength(1);
    expect(filterExpenses(d.expenses, { sort: 'oldest' })[0].date).toBe('2026-09-02');
    expect(categoryBreakdown(d.expenses)[0]).toMatchObject({ category: 'Rent', pct: 63 });
    const csv = expensesToCSV(d.expenses, d.roommates);
    expect(csv.split('\r\n')).toHaveLength(3);
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csv).toContain('300.00');
  });
});
