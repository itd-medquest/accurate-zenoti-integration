'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getImportOverview } from '../services/imports.service';
import type { ImportOverview, ImportHistoryFilters } from '../types';

export function useImportOverview(filters: ImportHistoryFilters, revision: number) {
  const [data, setData] = useState<ImportOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  const pending = useRef(false);
  const load = useCallback(async () => {
    const id = ++request.current;
    pending.current = true;
    setBusy(true);
    try {
      const result = await getImportOverview(filters);
      if (id === request.current) {
        setData(result);
        setError('');
      }
    } catch (error) {
      if (id === request.current)
        setError(error instanceof Error ? error.message : 'Riwayat gagal dimuat.');
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
  }, [load, revision]);
  return { data, busy, error, load };
}
