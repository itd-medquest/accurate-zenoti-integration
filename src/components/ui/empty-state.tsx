import { FileCheck2 } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from './empty';

export function EmptyState({ text = 'Belum ada data untuk ditampilkan.' }: { text?: string }) {
  return (
    <Empty className="min-h-48">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileCheck2 />
        </EmptyMedia>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
