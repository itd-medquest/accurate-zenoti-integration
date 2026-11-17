import { api } from '@/services/api-client';
import type {
  ReceiptAccount,
  ReceiptConfiguration,
  ReceiptDetail,
  ReceiptDraft,
  ReceiptFilters,
  ReceiptMapping,
  ReceiptOverview,
} from '../types';

export function getReceiptOverview(filters: ReceiptFilters) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value !== '') query.set(key, String(value));
  return api<ReceiptOverview>(`/receipts?${query}`);
}
export const getReceiptConfiguration = () => api<ReceiptConfiguration>('/receipts/configuration');
export function searchReceiptAccounts(kind: 'bank' | 'fee', search: string, page: number) {
  return api<{ database: { id: string; name: string }; items: ReceiptAccount[] }>(
    `/receipts/accounts?${new URLSearchParams({ kind, search, page: String(page) })}`,
  );
}
export function saveReceiptMapping(
  input: Pick<
    ReceiptMapping,
    'branchId' | 'bank' | 'method' | 'accountId' | 'feeAccountId' | 'version'
  >,
) {
  return api<ReceiptMapping>('/receipts/mappings', { method: 'PUT', body: JSON.stringify(input) });
}
export function prepareReceipt(invoiceId: string, sourceKey: string) {
  return api<ReceiptDraft>('/receipts/drafts', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, sourceKey }),
  });
}
export const getReceipt = (id: string) => api<ReceiptDetail>(`/receipts/${id}`);
export function saveReceipt(
  id: string,
  input: Pick<ReceiptDraft, 'paymentDate' | 'paymentReference' | 'notes' | 'version'> & {
    mappingId: string;
    mappingVersion: number;
  },
) {
  return api<ReceiptDraft>(`/receipts/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}
export function submitReceipt(id: string, version: number) {
  return api<ReceiptDraft>(`/receipts/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ version, confirmed: true }),
  });
}
export const checkReceipt = (id: string) =>
  api<ReceiptDraft>(`/receipts/${id}/check`, { method: 'POST', body: '{}' });
export const reopenReceipt = (id: string, version: number) =>
  api<ReceiptDraft>(`/receipts/${id}/reopen`, {
    method: 'POST',
    body: JSON.stringify({ version }),
  });
