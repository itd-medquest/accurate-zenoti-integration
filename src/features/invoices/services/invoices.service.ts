import { api } from '@/services/api-client';
import type { Detail } from '../types';

export function getInvoice(detailId: string) {
  return api<Detail>(`/invoices/${detailId}`);
}

export function syncInvoice(id: string) {
  return api(`/invoices/${id}/sync`, { method: 'POST' });
}

export function resolveMapping(id: string) {
  return api(`/invoices/${id}/resolve-mapping`, { method: 'POST' });
}
