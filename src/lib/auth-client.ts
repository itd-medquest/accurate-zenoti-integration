import { API } from '@/services/api-client';
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient({ baseURL: API });
