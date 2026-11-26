'use client';

import { createContext, useContext } from 'react';
import type { Actor, Branch } from '@/types';
import type { View } from '@/types/navigation';
import type { Dashboard } from '@/features/easyrecap/dashboard/types';
import type { Invoice } from '@/features/easyrecap/invoices/types';

export type WorkspaceContextValue = {
  actor: Actor;
  admin: boolean;
  operate: boolean;
  branches: Branch[];
  branch: string;
  setBranch: (value: string) => void;
  days: string;
  setDays: (value: string) => void;
  dashboard: Dashboard | null;
  loaded: boolean;
  error: string;
  run: (task: () => Promise<unknown>, message: string, refreshDashboard?: boolean) => Promise<void>;
  reloadBranches: () => Promise<void>;
  openInvoice: (invoice: Pick<Invoice, 'id'>) => Promise<void>;
  navigate: (view: View) => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Workspace pages must be rendered inside the authenticated shell.');
  return value;
}
