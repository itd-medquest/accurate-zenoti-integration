'use client';

import { useCallback } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getImportOverview } from '../services/imports.service';
import type { ImportOverview, ImportHistoryFilters } from '../types';

export function useImportOverview(filters: ImportHistoryFilters, revision: number) {
  const fetcher = useCallback(
    (signal: AbortSignal) => getImportOverview(filters, signal),
    [filters],
  );
  return usePolledResource({
    fetcher,
    shouldPoll: processing,
    revision,
    fallback: 'Riwayat gagal dimuat.',
  });
}

const processing = (data: ImportOverview) => data.summary.processing > 0;
