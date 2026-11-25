'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { TriangleAlert } from 'lucide-react';
import { dateTime } from '@/lib/format';
import type { Row } from '../types';

export function ImportExceptionReview({
  row,
  editable,
  checked,
  reason,
  onChecked,
  onReason,
  disabled,
  onReparse,
}: {
  row: Row;
  editable: boolean;
  checked: boolean;
  reason: string;
  onChecked: (checked: boolean) => void;
  onReason: (reason: string) => void;
  disabled: boolean;
  onReparse?: () => void;
}) {
  const review = row.exceptionReview;
  if (!review?.errors.length) return null;
  const allowed = review.allowed && row.status !== 'CONFLICT';
  return (
    <Alert variant="warning" className="mb-5" aria-label="Pemeriksaan invoice dengan catatan">
      <TriangleAlert />
      <AlertTitle>
        {review.accepted ? 'Pemeriksaan dengan catatan tersimpan' : 'Pengecualian pembacaan paket'}
      </AlertTitle>
      <AlertDescription className="flex-col gap-3">
        <p>
          {allowed
            ? 'Rincian dan total sumber sudah sesuai. Finance dapat mencatat alasan untuk menyelesaikan pengecualian pembacaan ini. Pengiriman tetap mengikuti pemeriksaan mapping, status, dan duplikasi.'
            : 'Lengkapi rincian layanan dan cocokkan subtotal serta pajaknya dengan sumber sebelum melanjutkan dengan catatan.'}
        </p>
        {review.accepted && row.candidate.reviewException && (
          <div className="flex flex-col gap-1">
            <p className="whitespace-pre-wrap break-words">
              {row.candidate.reviewException.reason}
            </p>
            <p className="text-xs">Dicatat {dateTime(row.candidate.reviewException.reviewedAt)}</p>
          </div>
        )}
        {editable && (
          <>
            {!review.accepted && onReparse && (
              <Button variant="outline" size="sm" disabled={disabled} onClick={onReparse}>
                Baca ulang detail Benefit
              </Button>
            )}
            <Field orientation="horizontal">
              <Checkbox
                id={`exception-${row.id}`}
                checked={checked}
                disabled={disabled || !allowed}
                onCheckedChange={(value) => onChecked(value === true)}
              />
              <FieldLabel htmlFor={`exception-${row.id}`}>
                Simpan pemeriksaan dengan catatan
              </FieldLabel>
            </Field>
            {checked && (
              <Field>
                <FieldLabel htmlFor={`exception-reason-${row.id}`}>
                  Alasan melanjutkan dengan catatan
                </FieldLabel>
                <Textarea
                  id={`exception-reason-${row.id}`}
                  value={reason}
                  onChange={(event) => onReason(event.target.value)}
                  minLength={10}
                  maxLength={1000}
                  required
                  disabled={disabled || !allowed}
                  placeholder="Jelaskan kondisi khusus dan hasil pencocokan dengan dokumen sumber."
                />
                <FieldDescription>
                  Wajib 10–1000 karakter. Alasan dan identitas pemeriksa dicatat dalam audit.
                  Perubahan rincian atau mapping memerlukan pemeriksaan ulang.
                </FieldDescription>
              </Field>
            )}
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
