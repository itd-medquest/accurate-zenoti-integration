import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
async function login(page: Page, email = env.SEED_ADMIN_EMAIL) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / })).toBeVisible();
  await expect(page.getByText('Berhasil tersinkron', { exact: true })).toBeVisible();
}
test('desktop dashboard, retired modules absent, invoice detail, settings, users and audit', async ({
  page,
}) => {
  const errors: string[] = [];
  const listRequests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/invoices') listRequests.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await login(page);
  mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
  await expect(
    page.locator('.sidebar').getByRole('img', { name: 'intgrte', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.sidebar [data-slot=brand-logo] image:visible')).toHaveAttribute(
    'href',
    '/branding/intgrte-black.png',
  );
  await page.screenshot({ path: '../../docs/screenshots/dashboard-desktop.png', fullPage: true });
  await expect(page.getByRole('button', { name: 'Closed Invoices', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unclosed Invoices', exact: true })).toHaveCount(0);
  await page.locator('.activity-panel .invoice-link').first().click();
  await expect(page.getByRole('dialog', { name: 'Detail invoice' })).toBeVisible();
  await page.getByRole('tab', { name: 'Pembayaran', exact: true }).click();
  await expect(page.getByText('Jatuh tempo', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Riwayat sinkronisasi', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Accurate Online', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Uji koneksi tersimpan', exact: true }).first().click();
  await expect(
    page.getByText('Adapter simulasi aktif. Ini bukan verifikasi koneksi API asli.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Tujuan perusahaan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tujuan Faktur Penjualan aktual' })).toBeVisible();
  await page.getByRole('button', { name: 'User Management', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pengguna & hak akses' })).toBeVisible();
  await expect(page.getByText(env.SEED_ADMIN_EMAIL, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tambah pengguna', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Audit Log', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Audit aktivitas', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  expect(listRequests.length).toBeGreaterThan(0);
  expect(listRequests.every((url) => new URL(url).searchParams.get('pageSize') === '5')).toBe(true);
});
test('mobile responsive navigation, invoice detail, and touch controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: '../../docs/screenshots/dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Closed Invoices', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unclosed Invoices', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Faktur Penjualan.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.locator('.activity-panel .invoice-link').first().click();
  await expect(page.getByRole('dialog', { name: 'Detail invoice' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tutup', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup', exact: true }).click();
});
test('viewer can monitor but cannot access operational controls', async ({ page }) => {
  await login(page, 'viewer@example.test');
  await expect(page.getByRole('button', { name: 'Upload invoice', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'User Management', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Closed Invoices', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Unclosed Invoices', exact: true })).toHaveCount(0);
  await page.locator('.activity-panel .invoice-link').first().click();
  const detail = page.getByRole('dialog', { name: 'Detail invoice' });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('button', { name: 'Sinkronkan draft', exact: true })).toHaveCount(
    0,
  );
});
test('expired session returns the user to the login screen', async ({ page, context }) => {
  await login(page);
  await context.clearCookies();
  await page.getByRole('button', { name: /^Notifikasi/ }).click();
  await expect(page.getByRole('form', { name: 'Masuk ke intgrte' })).toBeVisible();
  await expect(page.getByRole('alert').filter({ hasText: 'Sesi Anda berakhir' })).toBeVisible();
});
