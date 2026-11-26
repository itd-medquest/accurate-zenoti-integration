'use client';
import type { Actor } from '@/types';
import type { View } from '@/types/navigation';
import { useCallback, useEffect } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getDashboard } from '../services/dashboard.service';
import type { Dashboard } from '../types';

export function useDashboard({
  actor,
  view,
  branch,
  days,
  setError,
  enabled = true,
}: {
  actor: Actor | null;
  view: View;
  branch: string;
  days: string;
  setError: (message: string) => void;
  enabled?: boolean;
}) {
  const query = useCallback(() => {
    const params = new URLSearchParams({ days });
    if (branch) params.set('branch', branch);
    return params.toString();
  }, [days, branch]);
  const fetcher = useCallback(
    (signal: AbortSignal) => getDashboard(query(), signal),
    [query, actor?.id],
  );
  const active = !!actor && view === 'dashboard' && enabled;
  const {
    data: dashboard,
    setData: setDashboard,
    load,
    busy,
    error,
  } = usePolledResource({
    fetcher,
    shouldPoll: processing,
    enabled: active,
    fallback: 'Gagal memuat data.',
  });
  useEffect(() => {
    if (active) setError(error);
  }, [active, error, dashboard, setError]);
  return { dashboard, setDashboard, loaded: !!dashboard, load, busy };
}

// Pending invoices may still be drafts; only an executing job warrants polling.
const processing = (data: Dashboard) => data.summary.processing > 0;
