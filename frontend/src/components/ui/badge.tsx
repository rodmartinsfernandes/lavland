const variants = {
  default: 'bg-[var(--surface-muted)] text-[var(--muted)]',
  success: 'bg-[var(--success-soft)] text-emerald-700',
  warning: 'bg-[var(--warning-soft)] text-amber-700',
  danger: 'bg-[var(--danger-soft)] text-red-700',
  info: 'bg-[var(--accent-soft)] text-cyan-700',
};

export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}
    >
      {children}
    </span>
  );
}
