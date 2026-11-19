import { api } from '@/services/api-client';
import type { NotificationPage } from '../types';

// Reuse saved invoice statuses; no synthetic messages or unread counts.
export function getNotifications(page: number, pageSize: number, signal?: AbortSignal) {
  const query = new URLSearchParams({
    days: '366',
    page: String(page),
    pageSize: String(pageSize),
  });
  return api<NotificationPage>(`/invoices?${query}`, { signal });
}
