'use client';
import { BrandLogo } from '@/components/common/brand-logo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { signIn } from '@/features/auth/services/auth.service';
import { cn } from '@/lib/cn';
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import styles from './login.module.css';
import { ForgotPassword } from './forgot-password';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [notice, setNotice] = useState('');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await signIn(email, password);
      if (result.error)
        throw new Error('Email atau password tidak sesuai, atau akses akun belum tersedia.');
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tidak dapat masuk.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={cn(styles.screen, 'grid min-h-dvh grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] mobile:grid-cols-1')}>
      <section className="relative flex min-h-dvh min-w-0 flex-col justify-between overflow-hidden px-[clamp(2.5rem,6.5vw,7rem)] py-16 tablet:px-8 tablet:py-12 mobile:min-h-0 mobile:gap-12 mobile:px-7 mobile:pt-8 mobile:pb-14" aria-label="Tentang intgrte">
        <a href="/" aria-label="intgrte beranda" className={cn(styles.storyContent, 'relative block w-fit')}>
          <BrandLogo tone="light" className="w-44" />
        </a>
        <div data-slot="login-copy" className={cn(styles.storyContent, 'relative flex max-w-xl flex-col gap-6 py-16 mobile:gap-4 mobile:py-0')}>
          <span className="text-[10px] font-semibold tracking-[0.22em] text-primary-foreground/70">Connecting What Matters.</span>
          <p className="max-w-lg text-[18px] leading-relaxed font-medium text-primary-foreground mobile:text-[15px]">
            Internal Network for Transactions, Governance, Reporting, Tracking &amp; Efficiency.
          </p>
          <p className="max-w-lg text-sm leading-[1.9] text-primary-foreground/80 mobile:text-[13px]">
INTGRTE adalah platform internal yang mengintegrasikan berbagai sistem dan kebutuhan bisnis dalam satu tempat. <br />Platform ini mencakup pengelolaan transaksi, anggaran, pelaporan, hingga pemantauan operasional untuk mendukung koordinasi dan pengambilan keputusan di setiap level manajemen.
          </p>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-primary-foreground/65 mobile:hidden">
          <ShieldCheck size={16} aria-hidden="true" />
          Secured Platform
        </div>
      </section>
      <section className={cn(styles.formPanel, 'relative flex min-w-0 flex-col items-center justify-center bg-background px-[clamp(2rem,5vw,5.5rem)] py-14 mobile:px-7 mobile:py-10')} aria-labelledby="login-heading"
        onFocusCapture={(event) => {
          // Finish once, keeping the CSS animation name unchanged so blur cannot restart it.
          for (const animation of event.currentTarget.getAnimations()) animation.finish();
        }}>
        <div className="flex w-full max-w-90 flex-col gap-9 mobile:gap-7">
          {recovering ? <ForgotPassword initialEmail={email} onBack={() => setRecovering(false)} onComplete={(value) => {
            setEmail(value);
            setPassword('');
            setShow(false);
            setError('');
            setNotice('Password berhasil diperbarui. Silakan masuk dengan password baru.');
            setRecovering(false);
          }} /> : <>
          <div className="flex flex-col gap-3">
            <h2 id="login-heading" className="font-display text-[28px] leading-tight font-bold tracking-[-0.8px] text-foreground mobile:text-[25px]">
              Selamat datang! <span aria-hidden="true">👋</span>
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Login untuk masuk ke intgrte.</p>
          </div>
          <form onSubmit={submit} aria-label="Masuk ke intgrte">
            <FieldGroup className="gap-6">
              <Field data-invalid={!!error} data-disabled={busy}>
                <FieldLabel htmlFor="login-email" className="sr-only">Email</FieldLabel>
                <Input id="login-email" variant="underline" type="email" autoComplete="username" placeholder="Email" required disabled={busy}
                  aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field data-invalid={!!error} data-disabled={busy}>
                <FieldLabel htmlFor="login-password" className="sr-only">Password</FieldLabel>
                <InputGroup variant="underline">
                  <InputGroupInput id="login-password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" required disabled={busy}
                    aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton type="button" onClick={() => setShow(!show)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={show} disabled={busy} size="icon-sm">
                      {show ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {error && <Alert id="login-error" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {notice && <Alert role="status"><AlertDescription>{notice}</AlertDescription></Alert>}
              <Button type="button" variant="link" className="ml-auto h-auto px-0 text-xs" disabled={busy} onClick={() => { setPassword(''); setError(''); setNotice(''); setRecovering(true); }}>Lupa password?</Button>
              <Button type="submit" className="h-12 w-full rounded-full" size="lg" disabled={busy}>
                {busy && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
                {busy ? 'Sedang masuk...' : 'Masuk'}
              </Button>
            </FieldGroup>
          </form>
          </>}
        </div>
      </section>
    </div>
  );
}
