import type { ReactNode } from 'react';

const icons: Record<string, ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  relatorios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M4 20V10" strokeLinecap="round" />
      <path d="M10 20V4" strokeLinecap="round" />
      <path d="M16 20v-6" strokeLinecap="round" />
      <path d="M22 20H2" strokeLinecap="round" />
    </svg>
  ),
  operador: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinejoin="round" />
    </svg>
  ),
  receitas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  despesas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  contas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  maquinas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <circle cx="12" cy="14" r="4" />
      <path d="M8 6h.01M16 6h.01" strokeLinecap="round" />
    </svg>
  ),
  estoque: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="m7.5 4.27 9 5.15M3 8.5v7l9 5.15M21 8.5v7l-9 5.15M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" strokeLinejoin="round" />
    </svg>
  ),
  taxas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" />
    </svg>
  ),
  lavanderia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" strokeLinejoin="round" />
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-[18px] w-[18px]">
      <circle cx="9" cy="7" r="4" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" strokeLinecap="round" />
    </svg>
  ),
};

export function NavIcon({ name }: { name: string }) {
  return icons[name] ?? icons.dashboard;
}
