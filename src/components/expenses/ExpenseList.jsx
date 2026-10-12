import { useMemo, useState } from 'react';
import { ChevronDown, Pencil, Trash2, Download, AlertTriangle, ReceiptText } from 'lucide-react';
import { CategoryIcon } from '../common/Avatar.jsx';
import ConfirmationDialog from '../common/ConfirmationDialog.jsx';
import ExpenseFilters, { EMPTY_FILTERS } from './ExpenseFilters.jsx';
import { filterExpenses, expensesToCSV } from '../../utils/finance.js';
import { formatCurrency, formatDate } from '../../utils/formatCurrency.js';

function ExpenseRow({ expense, roommates, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const payer = roommates.find((r) => r.id === expense.payerId);
  const panelId = `exp-${expense.id}`;
  return (
    <li className="rounded-2xl border border-line bg-card transition hover:border-brand/40">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <CategoryIcon category={expense.category} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{expense.description}</span>
          <span className="block truncate text-xs text-muted">
            {payer?.name} paid · {formatDate(expense.date)} · {expense.category}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-extrabold">{formatCurrency(expense.amountPaise)}</span>
          <span className="block text-[11px] text-muted">split equally</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="animate-rise border-t border-line px-3 pb-3 pt-3">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {roommates.map((r) => (
              <div key={r.id} className="rounded-xl bg-soft p-2">
                <dt className="truncate text-xs text-muted">{r.name}&apos;s share</dt>
                <dd className="text-sm font-extrabold">{formatCurrency(expense.shares?.[r.id] ?? 0)}</dd>
              </div>
            ))}
          </dl>
          {expense.notes && <p className="mt-3 rounded-xl bg-soft p-2 text-sm"><span className="font-bold">Note: </span>{expense.notes}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => onEdit(expense)}><Pencil size={16} /> Edit</button>
            <button type="button" className="btn-ghost flex-1 !text-neg" onClick={() => onDelete(expense)}><Trash2 size={16} /> Delete</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function ExpenseList({ expenses, roommates, hasRepayments, onEdit, onDelete, onAdd }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pendingDelete, setPendingDelete] = useState(null);
  const visible = useMemo(() => filterExpenses([...expenses], filters), [expenses, filters]);

  const exportCsv = () => {
    const blob = new Blob([expensesToCSV(visible, roommates)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roomiesplit-expenses.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="card p-5" aria-labelledby="hist-h">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="hist-h" className="flex items-center gap-2 font-display text-lg font-bold"><ReceiptText size={18} className="text-brand" /> Expense history</h2>
        {expenses.length > 0 && (
          <button type="button" className="btn-ghost !min-h-[36px] !px-3 text-xs" onClick={exportCsv}><Download size={14} /> CSV</button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-2xl bg-soft p-8 text-center">
          <div className="text-4xl" aria-hidden="true">🧾</div>
          <p className="mt-2 font-bold">No expenses yet.</p>
          <p className="text-sm text-muted">Add your first shared expense and we&apos;ll do the math.</p>
          <button type="button" className="btn-primary mt-4" onClick={onAdd}>Add Expense</button>
        </div>
      ) : (
        <>
          <ExpenseFilters filters={filters} onChange={setFilters} roommates={roommates} />
          <p className="my-3 text-xs text-muted" aria-live="polite">Showing {visible.length} of {expenses.length}</p>
          {visible.length === 0 ? (
            <p className="rounded-2xl bg-soft p-6 text-center text-sm text-muted">Nothing matches those filters. Try loosening them.</p>
          ) : (
            <ul className="space-y-2">
              {visible.map((e) => (
                <ExpenseRow key={e.id} expense={e} roommates={roommates} onEdit={onEdit} onDelete={setPendingDelete} />
              ))}
            </ul>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmationDialog
          title="Delete this expense?"
          tone="danger"
          confirmLabel="Delete expense"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => { onDelete(pendingDelete); setPendingDelete(null); }}
        >
          <p><b>{pendingDelete.description}</b> · {formatCurrency(pendingDelete.amountPaise)} · {formatDate(pendingDelete.date)}</p>
          <p className="flex gap-2 rounded-2xl bg-sun-soft p-3 text-xs font-semibold text-sun">
            <AlertTriangle size={16} className="shrink-0" />
            Deleting an expense changes everyone&apos;s balances and the suggested payments.
            {hasRepayments && ' Repayments you already recorded are kept as history and are not removed, so you may see a correcting payment suggested.'}
          </p>
          <p className="text-xs text-muted">The deletion is noted in the activity feed.</p>
        </ConfirmationDialog>
      )}
    </section>
  );
}
