import { api } from '@/services/api-client';
import type { Detail } from '../types';

export function getInvoice(detailId: string, signal?: AbortSignal) {
  return api<Detail>(`/invoices/${detailId}`, { signal });
}

export function syncInvoice(id: string) {
  return api(`/invoices/${id}/sync`, { method: 'POST' });
}

export function resolveMapping(id: string) {
  return api(`/invoices/${id}/resolve-mapping`, { method: 'POST' });
}
