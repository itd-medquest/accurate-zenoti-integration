import { api } from '@/services/api-client';
import type { ResetCompletionInput, ResetRequestResult, ResetVerificationResult } from '../types/password-reset.types';

export function requestPasswordReset(email: string) {
  return api<ResetRequestResult>('/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
}
export function verifyPasswordReset(email: string, otp: string) {
  return api<ResetVerificationResult>('/password-reset/verify', { method: 'POST', body: JSON.stringify({ email, otp }) });
}
export function completePasswordReset(input: ResetCompletionInput) {
  return api<{ message: string }>('/password-reset/complete', { method: 'POST', body: JSON.stringify(input) });
}
