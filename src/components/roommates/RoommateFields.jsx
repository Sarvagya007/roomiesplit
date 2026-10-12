import Avatar from '../common/Avatar.jsx';
import { AVATAR_COLORS, AVATAR_ICONS } from '../../utils/constants.js';

/** Shared editor for the three roommates' name, colour and animal. draft = { [id]: { name, color, icon } } */
export default function RoommateFields({ roommates, draft, onChange }) {
  const patch = (id, p) => onChange({ ...draft, [id]: { ...draft[id], ...p } });
  return (
    <div className="space-y-4">
      {roommates.map((r, idx) => {
        const d = draft[r.id];
        return (
          <fieldset key={r.id} className="rounded-2xl border border-line p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted">Roomie {idx + 1}</legend>
            <div className="flex items-center gap-3">
              <Avatar roommate={d} size="lg" />
              <div className="flex-1">
                <label htmlFor={`rn-${r.id}`} className="sr-only">Name of roommate {idx + 1}</label>
                <input id={`rn-${r.id}`} className="input" value={d.name} maxLength={24} onChange={(e) => patch(r.id, { name: e.target.value })} placeholder={`Roomie ${idx + 1}`} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`Colour for ${d.name || `roommate ${idx + 1}`}`}>
              {AVATAR_COLORS.map((c, i) => (
                <button key={c.name} type="button" role="radio" aria-checked={d.color === i} aria-label={c.name}
                  onClick={() => patch(r.id, { color: i })}
                  className={`h-8 w-8 rounded-full border-2 transition ${d.color === i ? 'scale-110 border-ink' : 'border-transparent'}`}
                  style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Animal for ${d.name || `roommate ${idx + 1}`}`}>
              {AVATAR_ICONS.map((name, i) => (
                <button key={name} type="button" role="radio" aria-checked={d.icon === i} aria-label={name}
                  onClick={() => patch(r.id, { icon: i })}
                  className={`rounded-2xl border-2 p-0.5 transition ${d.icon === i ? 'border-ink' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <Avatar roommate={{ ...d, icon: i }} size="sm" />
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

export const toDraft = (roommates) =>
  Object.fromEntries(roommates.map((r) => [r.id, { name: r.name, color: r.color, icon: r.icon }]));
