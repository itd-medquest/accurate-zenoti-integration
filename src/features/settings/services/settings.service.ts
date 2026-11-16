import { api } from '@/services/api-client';
import type { Branch } from '@/types';
import type { Settings } from '../types';

export function listBranches() {
  return api<Branch[]>('/branches');
}

export function getSettings() {
  return api<Settings>('/settings');
}

export function configureConnection(
  cId: string,
  input: {
    secret?: string | undefined;
    enabled: boolean;
    accurate?: { mode: 'simulation' | 'live'; apiToken?: string; signatureSecret?: string };
  },
) {
  return api(`/settings/${cId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function testConnection(cId: string) {
  return api<{
    ok: boolean;
    simulation: boolean;
    message: string;
    database?: { id: string; name: string };
  }>(`/settings/${cId}/test`, { method: 'POST' });
}

export function updateBranch(
  bId: string,
  input: { name: string; accurateDatabaseId: string; accurateBranchId: string },
) {
  return api(`/branches/${bId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
