import { api } from '@/services/api-client';
import type { AccurateMaster, AccurateStatus, DeliveredInvoice } from '../types/accurate';
export const getAccurateStatus = () => api<AccurateStatus>('/accurate/status');
export const getDeliveredInvoices = () => api<DeliveredInvoice[]>('/accurate/delivered-invoices');
export function searchAccurateMasters(
  kind: 'customer' | 'item' | 'branch',
  search: string,
  page = 1,
) {
  return api<{ database: { id: string; name: string }; items: AccurateMaster[] }>(
    `/accurate/masters?${new URLSearchParams({ kind, search, page: String(page) })}`,
  );
}
export function saveAccurateDestination(branchId: string, targetBranchId: string) {
  return api<AccurateStatus>(`/accurate/destinations/${encodeURIComponent(branchId)}`, {
    method: 'PUT',
    body: JSON.stringify({ targetBranchId }),
  });
}
export function saveAccurateMapping(
  batchId: string,
  rowId: string,
  input: { version: number; kind: 'customer' | 'item'; itemId?: string; masterId: string },
) {
  return api(`/accurate/imports/${batchId}/rows/${rowId}/mapping`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
