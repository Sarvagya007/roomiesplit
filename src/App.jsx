import { useState } from 'react';
import { AlertTriangle, DatabaseZap } from 'lucide-react';
import useRoomieSplit from './hooks/useRoomieSplit.js';
import DashboardHeader from './components/dashboard/DashboardHeader.jsx';
import SummaryCards from './components/dashboard/SummaryCards.jsx';
import RoommateBalanceCard from './components/dashboard/RoommateBalanceCard.jsx';
import SpendingBreakdown from './components/dashboard/SpendingBreakdown.jsx';
import ExpenseForm from './components/expenses/ExpenseForm.jsx';
import ExpenseList from './components/expenses/ExpenseList.jsx';
import SettlementSuggestions from './components/settlements/SettlementSuggestions.jsx';
import SettlementHistory from './components/settlements/SettlementHistory.jsx';
import ActivityFeed from './components/settlements/ActivityFeed.jsx';
import OnboardingForm from './components/roommates/OnboardingForm.jsx';
import RoommateSettings from './components/roommates/RoommateSettings.jsx';
import ToastNotification from './components/common/ToastNotification.jsx';

export default function App() {
  const app = useRoomieSplit();
  const { data, derived, summary } = app;
  // modal: null | { type: 'expense', expense?: Expense } | { type: 'settings' }
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  if (!data.preferences.onboarded) {
    return (
      <>
        <OnboardingForm roommates={data.roommates} onComplete={app.completeOnboarding} />
        <ToastNotification toast={app.toast} onDismiss={app.dismissToast} />
      </>
    );
  }

  const hasActivity = data.expenses.length > 0 || data.settlements.length > 0;
  const theme = data.preferences.theme;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHeader
        roommates={data.roommates}
        theme={theme}
        onAddExpense={() => setModal({ type: 'expense' })}
        onOpenSettings={() => setModal({ type: 'settings' })}
        onToggleTheme={() => app.setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {app.problems.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-neg/40 bg-neg-soft p-4 text-sm font-semibold text-neg">
          <AlertTriangle className="shrink-0" size={20} />
          <div>
            <p>Something doesn&apos;t add up in the stored records. Balances may be unreliable.</p>
            <ul className="list-disc pl-5 font-normal">{app.problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </div>
      )}
      {app.saveFailed && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-sun/40 bg-sun-soft p-4 text-sm font-semibold text-sun">
          <DatabaseZap className="shrink-0" size={20} />
          Couldn&apos;t save to browser storage (it may be full or disabled). Export a backup from Settings so you don&apos;t lose data.
        </div>
      )}

      <section aria-label="Roommate balances" className="grid gap-4 md:grid-cols-3">
        {data.roommates.map((r) => (
          <RoommateBalanceCard
            key={r.id}
            roommate={r}
            paidPaise={derived.balances.byId[r.id].paid}
            outstandingPaise={derived.outstanding[r.id]}
          />
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SummaryCards summary={summary} suggestionCount={derived.suggestions.length} />
          <SettlementSuggestions
            suggestions={derived.suggestions}
            roommates={data.roommates}
            hasActivity={hasActivity}
            onRecord={app.recordPayment}
          />
        </div>
        <SpendingBreakdown expenses={data.expenses} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ExpenseList
            expenses={data.expenses}
            roommates={data.roommates}
            hasRepayments={data.settlements.length > 0}
            onAdd={() => setModal({ type: 'expense' })}
            onEdit={(expense) => setModal({ type: 'expense', expense })}
            onDelete={(expense) => app.removeExpense(expense.id)}
          />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <ActivityFeed data={data} />
          <SettlementHistory settlements={data.settlements} roommates={data.roommates} />
        </div>
      </div>

      <footer className="pb-4 text-center text-xs text-muted">
        Money stuff, sorted. Everything is stored privately in this browser only.
      </footer>

      {modal?.type === 'expense' && (
        <ExpenseForm
          key={modal.expense?.id ?? 'new'}
          roommates={data.roommates}
          expense={modal.expense ?? null}
          hasRepayments={data.settlements.length > 0}
          onSave={app.saveExpense}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'settings' && (
        <RoommateSettings
          data={data}
          onSaveRoommates={app.saveRoommates}
          onImport={app.importBackup}
          onReset={app.resetAll}
          onNotify={app.notify}
          onClose={closeModal}
        />
      )}
      <ToastNotification toast={app.toast} onDismiss={app.dismissToast} />
    </div>
  );
}
