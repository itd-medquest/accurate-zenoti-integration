'use client';

import { CheckCircle2, Link2, PencilLine, ChevronUp, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { AccurateMaster } from '@/features/easyrecap/invoices/types/accurate';
import { cn } from '@/lib/cn';

export function ImportItemMapping({
  name,
  selected,
  excluded,
  redemptionNote,
  editable,
  expanded,
  disabled,
  onToggle,
  destinationAvailable = true,
}: {
  name: string;
  selected?: AccurateMaster;
  excluded?: 'redeemed' | 'consultation';
  redemptionNote?: string;
  editable: boolean;
  expanded: boolean;
  disabled: boolean;
  onToggle: () => void;
  destinationAvailable?: boolean;
}) {
  const label = excluded
    ? redemptionNote?.trim() || (excluded === 'redeemed' ? 'Item redeemed' : 'Consultation gratis')
    : selected
      ? `${selected.code} · ${selected.name} · Satuan: ${selected.unitName || 'Belum tersedia'}`
      : !destinationAvailable
        ? 'Tujuan Accurate belum tersedia'
        : 'Pilih item Accurate';

  return (
    <div className="mt-3 flex min-w-0 items-center gap-2" aria-label={`Mapping Accurate ${name}`}>
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2',
          editable && selected && !excluded && 'pr-10',
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Lihat keterangan ${name}`}
              className={cn(
                'h-auto min-w-0 max-w-full shrink justify-start gap-2 rounded-md border border-border bg-surface-neutral px-2 py-1 text-xs font-normal text-muted-foreground',
                editable && selected && !excluded && 'flex-1',
              )}
            >
              <Tag className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{label}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            aria-label={`Keterangan ${name}`}
            className="max-w-[calc(100vw-2rem)]"
          >
            <PopoverHeader>
              <PopoverTitle>{name}</PopoverTitle>
              <PopoverDescription className="whitespace-normal wrap-anywhere">
                {label}
              </PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
        {editable && !excluded && (
          <Button
            type="button"
            variant={selected ? 'ghost' : 'outline'}
            size={selected ? 'icon-sm' : 'sm'}
            className="import-item-mapping-edit"
            disabled={disabled}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Tutup mapping' : selected ? 'Ubah mapping' : 'Petakan item'} ${name}`}
            title={selected ? `Ubah mapping ${name}` : undefined}
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronUp data-icon="inline-start" />
            ) : selected ? (
              <PencilLine data-icon="inline-start" />
            ) : (
              <Link2 data-icon="inline-start" />
            )}
            {!selected && (expanded ? 'Tutup mapping' : 'Petakan item')}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ImportItemMappingStatus({
  selected,
  excluded,
  destinationAvailable = true,
}: {
  selected?: AccurateMaster;
  excluded?: 'redeemed' | 'consultation';
  destinationAvailable?: boolean;
}) {
  return (
    <Badge
      variant={excluded ? 'secondary' : selected && destinationAvailable ? 'success' : 'warning'}
      className="h-auto w-max max-w-none shrink-0 whitespace-nowrap text-right"
    >
      {excluded ? (
        `${excluded === 'redeemed' ? 'Redeemed' : 'Consultation gratis'} · Tidak dikirim ke Accurate`
      ) : !destinationAvailable ? (
        'Tujuan belum tersedia'
      ) : selected ? (
        <>
          <CheckCircle2 aria-hidden="true" />
          Mapping tersimpan
        </>
      ) : (
        'Belum dipetakan'
      )}
    </Badge>
  );
}
