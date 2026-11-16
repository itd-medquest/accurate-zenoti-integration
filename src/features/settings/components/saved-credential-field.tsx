'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCheck, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';

export function SavedCredentialField({
  id,
  label,
  saved,
  revision,
  value,
  maxLength,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  saved: boolean;
  revision: object;
  value: string;
  maxLength: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setEditing(false), [revision]);
  const masked = saved && !editing;
  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {masked && (
          <Badge variant="success">
            <CheckCheck />
            Tersimpan
          </Badge>
        )}
      </div>
      <InputGroup>
        <InputGroupInput
          ref={input}
          id={id}
          type="password"
          autoComplete="new-password"
          value={masked ? '••••••••••••••••' : value}
          readOnly={masked}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={`Masukkan ${label}`}
          aria-describedby={`${id}-help`}
          onChange={(event) => onChange(event.target.value)}
        />
        {saved && (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              disabled={disabled}
              aria-label={`${editing ? 'Batal ubah' : 'Ubah'} ${label}`}
              onClick={() => {
                onChange('');
                setEditing(!editing);
                if (!editing) requestAnimationFrame(() => input.current?.focus());
              }}
            >
              {!editing && <Pencil data-icon="inline-start" />}
              {editing ? 'Batal' : 'Ubah'}
            </InputGroupButton>
          </InputGroupAddon>
        )}
      </InputGroup>
      <FieldDescription id={`${id}-help`}>
        {masked
          ? 'Kredensial sudah tersimpan. Pilih Ubah untuk menggantinya.'
          : saved
            ? 'Kredensial tersimpan tetap digunakan sampai penggantinya disimpan.'
            : 'Kredensial akan disimpan saat Anda memilih Simpan koneksi.'}
      </FieldDescription>
    </Field>
  );
}
