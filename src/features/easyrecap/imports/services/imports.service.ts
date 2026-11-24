import { api, API, apiBlob } from '@/services/api-client';
import type { Batch, Sheet, ImportOverview, ImportHistoryFilters } from '../types';

export const templateBlob = (example: boolean) =>
  apiBlob(`/imports/template${example ? '?example=true' : ''}`);
export const sourceUrl = (batchId: string, fileId: string) =>
  `${API}/api/imports/${batchId}/files/${fileId}`;

export async function loadSourcePdf(endpoint: string, signal: AbortSignal) {
  const response = await fetch(endpoint, { credentials: 'include', signal });
  if (!response.ok) throw new Error('PDF sumber tidak dapat dimuat.');
  return new Uint8Array(await response.arrayBuffer());
}

export function getImportOverview(filters: ImportHistoryFilters, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: '10' });
  for (const key of ['search', 'branch', 'dateFrom', 'dateTo', 'status'] as const)
    if (filters[key]) query.set(key, filters[key]);
  return api<ImportOverview>(`/imports/overview?${query}`, { signal });
}

export function getBatch(batchId: string, signal?: AbortSignal) {
  return api<Batch>(`/imports/${encodeURIComponent(batchId)}`, { signal });
}

export function reparseFile(batchId: string, fileId: string, input: { version: number }) {
  return api<Batch>(`/imports/${batchId}/files/${fileId}/reparse`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function reviewStatus(
  batchId: string,
  detailId: string,
  input: { version: number; businessStatus: string },
) {
  return api<Batch>(`/imports/${batchId}/rows/${detailId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function markReviewed(batchId: string, detailId: string, input: { version: number }) {
  return api<Batch>(`/imports/${batchId}/rows/${detailId}/reviewed`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function submitBatch(
  batchId: string,
  input: { version: number; rowIds: string[]; accountingReviewed: boolean },
) {
  return api<Batch>(`/imports/${batchId}/submit`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeFile(batchId: string, deleteFileId: string, input: { version: number }) {
  return api<{ deleted: boolean; batch?: Batch }>(`/imports/${batchId}/files/${deleteFileId}`, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export function removeBatch(deleteTargetId: string, input: { version: number }) {
  return api('/imports/' + deleteTargetId, {
    method: 'DELETE',
    body: JSON.stringify(input),
  });
}

export function removeItem(
  batchId: string,
  detailId: string,
  itemToDeleteId: string,
  input: { version: number },
) {
  return api<Batch>(
    `/imports/${batchId}/rows/${detailId}/items/${encodeURIComponent(itemToDeleteId)}`,
    { method: 'DELETE', body: JSON.stringify(input) },
  );
}

export function addItem(
  batchId: string,
  rowId: string,
  input: {
    accurateMasterId?: string;
    kind: string;
    reason: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    taxPercent: number;
    version: number;
  },
) {
  return api<Batch>(`/imports/${batchId}/rows/${rowId}/items`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function correctItem(
  batchId: string,
  rowId: string,
  itemId: string,
  input: {
    taxPercent?: number | undefined;
    discountPercent?: number | undefined;
    version: number;
    name: string;
    quantity: number;
    unitPrice: number;
    reason: string;
  },
) {
  return api<Batch>(`/imports/${batchId}/rows/${rowId}/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function previewSource(
  batchId: string,
  fileId: string,
  page: number,
  sheet: string,
  sourceSheet: string | undefined,
  onlyInvoice: boolean,
  rowId: string | undefined,
) {
  return api<{ sheets: Sheet[] }>(
    `/imports/${batchId}/files/${fileId}/preview?page=${page}&sheet=${encodeURIComponent(sheet || sourceSheet || '')}${onlyInvoice && rowId ? '&rowId=' + encodeURIComponent(rowId) : ''}`,
  );
}
