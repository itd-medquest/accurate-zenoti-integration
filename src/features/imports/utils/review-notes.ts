import type { Row } from '../types';

export function importReviewNotes(
  row: Row,
  businessStatus = row.candidate.businessStatus,
): string[] {
  return [
    ...new Set([
      ...(row.status === 'CONFLICT'
        ? ['Nomor invoice sudah tercatat dengan data berbeda. Periksa transaksi sebelumnya.']
        : []),
      ...row.errors.filter(
        (message) =>
          !(
            message === 'Pilih Status Invoices Open atau Closed setelah memeriksa sumber.' &&
            ['OPEN', 'CLOSED'].includes(businessStatus)
          ),
      ),
    ]),
  ];
}
