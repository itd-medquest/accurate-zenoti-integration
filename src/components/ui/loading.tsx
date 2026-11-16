import { Skeleton } from './skeleton';

export function Loading() {
  return (
    <div className="flex w-full flex-col gap-4 p-6" role="status" aria-label="Memuat ruang kerja">
      <span className="sr-only">Memuat ruang kerja...</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
