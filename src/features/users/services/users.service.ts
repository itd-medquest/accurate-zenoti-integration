import { api } from '@/services/api-client';
import type { Actor } from '@/types';
import type { CreateUserInput, UpdateUserInput } from '../types';
export const listUsers = () => api<Actor[]>('/users');
export const createUser = (input: CreateUserInput) =>
  api<{ id: string }>('/users', { method: 'POST', body: JSON.stringify(input) });
export const updateUser = (id: string, input: UpdateUserInput) =>
  api<{ ok: boolean }>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteUser = (id: string) =>
  api<{ ok: boolean }>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
