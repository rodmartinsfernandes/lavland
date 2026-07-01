'use client';

import type { ToastItem, ToastType } from '@/lib/notifications';

const styles: Record<
  ToastType,
  { border: string; icon: string; bg: string }
> = {
  success: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-600 bg-emerald-50',
    bg: 'bg-white',
  },
  error: {
    border: 'border-l-red-500',
    icon: 'text-red-600 bg-red-50',
    bg: 'bg-white',
  },
  info: {
    border: 'border-l-[var(--brand)]',
    icon: 'text-[var(--brand)] bg-[var(--brand-soft)]',
    bg: 'bg-white',
  },
};

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[110] flex w-full max-w-sm flex-col gap-3"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] border-l-4 p-4 shadow-[var(--shadow-lg)] ${styles[item.type].border} ${styles[item.type].bg} ${
            item.exiting ? 'toast-exit' : 'toast-enter'
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles[item.type].icon}`}
          >
            <ToastIcon type={item.type} />
          </div>
          <p className="flex-1 pt-0.5 text-sm font-medium leading-snug text-[var(--foreground)]">
            {item.message}
          </p>
          <button
            type="button"
            aria-label="Fechar notificação"
            onClick={() => onDismiss(item.id)}
            className="shrink-0 rounded-md p-1 text-[#94a3b8] transition hover:bg-[#f1f5f9] hover:text-[#475569]"
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  if (type === 'error') {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }

  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
