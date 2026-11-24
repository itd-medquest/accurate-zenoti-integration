'use client';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import { addItem } from '@/features/imports/services/imports.service';
import { calculateNewItem } from '@/features/invoices/utils/package-calculation';
import { money } from '@/lib/format';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { Batch } from '../types';
import type { AccurateMaster } from '@/features/invoices/types/accurate';
import { AccurateMasterPicker } from '@/features/invoices/components/accurate-master-picker';
export function AddImportItem({
  batchId,
  rowId,
  version,
  branchId,
  mappingEnabled = false,
  previouslyReviewed,
  disabled,
  onCancel,
  onSaved,
  onSaving,
}: {
  batchId: string;
  rowId: string;
  version: number;
  branchId?: string;
  mappingEnabled?: boolean;
  previouslyReviewed: boolean;
  disabled: boolean;
  onCancel: () => void;
  onSaved: (batch: Batch) => void;
  onSaving: (saving: boolean) => void;
}) {
  const [draft, setDraft] = useState({
    name: '',
    kind: 'service',
    quantity: '1',
    unitPrice: '',
    discountPercent: '0',
    taxPercent: '0',
    reason: '',
  });
  const [error, setError] = useState('');
  const [master, setMaster] = useState<AccurateMaster>();
  const input = {
    name: draft.name.trim(),
    quantity: Number(draft.quantity),
    unitPrice: Number(draft.unitPrice),
    discountPercent: Number(draft.discountPercent),
    taxPercent: Number(draft.taxPercent),
  };
  const result = [draft.quantity, draft.unitPrice, draft.discountPercent, draft.taxPercent].every(
    (v) => v.trim() !== '',
  )
    ? calculateNewItem(input)
    : null;
  const needsMapping =
    mappingEnabled &&
    !(
      input.name.toLowerCase() === 'consultation' &&
      input.unitPrice === 0 &&
      input.discountPercent === 0 &&
      input.taxPercent === 0
    );
  const valid =
    (!needsMapping || !!master) &&
    !!result &&
    !!input.name &&
    input.name.length <= 200 &&
    draft.reason.trim().length >= 5 &&
    draft.reason.trim().length <= 500;
  const display = (value: number | undefined) =>
    value !== undefined && Number.isFinite(value) ? money(value) : '—';
  function update(key: keyof typeof draft, value: string) {
    setDraft({ ...draft, [key]: value });
    setError('');
  }
  return (
    <form
      className="import-item-add-form p-4 mb-4 border border-solid border-border rounded-[10px] bg-accent/60"
      aria-label="Form tambah item"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || disabled) return;
        if (
          previouslyReviewed &&
          !window.confirm(
            'Tambahkan item pada invoice yang sudah diperiksa? Pemeriksaan lama akan dibatalkan dan invoice perlu diperiksa kembali.',
          )
        )
          return;
        onSaving(true);
        setError('');
        try {
          const next = await addItem(batchId, rowId, {
            version,
            ...input,
            kind: draft.kind,
            reason: draft.reason.trim(),
            ...(needsMapping && master ? { accurateMasterId: master.id } : {}),
          });
          onSaved(next);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Item gagal ditambahkan.');
        } finally {
          onSaving(false);
        }
      }}
    >
      <FieldGroup>
        <h3>Tambah detail item</h3>
        <div className="import-item-add-grid grid grid-cols-[repeat(4,_minmax(0,_1fr))] gap-3 mobile:grid-cols-[repeat(2,_minmax(0,_1fr))]">
          <Field className="item-add-name">
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Nama item
              <Input
                autoFocus
                aria-label="Nama item baru"
                required
                maxLength={200}
                disabled={disabled}
                value={draft.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </FieldLabel>
          </Field>
          <Field className="item-add-kind">
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Jenis item
              <SelectField
                aria-label="Jenis item baru"
                disabled={disabled}
                value={draft.kind}
                onValueChange={(e) => update('kind', e)}
              >
                <SelectFieldOption value="service">Layanan</SelectFieldOption>
                <SelectFieldOption value="product">Produk</SelectFieldOption>
              </SelectField>
            </FieldLabel>
          </Field>
          {(['quantity', 'unitPrice', 'discountPercent', 'taxPercent'] as const).map(
            (key, index) => (
              <Field key={key}>
                <FieldLabel className="flex w-full flex-col items-stretch gap-2">
                  {['Qty', 'Harga awal / unit', 'Diskon (%)', 'Pajak (%)'][index]}
                  <Input
                    aria-label={
                      [
                        'Qty item baru',
                        'Harga unit item baru',
                        'Diskon persen item baru',
                        'Pajak persen item baru',
                      ][index]
                    }
                    type="number"
                    required
                    min={key === 'quantity' ? 1 : 0}
                    max={key === 'quantity' ? 10000 : key === 'unitPrice' ? 2147483647 : 100}
                    step={key === 'quantity' ? 1 : 'any'}
                    disabled={disabled}
                    value={draft[key]}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </FieldLabel>
              </Field>
            ),
          )}
          <Field className="item-add-reason">
            <FieldLabel className="flex w-full flex-col items-stretch gap-2">
              Alasan penambahan
              <Input
                aria-label="Alasan penambahan item"
                placeholder="Contoh: satu layanan terlewat saat pembacaan PDF"
                required
                minLength={5}
                maxLength={500}
                disabled={disabled}
                value={draft.reason}
                onChange={(e) => update('reason', e.target.value)}
              />
            </FieldLabel>
          </Field>
        </div>
        {needsMapping && (
          <AccurateMasterPicker
            kind="item"
            branchId={branchId}
            label="Mapping Accurate item baru"
            draftSelection
            initialSearch={draft.name.trim().slice(0, 100)}
            selected={master}
            disabled={disabled}
            onSelect={async (_id, selected) => setMaster(selected)}
          />
        )}
        <p>
          Setelah diskon: <strong>{display(result?.net)}</strong> · Pajak:{' '}
          <strong>{display(result?.tax)}</strong> · Final item:{' '}
          <strong>{display(result ? result.net + result.tax : undefined)}</strong>
        </p>
        <p>
          Total invoice sumber tetap menjadi acuan. Selisih akan ditandai dan menghalangi submit.
        </p>
        {!result && draft.unitPrice && (
          <p className="package-error text-destructive">
            Periksa qty, harga unit, dan persen. Nilai baris harus rupiah bulat; harga unit dan
            persen maksimal 6 desimal.
          </p>
        )}
        {result?.adjusted && (
          <p className="import-warning-note flex gap-1.75 items-start text-muted-foreground text-[10px] my-2.5 mx-0 leading-[1.7]">
            Diskon dan pajak dibulatkan ke rupiah. Cocokkan hasilnya dengan sumber.
          </p>
        )}
        {error && (
          <p role="alert" className="package-error text-destructive">
            {error}
          </p>
        )}
        <div className="import-item-actions flex justify-end flex-wrap gap-2 mt-3">
          <Button
            type="button"
            className="button inline-flex items-center justify-center whitespace-nowrap secondary"
            disabled={disabled}
            onClick={onCancel}
            variant="outline"
          >
            <X size={15} data-icon="inline-start" />
            Batal
          </Button>
          <Button
            type="submit"
            className="button inline-flex items-center justify-center whitespace-nowrap primary"
            disabled={disabled || !valid}
            variant="default"
          >
            <Plus size={15} data-icon="inline-start" />
            {disabled ? 'Menyimpan...' : 'Simpan item baru'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
