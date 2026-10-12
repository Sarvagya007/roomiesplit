import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import { formatCurrency } from '../../utils/formatCurrency.js';

/** Status is always conveyed with an icon + words, never colour alone. */
export default function RoommateBalanceCard({ roommate, paidPaise, outstandingPaise }) {
  const state = outstandingPaise > 0 ? 'owed' : outstandingPaise < 0 ? 'owes' : 'settled';
  const cfg = {
    owed: { label: "You're owed", Icon: TrendingUp, chip: 'bg-pos-soft text-pos', amount: 'text-pos' },
    owes: { label: 'You owe', Icon: TrendingDown, chip: 'bg-neg-soft text-neg', amount: 'text-neg' },
    settled: { label: 'All settled', Icon: CheckCircle2, chip: 'bg-brand-soft text-brand-ink', amount: 'text-ink' },
  }[state];

  return (
    <article className="card p-5 transition hover:-translate-y-0.5" aria-label={`${roommate.name}: ${cfg.label} ${formatCurrency(Math.abs(outstandingPaise))}`}>
      <div className="flex items-center gap-3">
        <Avatar roommate={roommate} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold">{roommate.name}</h3>
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.chip}`}>
            <cfg.Icon size={13} /> {cfg.label}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div key={outstandingPaise} className={`font-display text-3xl font-extrabold animate-bump ${cfg.amount}`}>
          {formatCurrency(outstandingPaise, { showSign: true })}
        </div>
        <div className="text-right text-xs text-muted">
          Paid so far
          <div className="text-sm font-bold text-ink">{formatCurrency(paidPaise)}</div>
        </div>
      </div>
    </article>
  );
}
