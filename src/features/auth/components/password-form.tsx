'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { changePassword } from '@/features/auth/services/auth.service';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
export function PasswordForm({
  run,
}: {
  run: (task: () => Promise<unknown>, message: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="items-start">
        <div>
          <CardTitle>Ubah password</CardTitle>
          <CardDescription>
            Gunakan minimal 12 karakter. Sesi perangkat lain akan dicabut.
          </CardDescription>
        </div>
        <KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="pb-5">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await run(async () => {
              const result = await changePassword({
                currentPassword: current,
                newPassword: password,
                revokeOtherSessions: true,
              });
              if (result.error)
                throw new Error('Password saat ini tidak sesuai atau password baru tidak valid.');
              setCurrent('');
              setPassword('');
            }, 'Password berhasil diperbarui.');
            setBusy(false);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel className="flex w-full flex-col items-stretch gap-2">
                Password saat ini
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={current}
                  disabled={busy}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </FieldLabel>
            </Field>
            <Field>
              <FieldLabel className="flex w-full flex-col items-stretch gap-2">
                Password baru
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  disabled={busy}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FieldLabel>
            </Field>
            <Button className="mt-1 self-start" disabled={busy} variant="default">
              <ShieldCheck size={16} data-icon="inline-start" /> Perbarui password
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
