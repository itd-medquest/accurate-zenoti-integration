'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { completePasswordReset, requestPasswordReset, verifyPasswordReset } from '../services/password-reset.service';

export function ForgotPassword({ initialEmail, onBack, onComplete }: {
  initialEmail: string;
  onBack: () => void;
  onComplete: (email: string) => void;
}) {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (!retryAt) return;
    const update = () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function sendCode() {
    const result = await requestPasswordReset(email.trim().toLowerCase());
    setNotice(result.message);
    setOtp('');
    setRemaining(result.retryAfter);
    setRetryAt(Date.now() + result.retryAfter * 1000);
    setStep('otp');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (step === 'email') await sendCode();
      else if (step === 'otp') {
        const result = await verifyPasswordReset(email.trim().toLowerCase(), otp);
        setResetToken(result.resetToken);
        setOtp('');
        setNotice('Kode terverifikasi. Buat password baru dalam 5 menit.');
        setStep('password');
      } else {
        if (password !== confirmation) throw new Error('Konfirmasi password belum sama.');
        await completePasswordReset({ email: email.trim().toLowerCase(), resetToken, newPassword: password });
        setResetToken('');
        setPassword('');
        setConfirmation('');
        onComplete(email.trim().toLowerCase());
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pemulihan password gagal. Silakan coba lagi.');
    } finally { setBusy(false); }
  }
  async function resend() {
    if (busy || remaining > 0) return;
    setBusy(true);
    setError('');
    try { await sendCode(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tidak dapat mengirim ulang kode.'); }
    finally { setBusy(false); }
  }

  const title = step === 'email' ? 'Lupa password?' : step === 'otp' ? 'Periksa email Anda' : 'Buat password baru';
  return (
    <>
      <div className="flex flex-col gap-3">
        <Button type="button" variant="link" className="w-fit px-0" disabled={busy} onClick={onBack}>
          <ArrowLeft data-icon="inline-start" /> Kembali ke login
        </Button>
        <h2 id="login-heading" ref={heading} tabIndex={-1} className="font-display text-[28px] leading-tight font-bold tracking-[-0.8px] outline-none mobile:text-[25px]">{title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {step === 'email' ? 'Masukkan email akun Anda untuk menerima kode pemulihan.' : step === 'otp' ? 'Masukkan 6 digit OTP dari email. Kode berlaku 5 menit.' : 'Gunakan password yang kuat untuk menjaga akses akun Anda.'}
        </p>
      </div>
      <form onSubmit={submit} aria-label="Pemulihan password" aria-busy={busy}>
        <FieldGroup className="gap-5">
          {step === 'email' ? (
            <Field data-disabled={busy}>
              <FieldLabel htmlFor="reset-email">Email akun</FieldLabel>
              <Input id="reset-email" type="email" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          ) : <p className="break-all text-sm font-medium">{email.trim()}</p>}
          {notice && <Alert role="status"><AlertDescription>{notice}</AlertDescription></Alert>}
          {step === 'otp' && (
            <Field data-invalid={!!error} data-disabled={busy}>
              <FieldLabel htmlFor="reset-otp">Kode OTP</FieldLabel>
              <Input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy}
                aria-invalid={!!error} aria-describedby={error ? 'reset-error' : undefined} className="text-center text-xl tracking-[0.4em]"
                value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </Field>
          )}
          {step === 'password' && <>
            <Field data-disabled={busy}>
              <FieldLabel htmlFor="reset-password">Password baru</FieldLabel>
              <InputGroup>
                <InputGroupInput id="reset-password" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required disabled={busy}
                  aria-describedby="reset-password-help" value={password} onChange={(event) => setPassword(event.target.value)} />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton type="button" size="icon-sm" disabled={busy} aria-label={show ? 'Sembunyikan password baru' : 'Tampilkan password baru'} aria-pressed={show} onClick={() => setShow(!show)}>
                    {show ? <EyeOff /> : <Eye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription id="reset-password-help">Minimal 12 karakter. Semua sesi akan diakhiri setelah password diganti.</FieldDescription>
            </Field>
            <Field data-disabled={busy} data-invalid={!!error}>
              <FieldLabel htmlFor="reset-confirmation">Konfirmasi password baru</FieldLabel>
              <Input id="reset-confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} disabled={busy}
                aria-invalid={!!error} aria-describedby={error ? 'reset-error' : undefined} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </Field>
          </>}
          {error && <Alert id="reset-error" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" className="h-12 w-full rounded-full" size="lg" disabled={busy}>
            {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" data-icon="inline-start" />}
            {busy ? 'Sedang memproses...' : step === 'email' ? 'Kirim kode OTP' : step === 'otp' ? 'Verifikasi kode' : 'Simpan password baru'}
          </Button>
          {step === 'otp' && <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="link" className="px-0" disabled={busy || remaining > 0} onClick={resend}>
              {remaining > 0 ? `Kirim ulang (${remaining}s)` : 'Kirim ulang kode'}
            </Button>
            <Button type="button" variant="link" className="px-0" disabled={busy} onClick={() => { setStep('email'); setOtp(''); setResetToken(''); setNotice(''); setError(''); }}>Ubah email</Button>
          </div>}
        </FieldGroup>
      </form>
    </>
  );
}
