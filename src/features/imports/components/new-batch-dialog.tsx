'use client';

import { UploadCloud } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function NewBatchDialog({
  draft,
  disabled,
  onConfirm,
}: {
  draft: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled}>
          <UploadCloud data-icon="inline-start" />
          Upload batch baru
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] motion-reduce:animate-none">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <UploadCloud />
          </AlertDialogMedia>
          <AlertDialogTitle>Upload batch baru?</AlertDialogTitle>
          <AlertDialogDescription>
            {draft
              ? 'Batch yang sedang dibuka tetap tersimpan sebagai draft dan dapat dilanjutkan melalui riwayat.'
              : 'Batch yang sedang dibuka tetap tersimpan dengan status pengirimannya saat ini dan dapat dipantau melalui riwayat.'}{' '}
            Anda akan dialihkan ke halaman upload batch baru.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Lanjutkan upload</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
