'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function HomePage() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    router.replace(isAdmin ? '/dashboard' : '/operador');
  }, [user, loading, isAdmin, router]);

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center text-[var(--muted)]">
      Carregando...
    </div>
  );
}
