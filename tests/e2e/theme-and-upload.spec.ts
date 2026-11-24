import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { receiptPdf } from '../fixtures/receipt-fixture';
import { dashboardMessages } from '../../src/features/easyrecap/dashboard/components/dashboard-greeting';
import type { Batch } from '../../src/features/easyrecap/imports/types';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at), line.slice(at + 1)];
    }),
);

async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
}
async function navigate(page: Page, name: string, mobile: boolean) {
  if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
function screenshot(name: string) {
  mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
  return resolve('../../docs/screenshots', name);
}

for (const mobile of [false, true]) {
  test(`theme persistence, consistent controls and varied greetings ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: 1000 });
    await login(page);
    expect(dashboardMessages).toHaveLength(10);
    expect(new Set(dashboardMessages).size).toBe(10);
    const greeting = page.locator('[data-slot=dashboard-greeting]');
    const first = await greeting.innerText();
    expect(dashboardMessages).toContain(first);
    const theme = page.getByRole('button', { name: 'Gunakan mode gelap', exact: true });
    const themeBox = await theme.boundingBox();
    const bellBox = await page.getByRole('button', { name: /^Notifikasi/ }).boundingBox();
    expect(themeBox && bellBox && themeBox.x + themeBox.width <= bellBox.x).toBeTruthy();
    await theme.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem('intgrte-theme'))).toBe('dark');
    await page.screenshot({
      path: screenshot(`dark-dashboard-${mobile ? 'mobile' : 'desktop'}.png`),
    });
    await navigate(page, 'Faktur Penjualan (Invoices)', mobile);
    const styles = await page
      .locator('.import-history [data-slot=field-group]')
      .first()
      .evaluate((group) =>
        [
          ...group.querySelectorAll(
            '[data-slot=input-group], [data-slot=select-trigger], #history-period',
          ),
        ].map((element) => {
          const style = getComputedStyle(element);
          return [style.backgroundColor, style.borderTopColor, style.borderTopLeftRadius];
        }),
      );
    expect(styles).toHaveLength(4);
    for (const style of styles) expect(style).toEqual(styles[0]);
    for (const header of await page.locator('.import-history [data-slot=table-head]').all()) {
      expect(
        await header.evaluate((element) => Number(getComputedStyle(element).fontWeight)),
      ).toBeGreaterThanOrEqual(600);
    }
    await page.getByLabel('Status invoice', { exact: true }).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.screenshot({
      path: screenshot(`dark-invoice-filters-${mobile ? 'mobile' : 'desktop'}.png`),
    });
    await page.keyboard.press('Escape');
    await page.getByLabel('Periode upload', { exact: true }).click();
    const calendar = page.getByRole('dialog', { name: 'Periode upload', exact: true });
    await expect(calendar).toBeVisible();
    await page.screenshot({
      path: screenshot(`dark-calendar-${mobile ? 'mobile' : 'desktop'}.png`),
    });
    await page.keyboard.press('Escape');
    await navigate(page, 'Settings', mobile);
    for (const tab of ['Koneksi integrasi', 'Tujuan perusahaan', 'Keamanan akun']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: screenshot(`dark-settings-${tab.split(' ')[0]}-${mobile ? 'mobile' : 'desktop'}.png`),
      });
    }
    await navigate(page, 'Dashboard', mobile);
    await expect(greeting).not.toHaveText(first);
    expect(dashboardMessages).toContain(await greeting.innerText());
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Gunakan mode terang', exact: true }),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Gunakan mode terang', exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/light/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/light/);
    expect(errors).toEqual([]);
  });

  test(`14 uploads disclose all files without altering the saved draft ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.emulateMedia({
      colorScheme: 'light',
      reducedMotion: mobile ? 'reduce' : 'no-preference',
    });
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: 1000 });
    await login(page);
    await navigate(page, 'Faktur Penjualan (Invoices)', mobile);
    await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
    const prefix = `COLLAPSIBLE-${Date.now()}`;
    await page.getByLabel('Pilih file invoice').setInputFiles(
      Array.from({ length: 14 }, (_, index) => ({
        name: `${prefix}-${index + 1}.pdf`,
        mimeType: 'application/pdf',
        buffer: receiptPdf(randomUUID(), `${prefix}-${index + 1}`),
      })),
    );
    const upload = page.waitForResponse(
      (response) =>
        response.url() === `${api}/api/imports` && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
    const saved: Batch = await (await upload).json();
    const list = page.locator('[data-slot=progressive-list]');
    const visible = mobile ? 2 : 4;
    await expect(list.getByRole('listitem')).toHaveCount(visible);
    await expect(list.getByRole('button', { name: /^Preview file / })).toHaveCount(visible);
    await expect(list.locator('[data-slot=progressive-fade]')).toBeVisible();
    const content = list.locator('[data-slot=progressive-viewport]');
    if (mobile) await expect(content).toHaveCSS('transition-property', 'none');
    else await expect(content).toHaveCSS('transition-duration', '0.2s');
    await list.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: screenshot(`upload-collapsed-${mobile ? 'mobile' : 'desktop'}.png`),
    });
    await list.getByRole('button', { name: 'Lihat Semua', exact: true }).click();
    await expect(list.getByRole('button', { name: 'Sembunyikan', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(list.getByRole('listitem')).toHaveCount(14);
    await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
    await list.getByRole('button', { name: `Preview file ${prefix}-14.pdf`, exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Preview dokumen upload', exact: true });
    await expect(preview.getByRole('img', { name: 'PDF sumber halaman 1' })).toBeVisible();
    await expect(preview.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await page.keyboard.press('Escape');
    await list.getByRole('button', { name: 'Sembunyikan', exact: true }).click();
    await expect(list.getByRole('listitem')).toHaveCount(visible);
    await list.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: screenshot(`dark-upload-collapsed-${mobile ? 'mobile' : 'desktop'}.png`),
    });
    const preserved: Batch = await (
      await page.request.get(`${api}/api/imports/${saved.id}`)
    ).json();
    expect(preserved.version).toBe(saved.version);
    expect(preserved.rows).toEqual(saved.rows);
    expect(preserved.status).toBe('PREVIEW');
  });
}

test('initial theme follows the system and renders login consistently', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.getByRole('heading', { name: 'Selamat datang!', exact: true })).toBeVisible();
  await page.screenshot({ path: screenshot('dark-login.png') });
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/light/);
});
