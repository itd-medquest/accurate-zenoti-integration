'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Row } from '../types';
import { isLocalOnlyInvoice } from '../utils/redemption';
import { importReviewNotes } from '../utils/review-notes';

export function ImportValidationNotice({
  row,
  businessStatus,
}: {
  row: Row;
  businessStatus?: string;
}) {
  const notes = importReviewNotes(row, businessStatus);
  if (!notes.length) return null;

  return (
    <Alert className="mb-5" variant="destructive" aria-label="Validasi pengiriman invoice">
      <AlertCircle />
      <AlertTitle>
        {isLocalOnlyInvoice(row.candidate)
          ? 'Invoice belum siap disimpan'
          : 'Invoice belum siap dikirim'}
      </AlertTitle>
      <AlertDescription className="flex-col gap-2">
        <p>
          {row.candidate.accountingReviewedAt
            ? 'Pemeriksaan sudah tersimpan. Lengkapi hal berikut agar invoice dapat dikonfirmasi.'
            : 'Lengkapi hal berikut, lalu simpan pemeriksaan invoice.'}
        </p>
        <ul className="list-disc pl-4">
          {notes.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
