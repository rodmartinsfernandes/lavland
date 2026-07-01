import type { ReactNode } from 'react';

type ActionVariant = 'primary' | 'success' | 'danger';

const variantClasses: Record<ActionVariant, string> = {
  primary: 'text-[var(--brand)] hover:bg-[var(--brand-soft)]',
  success: 'text-[var(--success)] hover:bg-[var(--success-soft)]',
  danger: 'text-[var(--danger)] hover:bg-[var(--danger-soft)]',
};

function ActionButton({
  label,
  onClick,
  variant,
  icon,
}: {
  label: string;
  onClick: () => void;
  variant: ActionVariant;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${variantClasses[variant]}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

export function RowActions({
  onPay,
  onEdit,
  onDelete,
  paidLabel,
}: {
  onPay?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  paidLabel?: string;
}) {
  if (paidLabel) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[#64748b]">
        <CheckIcon />
        {paidLabel}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {onPay ? (
        <ActionButton
          label="Dar baixa"
          onClick={onPay}
          variant="success"
          icon={<ReceiptIcon />}
        />
      ) : null}
      {onEdit ? (
        <ActionButton
          label="Editar"
          onClick={onEdit}
          variant="primary"
          icon={<PencilIcon />}
        />
      ) : null}
      {onDelete ? (
        <ActionButton
          label="Excluir"
          onClick={onDelete}
          variant="danger"
          icon={<TrashIcon />}
        />
      ) : null}
    </div>
  );
}
