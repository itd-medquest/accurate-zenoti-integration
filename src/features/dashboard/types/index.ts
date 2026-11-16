import type { Invoice } from '@/features/invoices/types';
export type Dashboard = {
  integrationMode?: 'simulation' | 'live';
  summary: {
    total: number;
    synced: number;
    processing: number;
    failed: number;
    pending: number;
    closed: number;
    open: number;
    outstanding: number;
  };
  rate: number;
  trend: { date: string; total: number; synced: number; failed: number }[];
  recent: Invoice[];
  errors: { message: string; count: number }[];
};
