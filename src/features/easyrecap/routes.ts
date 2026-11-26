import type { WorkspaceRoutes } from '@/types/navigation';

export const easyRecapRoutes = {
  prefix: '/easyrecap',
  pages: {
    dashboard: 'dashboard',
    imports: 'faktur-penjualan',
    receipts: 'penerimaan-penjualan',
    users: 'user-management',
    settings: 'settings',
    audit: 'audit-log',
    account: 'account',
    notifications: 'notifications',
  },
} as const satisfies WorkspaceRoutes;

export const invoiceHistoryPath = `${easyRecapRoutes.prefix}/${easyRecapRoutes.pages.imports}`;
export const invoiceUploadPath = `${invoiceHistoryPath}/upload`;
export const invoiceBatchPath = (id: string) => `${invoiceHistoryPath}/${encodeURIComponent(id)}`;
export const receiptHistoryPath = `${easyRecapRoutes.prefix}/${easyRecapRoutes.pages.receipts}`;
export const receiptReviewPath = (id: string) => `${receiptHistoryPath}/${encodeURIComponent(id)}`;
