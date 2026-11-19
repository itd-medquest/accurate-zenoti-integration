'use client';

import { useState } from 'react';
import { PencilLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function ReceiptNumberDialog({
  value,
  disabled,
  onApply,
}: {
  value: string;
  disabled: boolean;
  onApply: (number: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value);
  const [error, setError] = useState('');
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setInput(value);
          setError('');
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          {value ? <PencilLine data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {value ? 'Ubah No. Receipt' : 'Isi No. Receipt'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{value ? 'Ubah No. Receipt' : 'Isi No. Receipt'}</DialogTitle>
          <DialogDescription>
            Dokumen sumber belum memiliki No. Receipt. Isi sesuai bukti pembayaran; nomor ini akan
            menjadi No. Bukti di Accurate.
          </DialogDescription>
        </DialogHeader>
        <form
          id="receipt-number-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const number = input.trim();
            if (!number || /^0+$/.test(number)) {
              setError('Masukkan No. Receipt yang valid, selain 0.');
              return;
            }
            if (
              number.length > 255 ||
              /[\u0000-\u001f\u007f]/.test(number) ||
              number.startsWith('INT-PENDING-RC-')
            ) {
              setError('No. Receipt tidak valid atau melebihi 255 karakter.');
              return;
            }
            onApply(number);
            setOpen(false);
          }}
        >
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="manual-receipt-number">No. Receipt</FieldLabel>
              <Input
                id="manual-receipt-number"
                value={input}
                required
                maxLength={255}
                aria-invalid={!!error}
                aria-describedby={`manual-receipt-description${error ? ' manual-receipt-error' : ''}`}
                placeholder="Contoh: MPA-R-R3902"
                onChange={(event) => {
                  setInput(event.target.value);
                  setError('');
                }}
              />
              <FieldDescription id="manual-receipt-description">
                Nomor akan disimpan saat Anda menyimpan draft penerimaan.
              </FieldDescription>
              {error && <FieldError id="manual-receipt-error">{error}</FieldError>}
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button type="submit" form="receipt-number-form">
            Gunakan nomor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
