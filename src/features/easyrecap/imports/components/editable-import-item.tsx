'use client';
import { Badge } from '@/components/ui/badge';
import { isFreeConsultation } from '../utils/redemption';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { TableCell, TableRow } from '@/components/ui/table';
import { correctItem } from '@/features/easyrecap/imports/services/imports.service';
import type { EditableItem } from '@/features/easyrecap/imports/types';
import { formatDiscountPercent, lineDiscountPercent } from '@/features/easyrecap/invoices/utils/discount';
import {
  calculateItemCorrection,
  lineTaxPercent,
  roundedPercentageAmount,
} from '@/features/easyrecap/invoices/utils/package-calculation';
import { cn } from '@/lib/cn';
import { money, unitMoney } from '@/lib/format';
import { PencilLine, Save, Trash2, X } from 'lucide-react';
import { Fragment, useState, type ReactNode } from 'react';
import type { Batch } from '../types';
export function EditableImportItem({
  item,
  batchId,
  rowId,
  version,
  editable,
  editing,
  disabled,
  previouslyReviewed,
  onEdit,
  onDelete,
  onCancel,
  onSaved,
  onSaving,
  mappingSummary,
  mappingStatus,
  mappingEditor,
}: {
  item: EditableItem;
  batchId: string;
  rowId: string;
  version: number;
  editable: boolean;
  editing: boolean;
  disabled: boolean;
  previouslyReviewed: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSaved: (batch: Batch) => void;
  onSaving: (saving: boolean) => void;
  mappingSummary?: ReactNode;
  mappingStatus?: ReactNode;
  mappingEditor?: ReactNode;
}) {
  const initial = () => ({
    name: item.name,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountPercent: String(Number(lineDiscountPercent(item).toFixed(6))),
    taxPercent: String(lineTaxPercent(item)),
  });
  const [draft, setDraft] = useState(initial);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const quantity = Number(draft.quantity),
    unitPrice = Number(draft.unitPrice),
    taxPercent = Number(draft.taxPercent),
    discountPercent = Number(draft.discountPercent);
  const discountChanged = discountPercent !== Number(initial().discountPercent);
  const taxChanged = taxPercent !== Number(initial().taxPercent);
  const needsPercent =
    discountChanged || quantity !== item.quantity || unitPrice !== item.unitPrice;
  const discount = needsPercent
    ? roundedPercentageAmount(quantity * unitPrice, discountPercent)
    : item.discount;
  const net = quantity * unitPrice - discount;
  const needsTaxPercent = taxChanged || net !== item.quantity * item.unitPrice - item.discount;
  const numericInputComplete = [
    draft.quantity,
    draft.unitPrice,
    draft.discountPercent,
    draft.taxPercent,
  ].every((value) => value.trim() !== '');
  const result = numericInputComplete
    ? calculateItemCorrection(item, {
        quantity,
        unitPrice,
        ...(needsPercent ? { discountPercent } : {}),
        ...(needsTaxPercent ? { taxPercent } : {}),
      })
    : null;
  const valid =
    !!draft.name.trim() && draft.name.trim().length <= 200 && !!result && reason.trim().length >= 5;
  const changed =
    draft.name.trim() !== item.name ||
    quantity !== item.quantity ||
    unitPrice !== item.unitPrice ||
    taxChanged ||
    discountChanged;
  const final = (value: number) => (Number.isFinite(value) ? money(value) : '-');
  async function save() {
    if (!valid || !changed || disabled) return;
    if (
      previouslyReviewed &&
      !window.confirm(
        'Perbarui item yang sudah diperiksa? Data item lama akan ditimpa dengan koreksi baru dan invoice harus diperiksa kembali.',
      )
    )
      return;
    onSaving(true);
    setError('');
    try {
      const batch = await correctItem(batchId, rowId, item.id, {
        version,
        name: draft.name.trim(),
        quantity,
        unitPrice,
        reason: reason.trim(),
        ...(needsPercent ? { discountPercent } : {}),
        ...(needsTaxPercent ? { taxPercent } : {}),
      });
      onSaved(batch);
      onCancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Koreksi item gagal disimpan.');
    } finally {
      onSaving(false);
    }
  }
  return (
    <Fragment>
      <TableRow className={cn('import-item-values', editing && 'import-item-editing bg-accent/60')}>
        <TableCell>
          {editing ? (
            <Input
              autoFocus
              aria-label="Nama item"
              value={draft.name}
              maxLength={200}
              disabled={disabled}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          ) : (
            <>
              <div className="import-item-name flex items-center justify-between gap-1.5">
                <strong className="import-service-title min-w-0 flex-1">{item.name}</strong>
                {editable && (
                  <span className="import-item-row-actions inline-flex flex-[0_0_auto] gap-0.5">
                    <Button
                      type="button"
                      className="icon-button inline-flex items-center justify-center mobile:min-w-8.5"
                      aria-label={`Edit item ${item.name}`}
                      title="Edit item"
                      disabled={disabled}
                      onClick={() => {
                        setDraft(initial());
                        setReason('');
                        setError('');
                        onEdit();
                      }}
                      variant="ghost"
                      size="icon"
                    >
                      <PencilLine size={15} data-icon="inline-start" />
                    </Button>
                    <Button
                      type="button"
                      className="icon-button inline-flex items-center justify-center mobile:min-w-8.5 item-delete-button"
                      aria-label={`Hapus item ${item.name}`}
                      title="Hapus item"
                      disabled={disabled}
                      onClick={onDelete}
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 size={15} data-icon="inline-start" />
                    </Button>
                  </span>
                )}
              </div>
              {mappingSummary}
              {!mappingSummary && item.redemptionNote && (
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {item.redemptionNote}
                </p>
              )}
            </>
          )}
        </TableCell>
        {(['quantity', 'unitPrice', 'discountPercent'] as const).map((key, index) => (
          <TableCell key={key}>
            {editing ? (
              <InputGroup>
                <InputGroupInput
                  aria-label={['Qty item', 'Harga awal item', 'Diskon persen item'][index]}
                  type="number"
                  min={key === 'quantity' ? '0.000001' : 0}
                  max={key === 'discountPercent' ? 100 : key === 'quantity' ? 10000 : 2147483647}
                  step="any"
                  value={draft[key]}
                  disabled={disabled || (item.redeemed && key === 'discountPercent')}
                  onChange={(e) => {
                    setDraft({ ...draft, [key]: e.target.value });
                  }}
                />
                {key === 'discountPercent' && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupText aria-hidden="true">%</InputGroupText>
                  </InputGroupAddon>
                )}
              </InputGroup>
            ) : key === 'quantity' ? (
              item.quantity
            ) : key === 'unitPrice' ? (
              unitMoney(item.unitPrice)
            ) : (
              formatDiscountPercent(item)
            )}
          </TableCell>
        ))}
        <TableCell>
          {editing
            ? final(result ? net : NaN)
            : money(item.unitPrice * item.quantity - item.discount)}
        </TableCell>
        <TableCell>
          {editing ? (
            <InputGroup>
              <InputGroupInput
                aria-label="Pajak persen item"
                title="Pajak (%) dari nilai setelah diskon"
                type="number"
                min={0}
                max={100}
                step="any"
                value={draft.taxPercent}
                disabled={disabled || item.redeemed}
                onChange={(e) => setDraft({ ...draft, taxPercent: e.target.value })}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText aria-hidden="true">%</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          ) : (
            money(item.tax)
          )}
        </TableCell>
        <TableCell
          className={cn(
            'amount font-semibold whitespace-nowrap tabular-nums',
            !editing &&
              (mappingStatus || item.redeemed || isFreeConsultation(item)) &&
              'import-item-status-cell',
          )}
        >
          {editing
            ? final(item.redeemed ? 0 : result ? net + result.tax : NaN)
            : money(item.redeemed ? 0 : item.unitPrice * item.quantity - item.discount + item.tax)}
          {!editing && (mappingStatus || item.redeemed || isFreeConsultation(item)) && (
            <div className="import-item-inline-status">
              {mappingStatus || (
                <Badge variant="secondary">
                  {item.redeemed ? 'Redeemed' : 'Consultation gratis'} · Tidak dikirim ke Accurate
                </Badge>
              )}
            </div>
          )}
        </TableCell>
      </TableRow>
      {!editing && mappingEditor && (
        <TableRow className="import-item-mapping">
          <TableCell colSpan={7}>{mappingEditor}</TableCell>
        </TableRow>
      )}
      {editing && (
        <TableRow className="import-item-correction">
          <TableCell colSpan={7}>
            <label>
              Alasan koreksi
              <Input
                aria-label="Alasan koreksi item"
                placeholder="Contoh: harga terbaca keliru; disesuaikan dengan PDF sumber"
                value={reason}
                maxLength={500}
                disabled={disabled}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p>
              Total invoice sumber tetap menjadi acuan. Selisih nominal akan ditandai dan
              menghalangi submit.
            </p>
            <p>
              Diskon (%) dihitung dari harga × qty. Pajak (%) dihitung setelah diskon. Pecahan
              diskon dan pajak dibulatkan ke rupiah terdekat.
            </p>
            {numericInputComplete && !result && (
              <p role="alert">
                Periksa qty dan harga unit. Diskon dan pajak harus 0–100%, maksimal 6 desimal. Qty ×
                harga unit harus menghasilkan rupiah bulat.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="import-item-actions flex justify-end flex-wrap gap-2 mt-3">
              <Button
                type="button"
                className="button inline-flex items-center justify-center whitespace-nowrap secondary"
                disabled={disabled}
                onClick={onCancel}
                variant="outline"
              >
                <X size={15} data-icon="inline-start" /> Batal
              </Button>
              <Button
                type="button"
                className="button inline-flex items-center justify-center whitespace-nowrap primary"
                disabled={disabled || !valid || !changed}
                onClick={save}
                variant="default"
              >
                <Save size={15} data-icon="inline-start" />{' '}
                {disabled ? 'Menyimpan...' : 'Simpan perubahan item'}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
