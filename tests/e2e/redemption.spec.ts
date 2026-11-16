import { selectOption, selectedValue } from '../helpers/select-option';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { redemptionPdf } from '../../../backend/test/helpers/redemption-fixture';

const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const origin = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';

for (const mobile of [false, true])
  for (const full of [true, false]) {
    test(`${full ? 'full redeem local save' : 'mixed redeem actual submission'} on ${mobile ? 'mobile' : 'desktop'}`, async ({
      page,
    }, info) => {
      test.skip(
        process.env.ACCURATE_MOCK_SERVER !== 'true',
        'Requires the isolated Accurate mock fixture.',
      );
      test.setTimeout(90000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1440, height: 1050 },
      );
      await page.goto('/');
      await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
      await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Masuk', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / }),
      ).toBeVisible();
      const settings = await page.request.patch(`${api}/api/settings/accurate`, {
        headers: { Origin: origin },
        data: {
          enabled: !full,
          accurate: {
            mode: 'live',
            apiToken: 'browser-test-token',
            signatureSecret: 'browser-test-signature',
          },
        },
      });
      expect(settings.ok()).toBe(true);
      if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
      await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
      await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
      const branch = await selectedValue(
        page.getByLabel('Perusahaan tujuan upload', { exact: true }),
      );
      if (!full) {
        const destination = await page.request.put(`${api}/api/accurate/destinations/${branch}`, {
          headers: { Origin: origin },
          data: { targetBranchId: '300' },
        });
        expect(destination.ok()).toBe(true);
      }
      const number = `BROWSER-REDEEM-${full ? 'FULL' : 'MIXED'}-${Date.now()}`;
      await page.getByLabel('Pilih file invoice').setInputFiles({
        name: 'redemption.pdf',
        mimeType: 'application/pdf',
        buffer: redemptionPdf(
          full,
          number,
          full ? {} : { mergedUsageHeader: true, mergedPatientId: true },
        ),
      });
      await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
      await page.getByRole('button', { name: number, exact: true }).click();
      const dialog = page.getByRole('dialog', {
        name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
      });
      await expect(dialog.getByLabel('Informasi redeem invoice')).toBeVisible();
      await expect(
        dialog.getByText('Redeemed · Tidak dikirim ke Accurate', { exact: true }),
      ).toHaveCount(full ? 3 : 1);
      await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
        'data-rendered',
        'true',
      );
      if (full) await expect(dialog.getByLabel('Pemetaan faktur Accurate')).toHaveCount(0);
      else {
        const mapping = dialog.getByLabel('Pemetaan faktur Accurate');
        await expect(mapping.getByText('Cauter Large Area', { exact: true })).toHaveCount(0);
        await expect(mapping.getByText('Consultation', { exact: true })).toHaveCount(0);
        await expect(
          dialog.getByText('Consultation gratis · Tidak dikirim ke Accurate', { exact: true }),
        ).toBeVisible();
        for (const label of ['Customer Accurate', 'Fractional IPL Shoot']) {
          if ((await mapping.locator('details').first().getAttribute('open')) === null)
            await mapping.getByText('Customer dan kode item Accurate', { exact: true }).click();
          const field = mapping
            .locator('[data-slot="field"]')
            .filter({ has: page.locator('[data-slot="field-label"]').filter({ hasText: label }) });
          const change = field.getByRole('button', { name: `Ubah ${label}`, exact: true });
          if (await change.count()) await change.click();
          await field.getByRole('button', { name: 'Cari', exact: true }).click();
          await selectOption(
            field.getByRole('combobox'),
            label === 'Customer Accurate' ? '10' : '20',
          );
          await field.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
          await expect(
            field.getByRole('button', { name: 'Simpan pilihan', exact: true }),
          ).toHaveCount(0);
        }
      }
      await selectOption(dialog.getByLabel('Status Invoices', { exact: true }), 'CLOSED');
      const redeemedRow = dialog
        .getByRole('row')
        .filter({ hasText: 'Redeemed · Tidak dikirim ke Accurate' })
        .first();
      await redeemedRow.scrollIntoViewIfNeeded();
      await expect(redeemedRow.getByRole('cell').nth(5)).toHaveText(/Rp\s*0/);
      if (!full) {
        const paidRow = dialog.getByRole('row').filter({ hasText: 'Fractional IPL Shoot' });
        await expect(paidRow.getByRole('cell').nth(5)).toHaveText(/Rp\s*14\.865/);
        await expect(paidRow.getByRole('cell').nth(6)).toHaveText(/Rp\s*150\.000/);
      }
      expect(
        await redeemedRow.evaluate((row) => {
          const cell = row.querySelector('td');
          const badge = row.querySelector('[data-slot="badge"]');
          if (!cell || !badge) return false;
          const c = cell.getBoundingClientRect(),
            b = badge.getBoundingClientRect();
          return b.right <= c.right + 1 && b.bottom <= c.bottom + 1;
        }),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath('preview.png'), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
      await page.getByRole('checkbox').last().check();
      await page
        .getByRole('button', {
          name: full ? 'Simpan invoice' : 'Submit Faktur ke Accurate',
          exact: true,
        })
        .click();
      await expect(
        page
          .locator('.import-table')
          .getByText(full ? 'Tersimpan — Full redeem' : 'Tersinkron', { exact: true }),
      ).toBeVisible({ timeout: 20000 });
      expect(errors).toEqual([]);
    });
  }
