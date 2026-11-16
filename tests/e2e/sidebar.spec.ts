import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / })).toBeVisible();
}
test('wider sidebar collapses, retains navigation labels and persists preference', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  const sidebar = page.locator('#workspace-sidebar');
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(280);
  await page.getByRole('button', { name: 'Ciutkan sidebar', exact: true }).click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(80);
  await expect
    .poll(async () => {
      const sidebarBox = await sidebar.boundingBox();
      const mainBox = await page.locator('.main-shell').boundingBox();
      return mainBox && sidebarBox ? mainBox.x - sidebarBox.x - sidebarBox.width : null;
    })
    .toBe(0);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Perusahaan tujuan upload' })).toContainText(
    'PT. MMI',
  );
  await expect(page.getByRole('alert', { name: 'Mode pengiriman Accurate' })).toContainText(
    'Mode Simulasi',
  );
  await expect(page.getByRole('alert', { name: 'Mode pengiriman Accurate' })).toContainText(
    'API Token dan Signature Secret belum lengkap',
  );
  await page.getByRole('button', { name: 'Atur koneksi Accurate', exact: true }).click();
  await expect(page.getByLabel('API Token', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Perluas sidebar', exact: true })).toBeVisible();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(80);
  await page.getByRole('button', { name: 'Perluas sidebar', exact: true }).click();
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(280);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('mobile drawer stays full width with reduced motion and closes with Escape', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('intgrte:sidebar-collapsed', 'true'));
  await login(page);
  await expect(page.getByRole('button', { name: 'Perluas sidebar', exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  const sidebar = page.locator('#workspace-sidebar');
  await expect.poll(async () => (await sidebar.boundingBox())?.x).toBe(0);
  await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(288);
  expect(await sidebar.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe(
    '0s',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Buka navigasi', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const mobile of [false, true]) {
  test(`workspace keeps its header fixed and profile menu signs out ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 844 });
    await login(page);
    await expect(page.locator('.stat-card').first()).toBeVisible();
    const header = page.locator('.topbar');
    const before = await header.boundingBox();
    const content = page.getByRole('main', { name: 'Konten ruang kerja' });
    await content.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
    const after = await header.boundingBox();
    expect(after?.y).toBe(before?.y);
    expect(after?.height).toBe(before?.height);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('.sidebar-user')).toHaveCount(0);
    if (!mobile) {
      const logo = await page.locator('.sidebar [data-slot="brand-logo"]').boundingBox();
      expect(logo!.width).toBeLessThanOrEqual(112);
      await page.getByRole('button', { name: 'Ciutkan sidebar', exact: true }).click();
      const dashboard = page.getByRole('button', { name: 'Dashboard', exact: true });
      const target = await dashboard.boundingBox();
      const icon = await dashboard.locator('svg').boundingBox();
      expect(target!.width).toBe(target!.height);
      expect(Math.abs(target!.x + target!.width / 2 - icon!.x - icon!.width / 2)).toBeLessThan(1);
      expect(Math.abs(target!.y + target!.height / 2 - icon!.y - icon!.height / 2)).toBeLessThan(1);
      const module = await page
        .getByRole('button', { name: 'Pilih modul: Easy Recap', exact: true })
        .boundingBox();
      expect(module!.width).toBe(target!.width);
      expect(module!.height).toBe(target!.height);
      await page.screenshot({ path: '../../docs/screenshots/workspace-sticky-collapsed.png' });
    }
    const profile = page.getByRole('button', { name: /^Menu profil / });
    await profile.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Logout', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(profile).toBeFocused();
    await profile.click();
    await page.getByRole('menuitem', { name: 'Akun Saya', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Keamanan akun Anda.', exact: true }),
    ).toBeVisible();
    expect(await content.evaluate((element) => element.scrollTop)).toBe(0);
    await profile.click();
    await page.screenshot({
      path: `../../docs/screenshots/workspace-account-menu-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await page.getByRole('menuitem', { name: 'Logout', exact: true }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Sesi Anda berakhir atau akses berubah. Silakan masuk kembali.', {
        exact: true,
      }),
    ).toHaveCount(0);
    const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    expect((await page.request.get(`${api}/api/users`)).status()).toBe(401);
  });
}
