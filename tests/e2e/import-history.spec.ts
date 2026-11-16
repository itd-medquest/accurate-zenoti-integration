import { selectOption } from '../helpers/select-option';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { receiptPdf } from '../fixtures/receipt-fixture';
import type { Batch } from '../../src/features/imports/types';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
}

for (const mobile of [false, true]) {
  test(`invoice history is separate from upload, filters and saved drafts remain usable ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: 1000 });
    await login(page);
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Faktur Penjualan.', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.import-steps')).toHaveCount(0);
    await expect(page.getByLabel('Pilih file invoice')).toHaveCount(0);
    await expect(page.locator('.eyebrow')).toHaveCount(0);
    const summary = page.getByLabel('Ringkasan status invoice');
    await expect(summary.locator('[data-slot=card]')).toHaveCount(5);
    await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
    await expect(page.locator('.import-steps')).toBeVisible();
    await expect(page.locator('.import-history')).toHaveCount(0);
    const number = `HISTORY-${mobile ? 'MOBILE' : 'DESKTOP'}-${Date.now()}`;
    await page.getByLabel('Pilih file invoice').setInputFiles({
      name: `${number}.pdf`,
      mimeType: 'application/pdf',
      buffer: receiptPdf(randomUUID(), number),
    });
    const uploaded = page.waitForResponse(
      (response) =>
        response.url() === `${api}/api/imports` && response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
    const saved: Batch = await (await uploaded).json();
    await expect(page.getByRole('button', { name: number, exact: true })).toBeVisible();
    const newUpload = page.getByRole('button', { name: 'Upload batch baru', exact: true });
    const back = page.getByRole('button', { name: 'Kembali ke riwayat', exact: true });
    const newBox = await newUpload.boundingBox();
    const backBox = await back.boundingBox();
    expect(newBox && backBox && newBox.y < backBox.y).toBeTruthy();
    await expect(newUpload).toHaveAttribute('data-variant', 'default');
    await newUpload.click();
    const newConfirmation = page.getByRole('alertdialog', { name: 'Upload batch baru?' });
    await expect(newConfirmation).toContainText('tersimpan sebagai draft');
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.screenshot({
      path: `../../docs/screenshots/invoice-new-batch-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await expect(newConfirmation.getByRole('button', { name: 'Batal', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(newUpload).toBeFocused();
    await expect(page.getByRole('button', { name: number, exact: true })).toBeVisible();
    await newUpload.click();
    await newConfirmation.getByRole('button', { name: 'Lanjutkan upload', exact: true }).click();
    await expect(page.getByLabel('Pilih file invoice')).toBeAttached();
    await expect(page.getByRole('button', { name: number, exact: true })).toHaveCount(0);
    const preserved: Batch = await (
      await page.request.get(`${api}/api/imports/${saved.id}`)
    ).json();
    expect(preserved.status).toBe('PREVIEW');
    expect(preserved.version).toBe(saved.version);
    expect(preserved.rows).toEqual(saved.rows);
    await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
    await page.getByLabel('Cari riwayat', { exact: true }).fill(number);
    await selectOption(page.getByLabel('Status invoice', { exact: true }), 'draft');
    const period = page.getByLabel('Periode upload', { exact: true });
    await period.click();
    const calendar = page.getByRole('dialog', { name: 'Periode upload', exact: true });
    await expect(calendar.getByRole('button', { name: 'Terapkan', exact: true })).toBeDisabled();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const [year, month, day] = today.split('-').map(Number);
    if (mobile) {
      await calendar.getByRole('combobox').first().click();
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/imports/overview',
      );
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(calendar).toBeVisible();
    }
    await selectOption(calendar.getByRole('combobox').nth(0), String(month - 1));
    await selectOption(calendar.getByRole('combobox').nth(1), String(year));
    await calendar.locator('[data-today=true] button').click();
    await page.keyboard.press('Escape');
    await expect(period).toBeFocused();
    await expect(period).toHaveText('Semua waktu');
    await period.click();
    await calendar.locator('td:not([data-outside=true]) button').filter({ hasText: /^1$/ }).click();
    await calendar.locator('[data-today=true] button').click();
    const firstDay = `${today.slice(0, 8)}01`;
    const filtered = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/imports/overview' &&
        url.searchParams.get('dateFrom') === firstDay &&
        url.searchParams.get('dateTo') === today
      );
    });
    await calendar.getByRole('button', { name: 'Terapkan', exact: true }).click();
    expect((await filtered).ok()).toBe(true);
    await expect(period).toContainText(String(day));
    await selectOption(page.getByLabel('Perusahaan', { exact: true }), { label: 'PT. MMI' });
    const row = page.locator('.import-history tbody tr').filter({ hasText: number });
    await expect(row).toHaveCount(1);
    await expect(
      summary.locator('[data-slot=card]').filter({ hasText: 'Draft' }).locator('strong'),
    ).toHaveText('1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.screenshot({
      path: `../../docs/screenshots/invoice-history-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await period.click();
    const calendarBox = await calendar.boundingBox();
    await expect(calendar.getByRole('button', { name: 'Terapkan', exact: true })).toBeInViewport();
    expect(
      calendarBox &&
        calendarBox.x >= 0 &&
        calendarBox.x + calendarBox.width <= (mobile ? 390 : 1600) &&
        calendarBox.y >= 0 &&
        calendarBox.y + calendarBox.height <= 1000,
    ).toBeTruthy();
    await page.screenshot({
      path: `../../docs/screenshots/invoice-calendar-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await calendar.getByRole('button', { name: 'Batal', exact: true }).click();
    if (!mobile) {
      for (const width of [320, 768]) {
        await page.setViewportSize({ width, height: 640 });
        await period.click();
        const box = await calendar.boundingBox();
        await expect(
          calendar.getByRole('button', { name: 'Terapkan', exact: true }),
        ).toBeInViewport();
        expect(
          box &&
            box.x >= 0 &&
            box.x + box.width <= width &&
            box.y >= 0 &&
            box.y + box.height <= 640,
        ).toBeTruthy();
        await page.keyboard.press('Escape');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
      }
      await page.setViewportSize({ width: 1600, height: 1000 });
    }
    await row.getByRole('button', { name: /^Buka batch / }).click();
    await expect(page.getByRole('button', { name: number, exact: true })).toBeVisible();
    await expect(page.locator('.import-history')).toHaveCount(0);
    await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
    await expect(page.getByLabel('Cari riwayat', { exact: true })).toHaveValue(number);
    await expect(page.getByLabel('Status invoice', { exact: true })).toHaveText('Draft');
    await expect(period).not.toContainText('Semua waktu');
    await period.click();
    await calendar.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(period).toHaveText('Semua waktu');
    await expect(row.getByRole('button', { name: /^Hapus riwayat / })).toHaveAttribute(
      'data-variant',
      'destructive',
    );
    await row.getByRole('button', { name: /^Hapus riwayat / }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Hapus riwayat upload?' });
    await confirmation.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(row).toHaveCount(1);
    await row.getByRole('button', { name: /^Hapus riwayat / }).click();
    await confirmation.getByRole('button', { name: 'Hapus riwayat', exact: true }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByText('Tidak ada riwayat yang sesuai', { exact: true })).toBeVisible();
    await expect(
      summary.locator('[data-slot=card]').filter({ hasText: 'Draft' }).locator('strong'),
    ).toHaveText('0');
    expect(errors).toEqual([]);
  });
}
