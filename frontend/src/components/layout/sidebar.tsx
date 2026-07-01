'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LavlandLogo } from '@/components/brand/lavland-logo';
import { NavIcon } from '@/components/layout/nav-icons';
import { StoreSwitcher } from '@/components/layout/store-switcher';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', adminOnly: true },
  { href: '/relatorios', label: 'Relatórios', icon: 'relatorios', adminOnly: true },
  { href: '/operador', label: 'Início', icon: 'operador', operatorOnly: true },
  { href: '/receitas', label: 'Receitas', icon: 'receitas', adminOnly: false },
  { href: '/despesas', label: 'Despesas', icon: 'despesas', adminOnly: false },
  { href: '/contas', label: 'Contas a pagar', icon: 'contas', adminOnly: true },
  { href: '/maquinas', label: 'Máquinas', icon: 'maquinas', adminOnly: true },
  { href: '/estoque', label: 'Estoque', icon: 'estoque', adminOnly: false },
  { href: '/taxas', label: 'Taxas', icon: 'taxas', adminOnly: true },
  { href: '/unidades', label: 'Unidades', icon: 'lavanderia', adminOnly: true },
  { href: '/usuarios', label: 'Usuários', icon: 'usuarios', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  const items = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if ('operatorOnly' in item && item.operatorOnly && isAdmin) return false;
    return true;
  });

  const initials = user?.name
    ?.split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="px-5 py-6">
        <LavlandLogo
          variant="mark"
          href={isAdmin ? '/dashboard' : '/operador'}
          size="md"
          priority
        />
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Gestão Financeira
        </p>
      </div>

      <StoreSwitcher />

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-[var(--brand-soft)] to-[var(--accent-soft)] text-[var(--brand)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-white text-[var(--brand)] shadow-sm'
                    : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'
                }`}
              >
                <NavIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <div className="flex items-center gap-3">
          <div className="brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm">
            {initials ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {user?.name}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--brand)]"
        >
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
