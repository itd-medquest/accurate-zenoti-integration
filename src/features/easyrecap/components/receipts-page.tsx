'use client';

import type { ReactNode } from 'react';
import { useWorkspace } from '@/components/common/workspace-context';
import { ReceiptsView } from '../receipts/components/receipts';

export function ReceiptsPage({ children }: { children: ReactNode }) {
  const { branches, admin, navigate, openInvoice } = useWorkspace();
  return (
    <>
      <ReceiptsView
        branches={branches}
        canConfigureAccounts={admin}
        onConfigure={admin ? () => navigate('settings') : undefined}
        onInvoice={(id) => void openInvoice({ id })}
      />
      {children}
    </>
  );
}
