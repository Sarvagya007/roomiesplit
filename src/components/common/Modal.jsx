import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: role=dialog, Escape closes, Tab is trapped, focus returns to the opener.
 * Key handling lives on the panel (not document) so stacked dialogs don't close each other.
 * Bottom sheet on mobile, centered card on larger screens.
 */
export default function Modal({ title, onClose, children, wide = false }) {
  const panel = useRef(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    const opener = document.activeElement;
    const el = panel.current;
    (el.querySelector('[data-autofocus]') ?? el.querySelector(FOCUSABLE))?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'Tab') {
      const items = [...panel.current.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] animate-fade sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-5 animate-pop sm:rounded-3xl sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-bold leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="btn-ghost !min-h-[36px] !rounded-xl !px-2">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
