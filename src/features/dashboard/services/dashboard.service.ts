import { api } from '@/services/api-client';
import type { Dashboard } from '../types';

export function getDashboard(query: string, signal?: AbortSignal) {
  return api<Dashboard>(`/dashboard?${query}`, { signal });
}
