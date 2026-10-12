import { Search, X } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants.js';

export const EMPTY_FILTERS = { payerId: '', category: '', from: '', to: '', query: '', sort: 'newest' };

export default function ExpenseFilters({ filters, onChange, roommates }) {
  const set = (k) => (e) => onChange({ ...filters, [k]: e.target.value });
  const active = filters.payerId || filters.category || filters.from || filters.to || filters.query;
  return (
    <div className="space-y-3" role="search" aria-label="Filter expenses">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input aria-label="Search expenses" className="input !pl-9" placeholder="Search by description or note" value={filters.query} onChange={set('query')} />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <select aria-label="Filter by who paid" className="input" value={filters.payerId} onChange={set('payerId')}>
          <option value="">Anyone paid</option>
          {roommates.map((r) => <option key={r.id} value={r.id}>{r.name} paid</option>)}
        </select>
        <select aria-label="Filter by category" className="input" value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Sort order" className="input col-span-2 lg:col-span-1" value={filters.sort} onChange={set('sort')}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">From
          <input type="date" className="input" value={filters.from} max={filters.to || undefined} onChange={set('from')} />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-muted">To
          <input type="date" className="input" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
        </label>
        {active && (
          <button type="button" className="btn-ghost" onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}>
            <X size={16} /> Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
