import { expect, test } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const email = 'recovery-ui@example.test';
const requested = {
  message: 'Jika email terdaftar dan aktif, kode OTP akan dikirim. Periksa inbox dan folder spam.',
  retryAfter: 60,
};

test.beforeEach(async ({ page }) => {
  await page.route(`${api}/api/auth/get-session**`, (route) => route.fulfill({ json: null }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('forgot password goes through email, OTP and password, then returns to login without storing secrets', async ({
  page,
}) => {
  const token = randomBytes(32).toString('hex');
  const password = randomBytes(20).toString('hex');
  const code = '123456';
  let completions = 0;
  await page.route(`${api}/api/password-reset/request`, (route) =>
    route.fulfill({ json: requested }),
  );
  await page.route(`${api}/api/password-reset/verify`, (route) =>
    route.fulfill({ json: { resetToken: token, expiresIn: 300 } }),
  );
  await page.route(`${api}/api/password-reset/complete`, async (route) => {
    const body = route.request().postDataJSON();
    expect(body.email === email && body.resetToken === token && body.newPassword === password).toBe(
      true,
    );
    completions++;
    await route.fulfill({ json: { message: 'Password berhasil diperbarui.' } });
  });
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await expect(page.getByLabel('Email akun')).toHaveValue(email);
  await page.getByRole('button', { name: 'Kirim kode OTP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Periksa email Anda' })).toBeFocused();
  await expect(page.getByRole('button', { name: /Kirim ulang \(/ })).toBeDisabled();
  await page.getByLabel('Kode OTP').fill(code);
  await page.getByRole('button', { name: 'Verifikasi kode' }).click();
  await expect(page.getByRole('heading', { name: 'Buat password baru' })).toBeVisible();
  await page.getByLabel('Password baru', { exact: true }).fill(password);
  await page.getByLabel('Konfirmasi password baru', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Simpan password baru' }).click();
  await expect(
    page.getByRole('form', { name: 'Masuk ke intgrte' }).getByRole('status'),
  ).toContainText('Password berhasil diperbarui');
  await expect(page.getByLabel('Password', { exact: true })).toBeEmpty();
  expect(completions).toBe(1);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      url: location.href,
    }),
  );
  expect(!storage.includes(token) && !storage.includes(password)).toBe(true);
});

test('OTP errors remain accessible and resend becomes available after the cooldown', async ({
  page,
}) => {
  let requests = 0;
  await page.route(`${api}/api/password-reset/request`, (route) => {
    requests++;
    return route.fulfill({ json: { ...requested, retryAfter: 2 } });
  });
  await page.route(`${api}/api/password-reset/verify`, (route) =>
    route.fulfill({ status: 400, json: { error: 'Kode tidak valid atau sudah kedaluwarsa.' } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await page.getByLabel('Email akun').fill(email);
  await page.getByRole('button', { name: 'Kirim kode OTP', exact: true }).click();
  await page.getByLabel('Kode OTP').fill('654321');
  await page.getByRole('button', { name: 'Verifikasi kode' }).click();
  await expect(
    page.getByRole('form', { name: 'Pemulihan password' }).getByRole('alert'),
  ).toContainText('Kode tidak valid');
  await expect(page.getByLabel('Kode OTP')).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Kirim ulang kode', exact: true }).click();
  expect(requests).toBe(2);
  await expect(page.getByLabel('Kode OTP')).toBeEmpty();
  await expect(
    page.getByRole('form', { name: 'Pemulihan password' }).getByRole('alert'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Ubah email' }).click();
  await expect(page.getByLabel('Email akun')).toBeVisible();
});

test('missing email configuration is explained, and pending requests disable duplicate submissions', async ({
  page,
}) => {
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route(`${api}/api/password-reset/request`, async (route) => {
    requests++;
    await wait;
    await route.fulfill({
      status: 503,
      json: { error: 'Layanan email pemulihan belum dikonfigurasi. Hubungi administrator.' },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await page.getByLabel('Email akun').fill(email);
  await page.getByRole('button', { name: 'Kirim kode OTP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sedang memproses...' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Kembali ke login' })).toBeDisabled();
  release();
  await expect(
    page.getByRole('form', { name: 'Pemulihan password' }).getByRole('alert'),
  ).toContainText('belum dikonfigurasi');
  await expect(page.getByRole('button', { name: 'Kirim kode OTP', exact: true })).toBeEnabled();
  expect(requests).toBe(1);
});

test('password mismatch blocks submission, and leaving recovery clears the grant', async ({
  page,
}) => {
  let completions = 0;
  await page.route(`${api}/api/password-reset/request`, (route) =>
    route.fulfill({ json: requested }),
  );
  await page.route(`${api}/api/password-reset/verify`, (route) =>
    route.fulfill({ json: { resetToken: randomBytes(32).toString('hex'), expiresIn: 300 } }),
  );
  await page.route(`${api}/api/password-reset/complete`, (route) => {
    completions++;
    return route.fulfill({ json: {} });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await page.getByLabel('Email akun').fill(email);
  await page.getByRole('button', { name: 'Kirim kode OTP', exact: true }).click();
  await page.getByLabel('Kode OTP').fill('123456');
  await page.getByRole('button', { name: 'Verifikasi kode' }).click();
  await page.getByLabel('Password baru', { exact: true }).fill(randomBytes(20).toString('hex'));
  await page
    .getByLabel('Konfirmasi password baru', { exact: true })
    .fill(randomBytes(20).toString('hex'));
  await page.getByRole('button', { name: 'Simpan password baru' }).click();
  await expect(
    page.getByRole('form', { name: 'Pemulihan password' }).getByRole('alert'),
  ).toContainText('Konfirmasi password belum sama');
  expect(completions).toBe(0);
  await page.getByRole('button', { name: 'Kembali ke login' }).click();
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  await expect(page.getByLabel('Email akun')).toBeVisible();
  await expect(page.getByLabel('Password baru', { exact: true })).toHaveCount(0);
});

test('recovery layout fits desktop and narrow mobile with reduced motion', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Lupa password?' }).click();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByLabel('Email akun')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `../../docs/screenshots/password-reset-${width}.png`,
        fullPage: true,
      });
  }
});
