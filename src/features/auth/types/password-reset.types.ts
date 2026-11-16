export interface ResetRequestResult { message: string; retryAfter: number }
export interface ResetVerificationResult { resetToken: string; expiresIn: number }
export interface ResetCompletionInput { email: string; resetToken: string; newPassword: string }
