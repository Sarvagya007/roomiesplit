import { ArrowRight, History, BadgeCheck } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatCurrency.js';

/** Read-only ledger of recorded repayments (kept separate from pending suggestions). */
export default function SettlementHistory({ settlements, roommates }) {
  const name = (id) => roommates.find((r) => r.id === id)?.name ?? 'Unknown';
  const list = [...settlements].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section className="card p-5" aria-labelledby="sh-h">
      <h2 id="sh-h" className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
        <History size={18} className="text-pos" /> Repayments
      </h2>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-soft p-4 text-center text-sm text-muted">No repayments recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 font-bold">
                  <span className="truncate">{name(s.fromId)}</span>
                  <ArrowRight size={14} className="shrink-0 text-muted" aria-label="paid" />
                  <span className="truncate">{name(s.toId)}</span>
                </span>
                <span className="font-extrabold">{formatCurrency(s.amountPaise)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>{formatDate(s.date)}{s.note ? ` · ${s.note}` : ''}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-pos-soft px-2 py-0.5 font-bold text-pos">
                  <BadgeCheck size={12} /> Completed
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
