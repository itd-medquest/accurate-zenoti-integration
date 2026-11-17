'use client';

import { useId, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as indonesian } from 'date-fns/locale';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { TZDate, type DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

function displayDate(date: Date) {
  return format(date, 'd MMM yyyy', { locale: indonesian });
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  id,
  heading = 'Periode',
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { dateFrom: string; dateTo: string }) => void;
  id?: string;
  heading?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>();
  const titleId = useId();
  const descriptionId = useId();
  const now = new TZDate(Date.now(), 'Asia/Jakarta');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selected = dateFrom
    ? { from: parseISO(dateFrom), to: parseISO(dateTo || dateFrom) }
    : undefined;
  const label = selected
    ? selected.from.getTime() === selected.to.getTime()
      ? displayDate(selected.from)
      : `${displayDate(selected.from)} – ${displayDate(selected.to)}`
    : 'Semua waktu';

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(selected);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-10.5 w-full min-w-0 justify-start px-3"
          title={label}
        >
          <CalendarDays data-icon="inline-start" />
          <span className="min-w-0 flex-1 truncate text-left">{label}</span>
          <ChevronDown data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-(--radix-popover-content-available-height) w-80 max-w-[calc(100vw-1.5rem)] gap-4 overflow-hidden rounded-xl p-4"
      >
        <div className="flex shrink-0 flex-col gap-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {heading}
          </h2>
          <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
            Pilih tanggal awal dan akhir. Waktu mengikuti WIB.
          </p>
        </div>
        <div
          className="grid shrink-0 grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3"
          aria-live="polite"
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Mulai</span>
            <span className="text-xs font-medium">
              {draft?.from ? displayDate(draft.from) : 'Pilih tanggal'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Sampai</span>
            <span className="text-xs font-medium">
              {draft?.to ? displayDate(draft.to) : 'Pilih tanggal'}
            </span>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
          <Calendar
            mode="range"
            locale={indonesian}
            selected={draft}
            onSelect={setDraft}
            defaultMonth={selected?.from ?? today}
            today={today}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2100, 11)}
            className="w-full p-0 [--cell-size:--spacing(9)]"
          />
        </div>
        <Separator />
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange({ dateFrom: '', dateTo: '' });
              setOpen(false);
            }}
          >
            Reset
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draft?.from}
              onClick={() => {
                if (!draft?.from) return;
                onChange({
                  dateFrom: format(draft.from, 'yyyy-MM-dd'),
                  dateTo: format(draft.to ?? draft.from, 'yyyy-MM-dd'),
                });
                setOpen(false);
              }}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
