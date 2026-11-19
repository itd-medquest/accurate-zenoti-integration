'use client';

import { useCallback } from 'react';
import { usePolledResource } from '@/hooks/use-polled-resource';
import { getNotifications } from '../services/notifications.service';
import type { NotificationPage } from '../types';

export function useNotifications(actorId: string | undefined, page = 1, pageSize = 5) {
  const fetcher = useCallback(
    (signal: AbortSignal) => getNotifications(page, pageSize, signal),
    [actorId, page, pageSize],
  );
  const { data, error, busy, load } = usePolledResource<NotificationPage>({
    fetcher,
    shouldPoll: () => false,
    enabled: !!actorId,
    fallback: 'Notifikasi gagal dimuat.',
  });
  return { data, error, busy, refresh: load };
}
