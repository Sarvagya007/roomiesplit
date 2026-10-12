import { PieChart } from 'lucide-react';
import { CategoryIcon } from '../common/Avatar.jsx';
import { categoryBreakdown, monthlySummary } from '../../utils/finance.js';
import { formatCurrency, formatMonth } from '../../utils/formatCurrency.js';

/** Category bars + recent months, derived from expense records. */
export default function SpendingBreakdown({ expenses }) {
  const cats = categoryBreakdown(expenses);
  const months = monthlySummary(expenses).slice(0, 4);
  return (
    <section className="card p-5" aria-labelledby="breakdown-h">
      <h2 id="breakdown-h" className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        <PieChart size={18} className="text-lilac" /> Where it goes
      </h2>
      {cats.length === 0 ? (
        <p className="text-sm text-muted">Spending by category will show up here once you add an expense.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {cats.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-semibold"><CategoryIcon category={c.category} size={14} />{c.category}</span>
                  <span className="text-muted">{formatCurrency(c.amountPaise)} · {c.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-soft" role="presentation">
                  <div className="h-full rounded-full bg-lilac transition-all duration-500" style={{ width: `${Math.max(c.pct, 2)}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted">By month</h3>
          <ul className="space-y-1 text-sm">
            {months.map((m) => (
              <li key={m.month} className="flex justify-between">
                <span>{formatMonth(m.month)}</span><span className="font-bold">{formatCurrency(m.amountPaise)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
