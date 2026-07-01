import { ApiError } from '@/lib/api';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

interface NotificationHandlers {
  showToast: (type: ToastType, message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

let handlers: NotificationHandlers | null = null;

export function registerNotificationHandlers(next: NotificationHandlers) {
  handlers = next;
}

export function unregisterNotificationHandlers() {
  handlers = null;
}

function showToast(type: ToastType, message: string) {
  handlers?.showToast(type, message);
}

export const toast = Object.assign(
  (message: string) => showToast('info', message),
  {
    success: (message: string) => showToast('success', message),
    error: (message: string) => showToast('error', message),
    info: (message: string) => showToast('info', message),
  },
);

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!handlers) {
    return Promise.resolve(false);
  }
  return handlers.confirm(options);
}

export async function confirmDelete(
  message: string,
  title = 'Excluir registro?',
) {
  return confirmAction({
    title,
    message,
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    variant: 'danger',
  });
}

export function notifyError(err: unknown, fallback: string) {
  toast.error(err instanceof ApiError ? err.message : fallback);
}
