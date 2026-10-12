import { Home, Plus, Settings, Moon, Sun } from 'lucide-react';
import Avatar from '../common/Avatar.jsx';

/** Top bar + friendly welcome section. */
export default function DashboardHeader({ roommates, theme, onAddExpense, onOpenSettings, onToggleTheme }) {
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white dark:text-page" aria-hidden="true">
            <Home size={20} strokeWidth={2.4} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">
            Roomie<span className="text-brand">Split</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost !px-3" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button type="button" className="btn-ghost !px-3 sm:!px-4" onClick={onOpenSettings}>
            <Settings size={18} /> <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex -space-x-2" aria-label={`Household: ${roommates.map((r) => r.name).join(', ')}`}>
            {roommates.map((r) => <Avatar key={r.id} roommate={r} size="sm" ring />)}
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Shared life.<br className="sm:hidden" /> <span className="text-brand">Clear balances.</span>
          </h1>
          <p className="mt-2 max-w-md text-base text-muted">
            Your room&apos;s money, minus the awkward conversations.
          </p>
        </div>
        <button type="button" className="btn-primary !min-h-[52px] !px-6 text-base shadow-card" onClick={onAddExpense}>
          <Plus size={20} strokeWidth={2.6} /> Add Expense
        </button>
      </div>
    </header>
  );
}
