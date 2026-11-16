import { authClient } from '@/lib/auth-client';
import { api } from '@/services/api-client';
import type { Actor } from '@/types';

export const signIn = (email: string, password: string) =>
  authClient.signIn.email({ email, password });
export const signOut = () => authClient.signOut();
export const getSession = () => authClient.getSession();
export const changePassword = (input: {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions: boolean;
}) => authClient.changePassword(input);

export function getCurrentActor() {
  return api<Actor>('/me');
}
