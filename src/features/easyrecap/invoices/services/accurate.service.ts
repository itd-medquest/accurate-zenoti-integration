import { api } from '@/services/api-client';
import type {
  AccurateMaster,
  AccurateStatus,
  DeliveredInvoice,
  CustomerPreparation,
} from '../types/accurate';
export const getAccurateStatus = (branchId?: string, signal?: AbortSignal) =>
  api<AccurateStatus>(
    `/accurate/status${branchId ? `?${new URLSearchParams({ branchId })}` : ''}`,
    { signal },
  );
export const getDeliveredInvoices = () => api<DeliveredInvoice[]>('/accurate/delivered-invoices');
export function prepareAccurateCustomer(batchId: string, rowId: string, version: number) {
  return api<CustomerPreparation>(
    `/accurate/imports/${batchId}/rows/${rowId}/customer/prepare?version=${version}`,
  );
}
export function createAccurateCustomer(
  batchId: string,
  rowId: string,
  input: {
    requestId: string;
    version: number;
    databaseId: string;
    customerNo: string;
    name: string;
  },
) {
  return api<AccurateMaster>(`/accurate/imports/${batchId}/rows/${rowId}/customer`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function searchAccurateMasters(
  kind: 'customer' | 'item' | 'branch',
  search: string,
  page = 1,
  branchId?: string,
) {
  return api<{ database: { id: string; name: string }; items: AccurateMaster[] }>(
    `/accurate/masters?${new URLSearchParams({ kind, search, page: String(page), ...(branchId ? { branchId } : {}) })}`,
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
