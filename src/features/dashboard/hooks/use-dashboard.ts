'use client';
import type { Actor } from '@/types';
import type { View } from '@/types/navigation';
import { useCallback, useEffect, useState, type RefObject } from 'react';
import { getDashboard } from '../services/dashboard.service';
import type { Dashboard } from '../types';

export function useDashboard({
  actor,
  view,
  branch,
  days,
  setError,
  requestRef,
  enabled = true,
}: {
  actor: Actor | null;
  view: View;
  branch: string;
  days: string;
  setError: (message: string) => void;
  requestRef: RefObject<number>;
  enabled?: boolean;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loaded, setLoaded] = useState(false);
  const query = useCallback(() => {
    const params = new URLSearchParams({ days });
    if (branch) params.set('branch', branch);
    return params.toString();
  }, [days, branch]);
  const load = useCallback(async () => {
    if (!actor || view !== 'dashboard' || !enabled) return;
    const request = ++requestRef.current;
    try {
      const d = await getDashboard(query());
      if (request !== requestRef.current) return;
      setDashboard(d);
      setError('');
      setLoaded(true);
    } catch (e) {
      if (request === requestRef.current)
        setError(e instanceof Error ? e.message : 'Gagal memuat data.');
    }
  }, [actor, view, query, enabled]);
  useEffect(() => {
    if (!actor || view !== 'dashboard' || !enabled) return;
    setLoaded(false);
    load();
    const timer = setInterval(load, 6000);
    return () => {
      clearInterval(timer);
      ++requestRef.current;
    };
  }, [load, actor]);
  return { dashboard, setDashboard, loaded, load };
}
