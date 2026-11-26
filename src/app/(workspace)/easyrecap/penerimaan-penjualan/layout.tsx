import type { ReactNode } from 'react';
import { ReceiptsPage } from '@/features/easyrecap/components/receipts-page';

export default function Layout({ children }: { children: ReactNode }) {
  return <ReceiptsPage>{children}</ReceiptsPage>;
}
