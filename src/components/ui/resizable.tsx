'use client';

import {
  Group,
  Panel,
  Separator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels';
import { EllipsisVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ResizablePanelGroup({ className, ...props }: GroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn('flex h-full w-full min-h-0 min-w-0', className)}
      {...props}
    />
  );
}

export function ResizablePanel(props: PanelProps) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

export function ResizableHandle({
  className,
  withHandle = false,
  ...props
}: SeparatorProps & { withHandle?: boolean }) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-3 shrink-0 items-center justify-center bg-muted/40 text-muted-foreground hover:bg-accent/35 focus-visible:bg-accent/35 focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2',
        className,
      )}
      {...props}
    >
      {withHandle && (
        <span className="pointer-events-none flex h-10 w-5 items-center justify-center rounded-full border border-border bg-popover shadow-sm">
          <EllipsisVertical className="size-4" aria-hidden="true" />
        </span>
      )}
    </Separator>
  );
}
