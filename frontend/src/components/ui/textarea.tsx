import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export function Textarea({ label, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label htmlFor={textareaId} className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <textarea
        id={textareaId}
        className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] ${className}`}
        rows={3}
        {...props}
      />
    </label>
  );
}
