import { Check, Eye, Send, UploadCloud } from 'lucide-react';
import type { Batch } from '../types';

const steps = [
  { number: 1, label: 'Upload file', icon: UploadCloud },
  { number: 2, label: 'Preview Accounting', icon: Eye },
  { number: 3, label: 'Submit & pantau', icon: Send },
] as const;

export function ImportWorkflowSteps({ batch }: { batch: Batch | null }) {
  const submitted = batch?.status === 'SUBMITTED';
  const processing = batch?.rows.some(
    (row) =>
      row.status === 'QUEUED' &&
      (!row.syncStatus || ['PENDING', 'PROCESSING'].includes(row.syncStatus)),
  );
  const completed = !batch ? 0 : !submitted ? 1 : processing ? 2 : 3;
  return (
    <ol
      aria-label="Tahapan upload invoice"
      className="import-steps grid list-none grid-cols-[repeat(3,_1fr)] gap-3 p-0 mb-5.5 mobile:gap-1.75"
    >
      {steps.map(({ number, label, icon: Icon }) => {
        const complete = number <= completed;
        const current = !complete && number === completed + 1;
        return (
          <li
            key={number}
            data-state={complete ? 'complete' : current ? 'current' : 'upcoming'}
            aria-current={current ? 'step' : undefined}
            aria-label={`${label}: ${complete ? 'Selesai' : current ? 'Sedang berlangsung' : 'Belum dimulai'}`}
          >
            <span aria-hidden="true">{complete ? <Check className="size-4" /> : number}</span>
            <Icon size={17} aria-hidden="true" />
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}
