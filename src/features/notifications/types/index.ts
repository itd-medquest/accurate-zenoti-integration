import type { Invoice } from '@/features/easyrecap/invoices/types';

export type NotificationPage = {
  rows: Invoice[];
  total: number;
  page: number;
  pageSize: number;
};
