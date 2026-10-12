import { Activity, Plus, HandCoins, Pencil, Trash2 } from 'lucide-react';
import { buildActivityFeed, todayISO } from '../../utils/finance.js';
import { formatCurrency, formatDate } from '../../utils/formatCurrency.js';

const KIND = {
  expense: { Icon: Plus, cls: 'bg-brand-soft text-brand' },
  repayment: { Icon: HandCoins, cls: 'bg-pos-soft text-pos' },
  edit: { Icon: Pencil, cls: 'bg-sun-soft text-sun' },
  delete: { Icon: Trash2, cls: 'bg-neg-soft text-neg' },
};

/** Recent activity, generated purely from stored records. */
export default function ActivityFeed({ data }) {
  const items = buildActivityFeed(data).slice(0, 10);
  return (
    <section className="card p-5" aria-labelledby="act-h">
      <h2 id="act-h" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <Activity size={18} className="text-lilac" /> Recent activity
      </h2>
      {items.length === 0 ? (
        <p className="rounded-2xl bg-soft p-4 text-center text-sm text-muted">Quiet house. Activity shows up here as you add expenses and repayments.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((i) => {
            const { Icon, cls } = KIND[i.kind];
            return (
              <li key={i.id} className="flex items-start gap-3 text-sm">
                <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cls}`} aria-hidden="true"><Icon size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {i.text}
                    {i.amountPaise ? <span className="text-muted"> — {formatCurrency(i.amountPaise)}</span> : null}
                    {i.detail ? <span className="text-muted"> ({i.detail})</span> : null}
                  </p>
                  <p className="text-xs text-muted">{formatDate(todayISO(new Date(i.at)))}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
