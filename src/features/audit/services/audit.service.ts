import { api } from '@/services/api-client';
import type { AuditPage } from '../types';

export function listAudit(page: number, pageSize: number, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return api<AuditPage>(`/audit/overview?${query}`, { signal });
}
