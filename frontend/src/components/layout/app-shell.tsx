'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { LavlandLogo } from '@/components/brand/lavland-logo';
import { Sidebar } from '@/components/layout/sidebar';
import { LaundryProvider } from '@/context/laundry-context';

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  if (loading) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center text-[var(--muted)]">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-[var(--shadow-md)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand-muted)] border-t-[var(--brand)]" />
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const homeHref = isAdmin ? '/dashboard' : '/operador';

  return (
    <LaundryProvider>
      <div className="app-shell-bg flex min-h-screen">
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            onNavigate={() => setMobileOpen(false)}
            onClose={() => setMobileOpen(false)}
            showCloseButton
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)] lg:hidden">
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground)] transition hover:bg-white"
            >
              <MenuIcon />
            </button>
            <LavlandLogo variant="mark" href={homeHref} size="sm" />
          </header>

          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </LaundryProvider>
  );
}
