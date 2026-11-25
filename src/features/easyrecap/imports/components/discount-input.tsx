'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { discountForBase } from '@/features/easyrecap/invoices/utils/package-calculation';
import { money } from '@/lib/format';

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
  const amount = discountForBase(base, discountPayload(base, value));
  const percent = base > 0 ? (amount / base) * 100 : 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <SelectField
        aria-label={`Jenis diskon ${label}`}
        value={value.mode}
        disabled={disabled}
        className="h-8"
        onValueChange={(mode) => {
          if (mode !== 'amount' && mode !== 'percent') return;
          const valid = Number.isSafeInteger(amount) && Number.isFinite(percent);
          onChange({
            mode,
            value: valid ? String(mode === 'amount' ? amount : Number(percent.toFixed(6))) : '',
            ...(valid ? { exactAmount: amount, basis: base } : {}),
          });
        }}
      >
        <SelectFieldOption value="percent">Persentase (%)</SelectFieldOption>
        <SelectFieldOption value="amount">Nominal (Rp)</SelectFieldOption>
      </SelectField>
      <InputGroup>
        <InputGroupInput
          id={id}
          aria-label={`Diskon ${value.mode === 'amount' ? 'nominal' : 'persen'} ${label}`}
          type="number"
          min={0}
          max={value.mode === 'amount' ? Math.min(2147483647, Math.max(0, base)) : 100}
          step={value.mode === 'amount' ? 1 : 'any'}
          required
          value={value.value}
          disabled={disabled}
          onChange={(event) => onChange({ mode: value.mode, value: event.target.value })}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText aria-hidden="true">{value.mode === 'amount' ? 'Rp' : '%'}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
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
