'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { cn } from '@/lib/cn';

/** Keep two rows visible, plus a non-interactive glimpse of the next row. */
export function ProgressiveList({ items, className }: { items: ReactNode[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState({ visible: 4, collapsed: 320, full: 320 });
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () => {
      const cells = [...element.children].filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      );
      const columns = getComputedStyle(element).gridTemplateColumns.split(' ').length;
      const visible = Math.min(cells.length, columns * 2);
      const firstHidden = cells[visible];
      const collapsed = firstHidden
        ? firstHidden.offsetTop - element.offsetTop + 44
        : element.offsetHeight;
      const full = element.offsetHeight;
      setLayout((previous) =>
        previous.visible === visible && previous.collapsed === collapsed && previous.full === full
          ? previous
          : { visible, collapsed, full },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items.length]);
  const limited = items.length > layout.visible;
  const expanded = open || !limited;
  return (
    <Collapsible open={open} onOpenChange={setOpen} data-slot="progressive-list">
      <CollapsibleContent forceMount id={id}>
        <div
          data-slot="progressive-viewport"
          data-limited={limited}
          data-expanded={expanded}
          className="relative overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none"
          style={{ height: expanded ? layout.full : layout.collapsed }}
        >
          <div ref={grid} className={className} role="list">
            {items.map((item, index) => (
              <div
                role="listitem"
                key={index}
                data-progressive-item
                className="min-w-0 [&>article]:h-full"
                inert={!expanded && index >= layout.visible ? true : undefined}
                aria-hidden={!expanded && index >= layout.visible ? true : undefined}
              >
                {item}
              </div>
            ))}
          </div>
          {!expanded && (
            <div
              data-slot="progressive-fade"
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-fade-surface"
            />
          )}
        </div>
      </CollapsibleContent>
      {limited && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 mobile:px-4">
          <span className="text-xs text-muted-foreground">
            {expanded ? items.length : layout.visible} dari {items.length} file ditampilkan
          </span>
          <CollapsibleTrigger asChild aria-controls={id}>
            <Button variant="outline" size="sm">
              {open ? 'Sembunyikan' : 'Lihat Semua'}
              <ChevronDown
                data-icon="inline-end"
                className={cn(
                  'transition-transform duration-200 motion-reduce:transition-none',
                  open && 'rotate-180',
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      )}
    </Collapsible>
  );
}
