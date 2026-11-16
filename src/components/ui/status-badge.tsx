import { statusLabels } from '@/lib/labels';
import { Badge } from './badge';

const variants = {
  SYNCED: 'success',
  LOCAL_ONLY: 'info',
  LOCAL_ONLY_CONSULTATION: 'info',
  PAID: 'success',
  CLOSED: 'success',
  PROCESSING: 'info',
  FAILED: 'destructive',
  VOIDED: 'destructive',
  NEEDS_REVIEW: 'warning',
  OPEN: 'warning',
  PARTIAL: 'warning',
  DRAFT: 'secondary',
  PENDING: 'outline',
  UNPAID: 'outline',
} as const;

export function StatusBadge({ status }: { status: string }) {
  const variant = variants[status as keyof typeof variants] ?? 'outline';
  return (
    <Badge variant={variant}>
      <span data-slot="status-dot" className="size-1.5 shrink-0 rounded-full bg-current" />
      {statusLabels[status] ?? status}
    </Badge>
  );
}
