'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { LaundryProvider } from '@/context/laundry-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

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

  return (
    <LaundryProvider>
      <div className="app-shell-bg flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </LaundryProvider>
  );
}
