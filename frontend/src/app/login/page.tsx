'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyError } from '@/lib/notifications';
import { useAuth } from '@/context/auth-context';
import { LavlandLogo } from '@/components/brand/lavland-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('admin@lavland.local');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === 'ADMIN' ? '/dashboard' : '/operador');
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="app-shell-bg flex min-h-screen items-center justify-center text-[var(--muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-muted)] border-t-[var(--brand)]" />
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      router.push(loggedUser.role === 'ADMIN' ? '/dashboard' : '/operador');
    } catch (err) {
      notifyError(err, 'Não foi possível entrar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell-bg flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LavlandLogo variant="mark" size="lg" priority />
          <p className="mt-4 text-sm text-[var(--muted)]">
            Gestão financeira da sua unidade
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface)] p-8 shadow-[var(--shadow-lg)]">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Entre com suas credenciais para continuar
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="mt-2 w-full" loading={submitting}>
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
