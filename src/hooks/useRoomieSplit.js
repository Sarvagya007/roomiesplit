import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDefaultData, deriveState, addExpense, updateExpense, deleteExpense, recordSettlement,
  buildExpenseRecord, buildSettlementRecord, updateRoommates, calculateSummary, checkInvariants,
} from '../utils/finance.js';
import { loadStoredData, saveStoredData, clearStoredData } from '../utils/storage.js';

/**
 * Single source of UI state. `data` (roommates, expenses, settlements, auditLog, preferences)
 * is the only thing persisted; balances/suggestions are always derived from it.
 */
export default function useRoomieSplit() {
  const [boot] = useState(() => loadStoredData());
  const [data, setData] = useState(() => boot.data ?? createDefaultData());
  const [toast, setToast] = useState(boot.status === 'corrupt'
    ? { id: 0, tone: 'warn', message: 'Saved data was unreadable, so we started fresh. A copy of the old data was kept in your browser.' }
    : null);
  const [saveFailed, setSaveFailed] = useState(false);
  const toastId = useRef(1);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Persist on every change (idempotent, so StrictMode's double effects are harmless).
  useEffect(() => {
    setSaveFailed(!saveStoredData(data));
  }, [data]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', data.preferences.theme === 'dark');
  }, [data.preferences.theme]);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ id: toastId.current++, tone, message });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const derived = useMemo(() => deriveState(data), [data]);
  const summary = useMemo(
    () => calculateSummary(data.expenses, derived.outstanding, undefined, data.settlements),
    [data, derived],
  );
  const problems = useMemo(() => checkInvariants(data.expenses, data.roommates, data.settlements), [data]);

  /** value comes from validateExpense (it carries a draft id so double-submits are idempotent). */
  const saveExpense = useCallback((value, existing) => {
    const record = buildExpenseRecord(value, dataRef.current.roommates, existing);
    setData((d) => (existing ? updateExpense(d, record) : addExpense(d, record)));
    notify(existing ? 'Expense updated. Balances recalculated.' : 'Expense added. Balances updated!');
  }, [notify]);

  const removeExpense = useCallback((id) => {
    setData((d) => deleteExpense(d, id));
    notify('Expense deleted. Balances recalculated.', 'info');
  }, [notify]);

  const recordPayment = useCallback(({ suggestion, amountPaise, note, id }) => {
    try {
      const d = dataRef.current;
      const record = buildSettlementRecord({ suggestion, amountPaise, note, id, outstandingBefore: deriveState(d).outstanding });
      const next = recordSettlement(d, record);
      setData(next);
      notify('Payment recorded. Nice teamwork!');
    } catch (e) {
      notify(e.message, 'error');
    }
  }, [notify]);

  const saveRoommates = useCallback((edits) => {
    setData((d) => updateRoommates(d, edits));
    notify('Roommates updated.');
  }, [notify]);

  const completeOnboarding = useCallback((edits) => {
    setData((d) => {
      const next = updateRoommates(d, edits);
      return { ...next, preferences: { ...next.preferences, onboarded: true } };
    });
  }, []);

  const setTheme = useCallback((theme) => {
    setData((d) => ({ ...d, preferences: { ...d.preferences, theme } }));
  }, []);

  const importBackup = useCallback((imported) => {
    setData({ ...imported, preferences: { ...imported.preferences, onboarded: true } });
    notify('Backup restored.');
  }, [notify]);

  const resetAll = useCallback(() => {
    clearStoredData();
    setData(createDefaultData());
    notify('All data cleared.', 'info');
  }, [notify]);

  return {
    data, derived, summary, problems, saveFailed, toast, dismissToast, notify,
    saveExpense, removeExpense, recordPayment, saveRoommates, completeOnboarding,
    setTheme, importBackup, resetAll,
  };
}
