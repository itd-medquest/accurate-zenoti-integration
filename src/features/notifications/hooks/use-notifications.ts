'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getNotifications } from '../services/notifications.service';
import type { NotificationPage } from '../types';

export function useNotifications(actorId: string | undefined, page = 1, pageSize = 5) {
  const [data, setData] = useState<NotificationPage | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    if (!actorId) return;
    const id = ++request.current;
    setBusy(true);
    try {
      const result = await getNotifications(page, pageSize);
      if (id !== request.current) return;
      setData(result);
      setError('');
    } catch (error) {
      if (id === request.current)
        setError(error instanceof Error ? error.message : 'Notifikasi gagal dimuat.');
    } finally {
      if (id === request.current) setBusy(false);
    }
  }, [actorId, page, pageSize]);

  useEffect(() => {
    setData(null);
    setError('');
    if (!actorId) return;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => {
      clearInterval(timer);
      ++request.current;
    };
  }, [actorId, refresh]);

  return { data, error, busy, refresh };
}
