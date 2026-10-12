import { describe, it, expect } from 'vitest';
import {
  convertToPaise, formatCurrency, allocateEqualShares, calculateExpenseBalances,
  calculateOutstandingBalances, generateSettlementSuggestions, validateExpense,
  buildExpenseRecord, buildSettlementRecord, checkInvariants, calculateSummary,
} from '../utils/finance.js';
import { loadStoredData, saveStoredData, STORAGE_KEY } from '../utils/storage.js';

const R = [
  { id: 'a', name: 'Aarav', order: 0 },
  { id: 'b', name: 'Rohan', order: 1 },
  { id: 'c', name: 'Priya', order: 2 },
];
const exp = (amt, payerId, date = '2026-10-01') =>
  buildExpenseRecord({ description: 'x', amountPaise: amt, payerId, date, category: 'Other' }, R);
const run = (expenses, settlements = []) => {
  const bal = calculateExpenseBalances(expenses, R);
  const out = calculateOutstandingBalances(bal, settlements);
  return { bal, out, sugg: generateSettlementSuggestions(out, R) };
};
const nets = (bal) => Object.fromEntries(Object.entries(bal.byId).map(([k, v]) => [k, v.net]));

describe('money parsing/formatting', () => {
  it('converts to paise exactly', () => {
    expect(convertToPaise('100.50')).toBe(10050);
    expect(convertToPaise('0.01')).toBe(1);
    expect(convertToPaise('19.99')).toBe(1999);
    expect(convertToPaise('1,200')).toBe(120000);
    expect(convertToPaise('₹5')).toBe(500);
    expect(convertToPaise(1.1)).toBe(110);
  });
  it('rejects invalid input', () => {
    for (const v of ['', ' ', '-5', 'abc', 'NaN', 'Infinity', '1e5', '1.234', '1.', '.5', null, undefined, NaN, Infinity, -1])
      expect(convertToPaise(v), String(v)).toBeNull();
  });
  it('formats rupees with Indian grouping', () => {
    expect(formatCurrency(10050)).toBe('₹100.50');
    expect(formatCurrency(1)).toBe('₹0.01');
    expect(formatCurrency(-40000)).toBe('-₹400.00');
    expect(formatCurrency(12345678)).toBe('₹1,23,456.78');
    expect(formatCurrency(500, { showSign: true })).toBe('+₹5.00');
    expect(() => formatCurrency(1.5)).toThrow();
  });
});

describe('allocateEqualShares', () => {
  it('splits 10000 as 3334/3333/3333 in fixed order', () => {
    expect(allocateEqualShares(10000, ['a', 'b', 'c'])).toEqual({ a: 3334, b: 3333, c: 3333 });
  });
  it('remainder 2 goes to first two; ₹0.01 goes to first', () => {
    expect(allocateEqualShares(10001, ['a', 'b', 'c'])).toEqual({ a: 3334, b: 3334, c: 3333 });
    expect(allocateEqualShares(1, ['a', 'b', 'c'])).toEqual({ a: 1, b: 0, c: 0 });
  });
  it('always sums exactly (property check)', () => {
    for (let n = 1; n < 5000; n += 7) {
      const s = Object.values(allocateEqualShares(n, ['a', 'b', 'c']));
      expect(s.reduce((x, y) => x + y)).toBe(n);
    }
  });
});

describe('Test A: one expense', () => {
  it('balances and settlements', () => {
    const { bal, sugg } = run([exp(30000, 'a')]);
    expect(nets(bal)).toEqual({ a: 20000, b: -10000, c: -10000 });
    expect(sugg.map((s) => [s.fromId, s.toId, s.amountPaise])).toEqual([['b', 'a', 10000], ['c', 'a', 10000]]);
  });
});
describe('Test B: uneven paise', () => {
  it('₹100 by Aarav', () => {
    const e = exp(10000, 'a');
    expect(e.shares).toEqual({ a: 3334, b: 3333, c: 3333 });
    const { bal, sugg } = run([e]);
    expect(nets(bal)).toEqual({ a: 6666, b: -3333, c: -3333 });
    expect(sugg.map((s) => [s.fromId, s.toId, s.amountPaise])).toEqual([['b', 'a', 3333], ['c', 'a', 3333]]);
  });
  it('payer does not receive extra paisa (Priya pays)', () => {
    const e = exp(10000, 'c');
    expect(e.shares.a).toBe(3334);
    expect(e.shares.c).toBe(3333);
  });
});
describe('Test C: multiple payers', () => {
  it('works', () => {
    const { bal, sugg } = run([exp(30000, 'a'), exp(15000, 'b'), exp(15000, 'c')]);
    expect(bal.totalExpenses).toBe(60000);
    expect(Object.values(bal.byId).map((b) => b.share)).toEqual([20000, 20000, 20000]);
    expect(nets(bal)).toEqual({ a: 10000, b: -5000, c: -5000 });
    expect(sugg.map((s) => [s.fromId, s.toId, s.amountPaise])).toEqual([['b', 'a', 5000], ['c', 'a', 5000]]);
  });
});
describe('Test D: exact settlement', () => {
  it('+500/-100/-400 settles to zero without changing expenses', () => {
    // Aarav pays 750 => net a:+500, b:-250, c:-250; craft instead: Aarav 900, Rohan 300 => a:+500 b:-100 c:-400
    const expenses = [exp(90000, 'a'), exp(30000, 'b')];
    const before = run(expenses);
    expect(before.out).toEqual({ a: 50000, b: -10000, c: -40000 });
    expect(before.sugg.map((s) => s.amountPaise)).toEqual([10000, 40000]);
    const settlements = [];
    let out = before.out;
    for (const s of before.sugg) {
      settlements.push(buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: out }));
      out = calculateOutstandingBalances(calculateExpenseBalances(expenses, R), settlements);
    }
    expect(out).toEqual({ a: 0, b: 0, c: 0 });
    const after = run(expenses, settlements);
    expect(after.sugg).toEqual([]);
    expect(after.bal).toEqual(before.bal);
    expect(settlements[0].audit.outstandingAfter.b).toBe(0);
  });
  it('partial settlement leaves a smaller suggestion', () => {
    const expenses = [exp(30000, 'a')];
    const { out, sugg } = run(expenses);
    const st = buildSettlementRecord({ suggestion: sugg[0], amountPaise: 4000, outstandingBefore: out });
    expect(run(expenses, [st]).sugg[0].amountPaise).toBe(6000);
  });
  it('overpayment creates a reverse suggestion and is flagged', () => {
    const expenses = [exp(30000, 'a')];
    const { out, sugg } = run(expenses);
    const st = buildSettlementRecord({ suggestion: sugg[0], amountPaise: 12000, outstandingBefore: out });
    expect(st.audit.exceededSuggestion).toBe(true);
    const next = run(expenses, [st]);
    expect(next.out).toEqual({ a: 8000, b: 2000, c: -10000 });
    expect(next.sugg.map((s) => [s.fromId, s.toId, s.amountPaise])).toEqual([['c', 'a', 8000], ['c', 'b', 2000]]);
  });
});
describe('Test E: recalculation', () => {
  it('edit then delete with settlement history preserved', () => {
    let e = exp(30000, 'a');
    expect(nets(run([e]).bal).a).toBe(20000);
    const edited = buildExpenseRecord({ description: 'x', amountPaise: 60000, payerId: 'a', date: '2026-10-01', category: 'Other' }, R, e);
    expect(edited.id).toBe(e.id);
    expect(edited.createdAt).toBe(e.createdAt);
    expect(edited.shares).toEqual({ a: 20000, b: 20000, c: 20000 });
    const r2 = run([edited]);
    expect(nets(r2.bal)).toEqual({ a: 40000, b: -20000, c: -20000 });
    // Rohan settles 200 then the expense is deleted
    const st = buildSettlementRecord({ suggestion: r2.sugg[0], amountPaise: 20000, outstandingBefore: r2.out });
    const r3 = run([], [st]);
    expect(r3.bal.totalExpenses).toBe(0);
    // history kept; Rohan is now +200 (overpaid), Aarav -200 -> reverse suggestion, consistent
    expect(r3.out).toEqual({ a: -20000, b: 20000, c: 0 });
    expect(r3.sugg).toEqual([{ id: 'a->b', fromId: 'a', toId: 'b', amountPaise: 20000 }]);
    expect(checkInvariants([], R, [st])).toEqual([]);
  });
});
describe('Test F: invariants', () => {
  it('hold for many random operations', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const expenses = [];
    const settlements = [];
    for (let i = 0; i < 300; i++) {
      expenses.push(exp(1 + Math.floor(rnd() * 500000), R[Math.floor(rnd() * 3)].id));
      const { out, sugg } = run(expenses, settlements);
      expect(checkInvariants(expenses, R, settlements)).toEqual([]);
      expect(sugg.length).toBeLessThanOrEqual(2);
      for (const s of sugg) {
        expect(s.amountPaise).toBeGreaterThan(0);
        expect(Number.isInteger(s.amountPaise)).toBe(true);
        expect(s.amountPaise).toBeLessThanOrEqual(-out[s.fromId]);
        expect(s.amountPaise).toBeLessThanOrEqual(out[s.toId]);
      }
      if (rnd() < 0.4 && sugg.length) {
        const s = sugg[0];
        settlements.push(buildSettlementRecord({ suggestion: s, amountPaise: s.amountPaise, outstandingBefore: out }));
      }
      if (rnd() < 0.1) expenses.splice(Math.floor(rnd() * expenses.length), 1);
    }
  });
  it('no expenses / all settled gives no suggestions', () => {
    expect(run([]).sugg).toEqual([]);
    expect(run([exp(30000, 'a'), exp(30000, 'b'), exp(30000, 'c')]).sugg).toEqual([]);
  });
  it('one roommate owed by both others; fewer payments than per-expense', () => {
    const { sugg } = run([exp(30000, 'a'), exp(15000, 'a'), exp(1, 'b')]);
    expect(sugg.length).toBe(2);
  });
});

describe('summary', () => {
  it('pending counts each debt once; month filter', () => {
    const expenses = [exp(90000, 'a', '2026-10-05'), exp(30000, 'b', '2026-09-30')];
    const { out } = run(expenses);
    const s = calculateSummary(expenses, out, '2026-10-12');
    expect(s.totalExpenses).toBe(120000);
    expect(s.monthExpenses).toBe(90000);
    expect(s.pendingPaise).toBe(50000);
    expect(s.count).toBe(2);
  });
});

describe('validateExpense', () => {
  const ok = { description: '  Milk ', amount: '12.5', payerId: 'a', date: '2026-10-12', category: 'Groceries' };
  it('accepts and trims', () => {
    const v = validateExpense(ok, R);
    expect(v.valid).toBe(true);
    expect(v.value).toMatchObject({ description: 'Milk', amountPaise: 1250 });
  });
  it('rejects bad fields', () => {
    expect(validateExpense({ ...ok, description: '   ' }, R).errors.description).toBeTruthy();
    for (const amount of ['0', '-1', 'abc', 'Infinity', '', '1.999', '99999999999'])
      expect(validateExpense({ ...ok, amount }, R).errors.amount, amount).toBeTruthy();
    expect(validateExpense({ ...ok, payerId: 'zzz' }, R).errors.payerId).toBeTruthy();
    expect(validateExpense({ ...ok, date: '2026-02-31' }, R).errors.date).toBeTruthy();
  });
});

describe('storage', () => {
  const mem = () => {
    const m = {};
    return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; }, removeItem: (k) => delete m[k], m };
  };
  const data = { version: 1, roommates: R, expenses: [exp(100, 'a')], settlements: [] };
  it('empty, ok, round trip', () => {
    const s = mem();
    expect(loadStoredData(s).status).toBe('empty');
    expect(saveStoredData(data, s)).toBe(true);
    const l = loadStoredData(s);
    expect(l.status).toBe('ok');
    expect(l.data.expenses[0].amountPaise).toBe(100);
  });
  it('malformed JSON / wrong schema falls back and keeps backup', () => {
    for (const raw of ['{not json', '{"version":99}', '[]', JSON.stringify({ ...data, roommates: [] })]) {
      const s = mem();
      s.setItem(STORAGE_KEY, raw);
      expect(loadStoredData(s)).toEqual({ data: null, status: 'corrupt' });
      expect(s.m[`${STORAGE_KEY}:backup`]).toBe(raw);
    }
  });
  it('rejects non-integer paise', () => {
    const s = mem();
    s.setItem(STORAGE_KEY, JSON.stringify({ ...data, expenses: [{ ...data.expenses[0], amountPaise: 10.5 }] }));
    expect(loadStoredData(s).status).toBe('corrupt');
  });
});
