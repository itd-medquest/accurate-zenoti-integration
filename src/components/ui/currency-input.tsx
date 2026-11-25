'use client';

import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from './input-group';

/** Canonical values use a decimal point; the editable display uses Indonesian separators. */
function displayCurrency(value: string) {
  if (!value) return '';
  const [whole, fraction] = value.split('.');
  return (
    whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`)
  );
}

type CurrencyInputProps = Omit<
  ComponentProps<typeof InputGroupInput>,
  'type' | 'value' | 'onChange' | 'min' | 'max' | 'step' | 'inputMode'
> & {
  value: string;
  onValueChange: (value: string) => void;
  fractionDigits?: number;
  min?: number;
  max?: number;
  suffix?: ReactNode;
  showPrefix?: boolean;
};

export function CurrencyInput({
  value,
  onValueChange,
  fractionDigits = 6,
  min = 0,
  max = 2147483647,
  disabled,
  className,
  onKeyDown,
  onPaste,
  suffix,
  showPrefix = true,
  ...props
}: CurrencyInputProps) {
  const input = useRef<HTMLInputElement>(null);
  const selection = useRef<number | null>(null);
  const display = displayCurrency(value);

  useLayoutEffect(() => {
    const control = input.current;
    if (!control) return;
    const number = Number(value);
    control.setCustomValidity(
      value && (!Number.isFinite(number) || number < min || number > max)
        ? 'Nominal di luar batas yang diizinkan.'
        : '',
    );
    if (selection.current !== null && document.activeElement === control) {
      control.setSelectionRange(selection.current, selection.current);
      selection.current = null;
    }
  });

  function commit(text: string, caret: number) {
    const clean = text.replace(/^\s*Rp\s*/i, '').replace(/\s/g, '');
    if (!/^[\d.,]*$/.test(clean) || (clean.match(/,/g)?.length ?? 0) > 1) return;
    const raw = clean.replace(/\./g, '').replace(',', '.');
    const [whole, fraction] = raw.split('.');
    if ((fraction?.length ?? 0) > fractionDigits) return;
    const normalized =
      (whole.replace(/^0+(?=\d)/, '') || (fraction !== undefined ? '0' : '')) +
      (fraction === undefined ? '' : `.${fraction}`);
    // Restore the logical digit position after grouping separators have been inserted.
    const logicalPosition =
      text.slice(0, caret).replace(/[^\d,]/g, '').length +
      (!whole && fraction !== undefined && caret > 0 ? 1 : 0);
    const formatted = displayCurrency(normalized);
    let position = 0;
    let logical = 0;
    while (position < formatted.length && logical < logicalPosition) {
      if (/[\d,]/.test(formatted[position])) logical++;
      position++;
    }
    selection.current = position;
    onValueChange(normalized);
  }

  return (
    <InputGroup className={className}>
      {showPrefix && (
        <InputGroupAddon align="inline-start">
          <InputGroupText aria-hidden="true">Rp</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        {...props}
        ref={input}
        type="text"
        inputMode={fractionDigits ? 'decimal' : 'numeric'}
        disabled={disabled}
        value={display}
        onChange={(event) => commit(event.target.value, event.target.selectionStart ?? 0)}
        onPaste={(event) => {
          onPaste?.(event);
          if (event.defaultPrevented) return;
          const text = event.clipboardData.getData('text').trim();
          // Also accept an unformatted decimal from a spreadsheet/API when unambiguous.
          const localized =
            /^\d+\.\d+$/.test(text) && text.split('.')[1].length !== 3
              ? text.replace('.', ',')
              : text;
          event.preventDefault();
          const control = event.currentTarget;
          const start = control.selectionStart ?? 0;
          const end = control.selectionEnd ?? start;
          commit(
            display.slice(0, start) + localized + display.slice(end),
            start + localized.length,
          );
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          const control = event.currentTarget;
          const start = control.selectionStart ?? 0;
          const end = control.selectionEnd ?? start;
          if (fractionDigits > 0 && event.key === '.' && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            commit(display.slice(0, start) + ',' + display.slice(end), start + 1);
            return;
          }
          if (start !== end) return;
          // Deleting a grouping separator should remove a digit rather than trap the caret.
          if (event.key === 'Backspace' && display[start - 1] === '.') {
            event.preventDefault();
            commit(display.slice(0, start - 2) + display.slice(start), start - 2);
          } else if (event.key === 'Delete' && display[start] === '.') {
            event.preventDefault();
            commit(display.slice(0, start) + display.slice(start + 2), start);
          }
        }}
      />
      {suffix && <InputGroupAddon align="inline-end">{suffix}</InputGroupAddon>}
    </InputGroup>
  );
}
