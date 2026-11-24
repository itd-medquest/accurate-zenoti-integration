'use client';

import { useWorkspace } from '@/components/common/workspace-context';
import { NotificationsView } from './notifications';

export function NotificationsPage() {
  const { actor, openInvoice } = useWorkspace();
  return <NotificationsView actorId={actor.id} onInvoice={openInvoice} />;
}
