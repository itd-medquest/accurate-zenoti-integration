'use client';

import { useEffect, useRef, useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { discountForBase } from '@/features/easyrecap/invoices/utils/package-calculation';
import { money } from '@/lib/format';
import { cn } from '@/lib/cn';

export type DiscountDraft = {
  mode: 'percent' | 'amount';
  value: string;
  exactAmount?: number;
  basis?: number;
};
export function discountPayload(base: number, draft: DiscountDraft) {
  return draft.exactAmount !== undefined && draft.basis === base
    ? { discountAmount: draft.exactAmount }
    : draft.mode === 'amount'
      ? { discountAmount: Number(draft.value) }
      : { discountPercent: Number(draft.value) };
}

export function DiscountInput({
  base,
  value,
  onChange,
  disabled,
  label,
  id,
}: {
  base: number;
  value: DiscountDraft;
  onChange: (value: DiscountDraft) => void;
  disabled?: boolean;
  label: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const option = useRef<HTMLButtonElement>(null);
  const amount = discountForBase(base, discountPayload(base, value));
  const percent = base > 0 ? (amount / base) * 100 : 0;
  const alternative = value.mode === 'amount' ? 'percent' : 'amount';

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const formatTrigger = (
    <CollapsibleTrigger asChild>
      <InputGroupButton
        ref={trigger}
        size="sm"
        className="h-8 gap-1 px-2"
        aria-label={`Jenis diskon ${label}: ${value.mode === 'amount' ? 'Nominal (Rp)' : 'Persentase (%)'}`}
        disabled={disabled}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' || disabled) return;
          event.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => option.current?.focus());
        }}
      >
        <span aria-hidden="true">{value.mode === 'amount' ? 'Rp' : '%'}</span>
        <ChevronRight
          aria-hidden="true"
          className={cn(
            'transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </InputGroupButton>
    </CollapsibleTrigger>
  );

  function switchFormat() {
    const valid =
      value.value.trim() !== '' && Number.isSafeInteger(amount) && Number.isFinite(percent);
    onChange({
      mode: alternative,
      value: valid ? String(alternative === 'amount' ? amount : Number(percent.toFixed(6))) : '',
      ...(valid ? { exactAmount: amount, basis: base } : {}),
    });
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Collapsible
        ref={root}
        open={open && !disabled}
        onOpenChange={setOpen}
        disabled={disabled}
        className="relative isolate min-w-0 [contain:layout_style]"
        data-discount-control=""
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        <div
          className={cn(
            'discount-format-front relative z-10 min-w-0',
            open && !disabled && 'mr-11',
          )}
        >
          {value.mode === 'amount' ? (
            <CurrencyInput
              id={id}
              aria-label={`Diskon nominal ${label}`}
              fractionDigits={0}
              max={Math.min(2147483647, Math.max(0, base))}
              required
              value={value.value}
              disabled={disabled}
              showPrefix={false}
              suffix={formatTrigger}
              onValueChange={(next) => onChange({ mode: value.mode, value: next })}
            />
          ) : (
            <InputGroup>
              <InputGroupInput
                className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                id={id}
                aria-label={`Diskon persen ${label}`}
                type="number"
                min={0}
                max={100}
                step="any"
                required
                value={value.value}
                disabled={disabled}
                onChange={(event) => onChange({ mode: value.mode, value: event.target.value })}
              />
              <InputGroupAddon align="inline-end">{formatTrigger}</InputGroupAddon>
            </InputGroup>
          )}
        </div>
        <CollapsibleContent
          forceMount
          role="group"
          aria-label={`Pilihan format diskon ${label}`}
          aria-hidden={!open || disabled}
          inert={!open || disabled}
          className="absolute inset-0"
        >
          <div
            className="discount-format-slide absolute inset-0 overflow-hidden rounded-full border border-control-border bg-control"
            data-state={open && !disabled ? 'open' : 'closed'}
          >
            <Button
              ref={option}
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-label={alternative === 'amount' ? 'Nominal (Rp)' : 'Persentase (%)'}
              className="absolute inset-y-0 right-0 h-full w-11 rounded-full p-0"
              onClick={switchFormat}
            >
              {alternative === 'amount' ? 'Rp' : '%'}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      <p className="text-xs text-muted-foreground tabular-nums">
        {Number.isFinite(amount) && value.value.trim()
          ? value.mode === 'amount'
            ? `≈ ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(percent)}%`
            : money(amount)
          : '—'}
      </p>
    </div>
  );
}
