import { useState } from 'react';
import { Home, ArrowRight } from 'lucide-react';
import RoommateFields, { toDraft } from './RoommateFields.jsx';
import { validateRoommateNames } from '../../utils/finance.js';

/** First-visit screen: name the household (A, B, C are pre-filled and can be kept). */
export default function OnboardingForm({ roommates, onComplete }) {
  const [draft, setDraft] = useState(() => toDraft(roommates));
  const [showErr, setShowErr] = useState(false);
  const error = validateRoommateNames(roommates.map((r) => draft[r.id].name));

  const submit = (e) => {
    e.preventDefault();
    if (error) return setShowErr(true);
    onComplete(draft);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand text-white shadow-card dark:text-page" aria-hidden="true"><Home size={30} /></span>
        <h1 className="font-display text-4xl font-extrabold">Welcome to Roomie<span className="text-brand">Split</span></h1>
        <p className="mt-2 text-muted">Shared life. Clear balances. Who&apos;s in the house?</p>
      </div>
      <form onSubmit={submit} noValidate className="card space-y-4 p-5">
        <RoommateFields roommates={roommates} draft={draft} onChange={setDraft} />
        <p className="err" role="alert">{showErr && error}</p>
        <button type="submit" className="btn-primary w-full" disabled={!!error && showErr}>Let&apos;s go <ArrowRight size={18} /></button>
        <button type="button" className="btn-ghost w-full" onClick={() => onComplete({})}>Keep A, B &amp; C for now</button>
        <p className="text-center text-xs text-muted">You can rename anyone later in Settings. Past expenses stay put.</p>
      </form>
    </main>
  );
}
