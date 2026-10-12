import { useEffect } from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

const TONES = {
  success: { Icon: CheckCircle2, cls: 'text-pos' },
  info: { Icon: Info, cls: 'text-brand' },
  warn: { Icon: AlertTriangle, cls: 'text-sun' },
  error: { Icon: XCircle, cls: 'text-neg' },
};

/** Small auto-dismissing notification (announced politely to screen readers). */
export default function ToastNotification({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDismiss, toast.tone === 'warn' || toast.tone === 'error' ? 7000 : 3200);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const { Icon, cls } = TONES[toast.tone] ?? TONES.success;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div key={toast.id} role="status" aria-live="polite" className="card pointer-events-auto flex max-w-md items-start gap-3 px-4 py-3 text-sm font-semibold animate-rise">
        <Icon size={20} className={`mt-0.5 shrink-0 ${cls}`} />
        <span>{toast.message}</span>
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="-mr-1 rounded-lg p-1 text-muted hover:bg-soft">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
