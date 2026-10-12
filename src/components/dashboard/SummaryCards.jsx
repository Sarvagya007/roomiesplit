import { Receipt, Scale, HandCoins, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency.js';

function Tile({ icon: Icon, label, value, hint, tint }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${tint}`} aria-hidden="true"><Icon size={15} /></span>
        {label}
      </div>
      <div key={value} className="mt-2 font-display text-2xl font-extrabold animate-bump">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{hint}</div>
    </div>
  );
}

/** Group summary. Total spent (history) is kept visibly separate from outstanding debt (right now). */
export default function SummaryCards({ summary, suggestionCount }) {
  return (
    <section aria-label="Group summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile icon={Receipt} label="Total spent" tint="bg-brand-soft text-brand"
        value={formatCurrency(summary.totalExpenses)}
        hint={`${summary.count} ${summary.count === 1 ? 'expense' : 'expenses'} recorded`} />
      <Tile icon={Scale} label="Still owed" tint="bg-neg-soft text-neg"
        value={formatCurrency(summary.pendingPaise)}
        hint="Outstanding debt right now" />
      <Tile icon={HandCoins} label="Repaid so far" tint="bg-pos-soft text-pos"
        value={formatCurrency(summary.repaymentsPaise)}
        hint={`${summary.repaymentsCount} ${summary.repaymentsCount === 1 ? 'repayment' : 'repayments'} recorded`} />
      <Tile icon={ArrowRightLeft} label="Payments to make" tint="bg-sun-soft text-sun"
        value={String(suggestionCount)}
        hint="Suggested transfers pending" />
    </section>
  );
}
