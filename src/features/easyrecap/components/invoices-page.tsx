'use client';

import type { ReactNode } from 'react';
import { useWorkspace } from '@/components/common/workspace-context';
import { ImportsView } from '../imports/components/imports';

export function InvoicesPage({ children }: { children: ReactNode }) {
  const { branches, admin, navigate } = useWorkspace();
  return (
    <>
      <ImportsView
        branches={branches}
        onConfigure={admin ? () => navigate('settings') : undefined}
      />
      {children}
    </>
  );
}
