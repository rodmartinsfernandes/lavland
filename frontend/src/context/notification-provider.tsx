'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ToastStack } from '@/components/ui/toast-stack';
import {
  ConfirmOptions,
  ToastItem,
  ToastType,
  registerNotificationHandlers,
  unregisterNotificationHandlers,
} from '@/lib/notifications';

const TOAST_DURATION: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  info: 4500,
};

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<PendingConfirm | null>(null);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, exiting: true } : item,
      ),
    );

    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 200);
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, type, message }]);

      const timer = setTimeout(() => dismissToast(id), TOAST_DURATION[type]);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    registerNotificationHandlers({ showToast, confirm });
    return () => {
      unregisterNotificationHandlers();
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [showToast, confirm]);

  function closeConfirm(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  return (
    <>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmState ? (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          variant={confirmState.variant}
          onConfirm={() => closeConfirm(true)}
          onCancel={() => closeConfirm(false)}
        />
      ) : null}
    </>
  );
}
