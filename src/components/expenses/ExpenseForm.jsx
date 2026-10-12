import { useMemo, useRef, useState } from 'react';
import { Save, Info } from 'lucide-react';
import Modal from '../common/Modal.jsx';
import Avatar from '../common/Avatar.jsx';
import { CATEGORIES } from '../../utils/constants.js';
import { allocateEqualShares, sortedRoommateIds, todayISO, validateExpense, makeId } from '../../utils/finance.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

/** Add / edit expense dialog. Validation + math come from utils/finance.js; this only renders state. */
export default function ExpenseForm({ roommates, expense = null, hasRepayments = false, onSave, onClose }) {
  const draftId = useRef(expense?.id ?? makeId('exp')); // same id on re-submit => idempotent
  const submitted = useRef(false);
  const [form, setForm] = useState(() => ({
    description: expense?.description ?? '',
    amount: expense ? (expense.amountPaise / 100).toFixed(2) : '',
    payerId: expense?.payerId ?? '',
    date: expense?.date ?? todayISO(),
    category: expense?.category ?? 'Other',
    notes: expense?.notes ?? '',
  }));
  const [touched, setTouched] = useState({});

  const result = useMemo(() => validateExpense(form, roommates), [form, roommates]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const showErr = (k) => touched[k] && result.errors[k];

  const preview = useMemo(
    () => (result.valid ? allocateEqualShares(result.value.amountPaise, sortedRoommateIds(roommates)) : null),
    [result, roommates],
  );

  const submit = (e) => {
    e.preventDefault();
    setTouched({ description: true, amount: true, payerId: true, date: true, notes: true });
    if (!result.valid || submitted.current) return; // blocks double-clicks
    submitted.current = true;
    onSave({ ...result.value, id: draftId.current }, expense);
    onClose();
  };

  return (
    <Modal title={expense ? 'Edit expense' : 'Add an expense'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="ex-desc" className="label">What was it for?</label>
          <input id="ex-desc" data-autofocus className="input" value={form.description} onChange={set('description')} onBlur={blur('description')}
            placeholder="Groceries, Wi-Fi bill, pizza night…" maxLength={100} aria-invalid={!!showErr('description')} aria-describedby="ex-desc-e" />
          <p id="ex-desc-e" className="err" role="alert">{showErr('description')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ex-amt" className="label">Amount (₹)</label>
            <input id="ex-amt" className="input" inputMode="decimal" autoComplete="off" value={form.amount} onChange={set('amount')} onBlur={blur('amount')}
              placeholder="0.00" aria-invalid={!!showErr('amount')} aria-describedby="ex-amt-e" />
            <p id="ex-amt-e" className="err" role="alert">{showErr('amount')}</p>
          </div>
          <div>
            <label htmlFor="ex-date" className="label">Date</label>
            <input id="ex-date" type="date" className="input" value={form.date} onChange={set('date')} onBlur={blur('date')} aria-invalid={!!showErr('date')} aria-describedby="ex-date-e" />
            <p id="ex-date-e" className="err" role="alert">{showErr('date')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ex-payer" className="label">Who covered it?</label>
            <select id="ex-payer" className="input" value={form.payerId} onChange={set('payerId')} onBlur={blur('payerId')} aria-invalid={!!showErr('payerId')} aria-describedby="ex-payer-e">
              <option value="" disabled>Pick a roomie…</option>
              {roommates.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <p id="ex-payer-e" className="err" role="alert">{showErr('payerId')}</p>
          </div>
          <div>
            <label htmlFor="ex-cat" className="label">Category <span className="font-normal normal-case">(optional)</span></label>
            <select id="ex-cat" className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="ex-notes" className="label">Notes <span className="font-normal normal-case">(optional)</span></label>
          <textarea id="ex-notes" rows={2} className="input !min-h-0 py-2" value={form.notes} onChange={set('notes')} maxLength={300} placeholder="Anything worth remembering?" />
        </div>

        <div className="rounded-2xl bg-soft p-3" aria-live="polite">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Equal split preview</div>
          {preview ? (
            <ul className="grid grid-cols-3 gap-2">
              {roommates.map((r) => (
                <li key={r.id} className="flex flex-col items-center gap-1 rounded-xl bg-card p-2 text-center">
                  <Avatar roommate={r} size="sm" />
                  <span className="max-w-full truncate text-xs text-muted">{r.name}</span>
                  <span className="text-sm font-extrabold">{formatCurrency(preview[r.id])}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Enter an amount to see everyone&apos;s share.</p>
          )}
          <p className="mt-2 text-xs text-muted">Split three ways, payer included. Leftover paise go to the first roommates by ID, never to the payer by default.</p>
        </div>

        {expense && hasRepayments && (
          <p className="flex gap-2 rounded-2xl bg-sun-soft p-3 text-xs font-semibold text-sun">
            <Info size={16} className="shrink-0" />
            Repayments you&apos;ve already recorded stay untouched. If this edit changes who owes what, new suggestions will reflect it.
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!result.valid}>
            <Save size={18} /> Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
