'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { Laundry, PaginatedResponse } from '@/types/entities';

const STORAGE_KEY = 'lavland_active_laundry';

interface LaundryContextValue {
  laundryId: string | null;
  laundryName: string;
  laundries: Laundry[];
  loading: boolean;
  error: string;
  isAdmin: boolean;
  canSwitch: boolean;
  setActiveLaundry: (id: string) => void;
  refreshLaundries: () => Promise<void>;
}

const LaundryContext = createContext<LaundryContextValue | null>(null);

export function LaundryProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [laundries, setLaundries] = useState<Laundry[]>([]);
  const [laundryId, setLaundryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const resolveActiveLaundry = useCallback(
    (items: Laundry[]) => {
      if (items.length === 0) {
        setLaundryId(null);
        setError('Nenhuma unidade cadastrada');
        return;
      }

      if (!isAdmin && user?.laundryId) {
        const assigned = items.find((item) => item.id === user.laundryId);
        if (assigned) {
          setLaundryId(assigned.id);
          setError('');
          return;
        }
        setLaundryId(user.laundryId);
        setError('Unidade do operador não encontrada');
        return;
      }

      const stored =
        typeof window !== 'undefined'
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      const selected = items.find((item) => item.id === stored) ?? items[0];
      setLaundryId(selected.id);
      setError('');
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, selected.id);
      }
    },
    [isAdmin, user?.laundryId],
  );

  const refreshLaundries = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api<PaginatedResponse<Laundry>>(
        '/laundries?limit=100',
      );
      setLaundries(response.data);
      resolveActiveLaundry(response.data);
    } catch {
      setError('Erro ao carregar unidades');
      setLaundries([]);
      setLaundryId(null);
    } finally {
      setLoading(false);
    }
  }, [user, resolveActiveLaundry]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLaundries([]);
      setLaundryId(null);
      setLoading(false);
      return;
    }

    refreshLaundries();
  }, [authLoading, user, refreshLaundries]);

  const setActiveLaundry = useCallback(
    (id: string) => {
      if (!isAdmin) return;
      setLaundryId(id);
      localStorage.setItem(STORAGE_KEY, id);
    },
    [isAdmin],
  );

  const laundryName =
    laundries.find((item) => item.id === laundryId)?.name ?? '';

  const value = useMemo(
    () => ({
      laundryId,
      laundryName,
      laundries,
      loading: authLoading || loading,
      error,
      isAdmin,
      canSwitch: isAdmin && laundries.length > 1,
      setActiveLaundry,
      refreshLaundries,
    }),
    [
      laundryId,
      laundryName,
      laundries,
      authLoading,
      loading,
      error,
      isAdmin,
      setActiveLaundry,
      refreshLaundries,
    ],
  );

  return (
    <LaundryContext.Provider value={value}>{children}</LaundryContext.Provider>
  );
}

export function useLaundry() {
  const context = useContext(LaundryContext);
  if (!context) {
    throw new Error('useLaundry deve ser usado dentro de LaundryProvider');
  }
  return context;
}
