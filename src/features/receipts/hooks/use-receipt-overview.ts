'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getReceiptOverview } from '../services/receipts.service';
import type { ReceiptFilters, ReceiptOverview } from '../types';

export function useReceiptOverview(filters: ReceiptFilters) {
  const [data, setData] = useState<ReceiptOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const pending = useRef(false);
  const load = useCallback(async () => {
    const id = ++request.current;
    pending.current = true;
    setBusy(true);
    try {
      const result = await getReceiptOverview(filters);
      if (id === request.current) {
        setData(result);
        setError('');
      }
    } catch (cause) {
      if (id === request.current)
        setError(cause instanceof Error ? cause.message : 'Penerimaan gagal dimuat.');
    } finally {
      if (id === request.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  }, [filters]);
  useEffect(() => {
    const debounce = setTimeout(() => void load(), 250);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible' && !pending.current) void load();
    }, 6000);
    return () => {
      clearTimeout(debounce);
      clearInterval(poll);
      ++request.current;
      pending.current = false;
    };
  }, [load]);
  return { data, busy, error, load };
}
