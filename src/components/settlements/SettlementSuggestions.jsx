import { useRef, useState } from 'react';
import { ArrowRight, HandCoins, PartyPopper } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import ConfirmationDialog from '../common/ConfirmationDialog.jsx';
import { convertToPaise, makeId } from '../../utils/finance.js';
import { formatCurrency } from '../../utils/formatCurrency.js';

function RecordPaymentDialog({ suggestion, from, to, onConfirm, onCancel }) {
  const draftId = useRef(makeId('stl')); // stable per dialog => double-click can't create two records
  const done = useRef(false);
  const [amount, setAmount] = useState((suggestion.amountPaise / 100).toFixed(2));
  const [note, setNote] = useState('');
  const paise = convertToPaise(amount);
  let error = '';
  if (paise === null || paise <= 0) error = 'Enter a valid amount greater than zero (max 2 decimals).';
  else if (paise > suggestion.amountPaise) error = `That's more than the suggested ${formatCurrency(suggestion.amountPaise)}. Record up to the amount owed.`;

  return (
    <ConfirmationDialog
      title="Record this payment?"
      confirmLabel="Yes, it was paid"
      confirmDisabled={!!error}
      onCancel={onCancel}
      onConfirm={() => {
        if (done.current || error) return;
        done.current = true;
        onConfirm({ suggestion, amountPaise: paise, note: note.trim(), id: draftId.current });
      }}
    >
      <div className="flex items-center justify-center gap-3 rounded-2xl bg-soft p-4">
        <div className="flex flex-col items-center gap-1"><Avatar roommate={from} /><span className="text-sm font-bold">{from.name}</span></div>
        <ArrowRight className="text-muted" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1"><Avatar roommate={to} /><span className="text-sm font-bold">{to.name}</span></div>
      </div>
      <p className="text-center font-bold">{from.name} paid {to.name}</p>
      <div>
        <label htmlFor="pay-amt" className="label">Amount paid (₹)</label>
        <input id="pay-amt" data-autofocus className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!error} aria-describedby="pay-amt-e" />
        <p id="pay-amt-e" className="err" role="alert">{error}</p>
      </div>
      <div>
        <label htmlFor="pay-note" className="label">Note <span className="font-normal normal-case">(optional)</span></label>
        <input id="pay-note" className="input" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. UPI, cash" />
      </div>
      <p className="text-xs text-muted">RoomieSplit only keeps a record. It doesn&apos;t move any money. Confirm only after the payment has really happened.</p>
    </ConfirmationDialog>
  );
}

export default function SettlementSuggestions({ suggestions, roommates, hasActivity, onRecord }) {
  const [active, setActive] = useState(null);
  const find = (id) => roommates.find((r) => r.id === id);

  return (
    <section className="card p-5" aria-labelledby="settle-h">
      <h2 id="settle-h" className="mb-1 flex items-center gap-2 font-display text-lg font-bold">
        <HandCoins size={18} className="text-brand" /> Settle up
      </h2>
      <p className="mb-4 text-sm text-muted">The fewest payments that square everyone. Suggestions only. Nothing counts until you record it.</p>

      {suggestions.length === 0 ? (
        <div className="rounded-2xl bg-brand-soft p-6 text-center text-brand-ink">
          <PartyPopper className="mx-auto" aria-hidden="true" />
          <p className="mt-2 font-display text-lg font-bold">{hasActivity ? "You're all squared up! 🎉" : 'Nothing to settle yet'}</p>
          <p className="text-sm">{hasActivity ? 'No awkward money conversations needed.' : 'Add an expense and suggested payments will appear here.'}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {suggestions.map((s) => {
            const from = find(s.fromId);
            const to = find(s.toId);
            return (
              <li key={s.id} className="flex flex-col gap-3 rounded-2xl border border-line p-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar roommate={from} size="sm" />
                  <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                  <Avatar roommate={to} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{from.name} pays {to.name}</p>
                    <p className="font-display text-xl font-extrabold text-neg">{formatCurrency(s.amountPaise)}</p>
                  </div>
                </div>
                <button type="button" className="btn-primary" onClick={() => setActive(s)}>Record Payment</button>
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <RecordPaymentDialog
          suggestion={active}
          from={find(active.fromId)}
          to={find(active.toId)}
          onCancel={() => setActive(null)}
          onConfirm={(payload) => { onRecord(payload); setActive(null); }}
        />
      )}
    </section>
  );
}
