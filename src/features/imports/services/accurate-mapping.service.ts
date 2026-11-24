import { saveAccurateMapping } from '@/features/invoices/services/accurate.service';
import { getBatch } from './imports.service';
import type { Batch, Row } from '../types';

export async function saveImportMapping(
  batch: Batch,
  row: Row,
  kind: 'customer' | 'item',
  masterId: string,
  itemId?: string,
) {
  await saveAccurateMapping(batch.id, row.id, { version: batch.version, kind, masterId, itemId });
  return getBatch(batch.id);
}

export function importAccurateSelection(batch: Batch, row: Row) {
  const destination = batch.accurateDestination;
  const selection = row.candidate.accurateSelection;
  return destination &&
    selection?.databaseId === destination.databaseId &&
    selection.targetBranchId === destination.targetBranchId
    ? selection
    : undefined;
}
