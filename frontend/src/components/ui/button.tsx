import { forwardRef, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}

const variants = {
  primary:
    'brand-gradient text-white shadow-md shadow-fuchsia-500/20 hover:opacity-90 hover:shadow-lg hover:shadow-fuchsia-500/25 disabled:opacity-60',
  secondary:
    'border border-[var(--border)] bg-white text-[var(--foreground)] shadow-[var(--shadow-sm)] hover:border-[var(--brand-muted)] hover:bg-[var(--brand-soft)]/40',
  ghost:
    'bg-transparent text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]',
  danger:
    'bg-[var(--danger)] text-white hover:bg-red-600 disabled:opacity-60',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    loading,
    className = '',
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Carregando...' : children}
    </button>
  );
});
