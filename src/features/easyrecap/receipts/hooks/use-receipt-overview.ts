'use client';
import { useCallback } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getReceiptOverview } from '../services/receipts.service';
import type { ReceiptFilters, ReceiptOverview } from '../types';

export function useReceiptOverview(filters: ReceiptFilters, enabled = true) {
  const fetcher = useCallback(
    (signal: AbortSignal) => getReceiptOverview(filters, signal),
    [filters],
  );
  return usePolledResource({
    fetcher,
    shouldPoll: processing,
    enabled,
    fallback: 'Penerimaan gagal dimuat.',
  });
}

const processing = (data: ReceiptOverview) => data.summary.processing > 0;
