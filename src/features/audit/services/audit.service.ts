import { api } from '@/services/api-client';
import type { AuditLog } from '../types';

export function listAudit() {
  return api<AuditLog[]>('/audit');
}
