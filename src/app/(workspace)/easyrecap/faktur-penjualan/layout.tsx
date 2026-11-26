import type { ReactNode } from 'react';
import { InvoicesPage } from '@/features/easyrecap/components/invoices-page';

export default function Layout({ children }: { children: ReactNode }) {
  return <InvoicesPage>{children}</InvoicesPage>;
}
