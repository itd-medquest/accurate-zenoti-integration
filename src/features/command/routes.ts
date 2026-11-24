import type { WorkspaceRoutes } from '@/types/navigation';

export const commandRoutes = {
  prefix: '/command',
  pages: {
    dashboard: 'dashboard',
    settings: 'settings',
    audit: 'audit-log',
    account: 'account',
    notifications: 'notifications',
  },
} as const satisfies WorkspaceRoutes;
