import { api } from '@/services/api-client';
import type { Branch } from '@/types';
import type { Settings } from '../types';

export function listBranches() {
  return api<Branch[]>('/branches');
}

export function getSettings(branchId?: string, signal?: AbortSignal) {
  return api<Settings>(`/settings${branchId ? `?${new URLSearchParams({ branchId })}` : ''}`, {
    signal,
  });
}

export function configureConnection(
  cId: string,
  input: {
    secret?: string | undefined;
    enabled: boolean;
    accurate?: { mode: 'simulation' | 'live'; apiToken?: string; signatureSecret?: string };
  },
  branchId?: string,
) {
  return api(`/settings/${cId}${branchId ? `?${new URLSearchParams({ branchId })}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function testConnection(cId: string, branchId?: string) {
  return api<{
    ok: boolean;
    simulation: boolean;
    message: string;
    database?: { id: string; name: string };
  }>(`/settings/${cId}/test${branchId ? `?${new URLSearchParams({ branchId })}` : ''}`, {
    method: 'POST',
  });
}

export type ManagedCompany = Branch & {
  canDelete: boolean;
  deleteReason: string | null;
  connection: Settings['accurate'] & { enabled: boolean };
};
export const listCompanies = (signal?: AbortSignal) =>
  api<ManagedCompany[]>('/companies', { signal });
export const createCompany = (name: string) =>
  api<{ id: string; name: string }>('/companies', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
export const deleteCompany = (id: string, confirmationName: string) =>
  api(`/companies/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmationName }),
  });

export function updateBranch(
  bId: string,
  input: { name: string; accurateDatabaseId: string; accurateBranchId: string },
) {
  return api(`/branches/${bId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
