import { selectOption } from '../helpers/select-option';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { receiptPdf } from '../fixtures/receipt-fixture';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
// Run only against the isolated backend which intercepts every Accurate request.
test('actual invoice UI maps customer and items, preserves preview and shows verified target and receipt staging', async ({
  page,
}) => {
  test.skip(
    process.env.ACCURATE_MOCK_SERVER !== 'true',
    'Requires isolated Accurate mock server; never use a real company database.',
  );
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await page.getByLabel('API Token', { exact: true }).fill('browser-test-token');
  await page.getByLabel('Signature Secret', { exact: true }).fill('browser-test-signature');
  await selectOption(page.getByLabel('Mode pengiriman', { exact: true }), 'live');
  await page.getByRole('button', { name: 'Simpan koneksi', exact: true }).click();
  await expect(page.getByText('Konfigurasi Accurate disimpan.', { exact: true })).toBeVisible();
  await expect(page.locator('.environment-badge')).toHaveCount(0);
  await expect(page.getByLabel('Mode pengiriman', { exact: true })).toContainText('Aktual');
  for (const label of ['API Token', 'Signature Secret']) {
    const credential = page.getByLabel(label, { exact: true });
    await expect(credential).toHaveAttribute('type', 'password');
    await expect(credential).toHaveAttribute('readonly', '');
    await expect(credential).toHaveValue('••••••••••••••••');
  }
  const savedAgain = page.waitForRequest(
    (request) => request.url().endsWith('/api/settings/accurate') && request.method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Simpan koneksi', exact: true }).click();
  expect((await savedAgain).postDataJSON()).toEqual({ enabled: true, accurate: { mode: 'live' } });
  await expect(page.getByRole('button', { name: 'Simpan koneksi', exact: true })).toBeEnabled();
  await page.reload();
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('API Token', { exact: true })).toHaveValue('••••••••••••••••');
  await expect(page.getByLabel('Signature Secret', { exact: true })).toHaveValue(
    '••••••••••••••••',
  );
  await page.getByRole('button', { name: 'Uji koneksi tersimpan', exact: true }).click();
  await expect(page.getByText(/Terhubung ke Test Company/)).toBeVisible();
  await page.getByRole('tab', { name: 'Tujuan perusahaan', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Mapping simulasi lokal', exact: true }),
  ).toHaveCount(0);
  const changeDestination = page.getByRole('button', { name: /^Ubah .*Tujuan Accurate/ });
  if (await changeDestination.count()) await changeDestination.click();
  await page.getByRole('button', { name: 'Cari', exact: true }).first().click();
  await selectOption(
    page.getByRole('combobox', { name: /Hasil pencarian.*Tujuan Accurate/ }),
    '300',
  );
  await page.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
  await expect(page.getByText('Database: Test Company (999)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
  await page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const number = `BROWSER-${Date.now()}`;
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'modern-receipt.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), `${number}-RECEIPT`, number),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await page.getByRole('button', { name: number, exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
    'data-rendered',
    'true',
  );
  // A completed inspection must not conceal unresolved live-delivery validation.
  await selectOption(dialog.getByLabel('Status Invoices', { exact: true }), 'CLOSED');
  await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toBeVisible();
  const blocked = page.getByRole('button', { name: /^Lengkapi validasi / });
  await expect(blocked).toHaveText('Belum siap dikirim');
  await expect(page.locator('.import-table')).toContainText(
    /Pilih customer dan item Accurate|Pemetaan kode item dan satuan Accurate belum lengkap/,
  );
  await expect(page.getByRole('checkbox').last()).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Submit Faktur ke Accurate', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('Konfirmasi aktif setelah minimal satu invoice lolos validasi.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: '../../docs/screenshots/accurate-validation-blocked.png',
    fullPage: true,
  });
  await blocked.click();
  const validation = dialog.getByRole('alert', { name: 'Validasi pengiriman invoice' });
  await expect(validation).toContainText('Pemeriksaan sudah tersimpan.');
  await expect(validation).toContainText(
    /Pilih customer dan item Accurate|Pemetaan kode item dan satuan Accurate belum lengkap/,
  );
  for (const label of [
    'Customer Accurate',
    'Collagen Dew Facial',
    'Relaxing Body Massage 30 Minutes',
  ]) {
    const field = dialog
      .locator('[data-slot="field"]')
      .filter({ has: page.locator('[data-slot="field-label"]').filter({ hasText: label }) });
    const change = field.getByRole('button', { name: `Ubah ${label}`, exact: true });
    if (await change.count()) await change.click();
    await field.getByRole('button', { name: 'Cari', exact: true }).click();
    await selectOption(field.getByRole('combobox'), label === 'Customer Accurate' ? '10' : '20');
    await field.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
    await expect(field.getByRole('button', { name: 'Simpan pilihan', exact: true })).toHaveCount(0);
    await expect(field.locator('input')).toHaveCount(0);
    await expect(field.getByText('Tersimpan', { exact: true })).toHaveCount(1);
  }
  const customerField = dialog.locator('[data-slot="field"]').filter({
    has: page.locator('[data-slot="field-label"]').filter({ hasText: 'Customer Accurate' }),
  });
  if (!(await customerField.getByRole('button', { name: 'Ubah Customer Accurate' }).isVisible()))
    await dialog.getByText('Customer dan kode item Accurate', { exact: true }).click();
  await customerField.getByRole('button', { name: 'Ubah Customer Accurate' }).click();
  await expect(customerField.getByRole('textbox')).toBeVisible();
  await customerField.getByRole('button', { name: 'Batal mengubah', exact: true }).click();
  await expect(customerField.locator('input')).toHaveCount(0);
  await customerField.getByRole('button', { name: 'Ubah Customer Accurate' }).click();
  await customerField.getByRole('button', { name: 'Cari', exact: true }).click();
  await selectOption(customerField.getByRole('combobox'), '10');
  const mappingUrl = /\/api\/accurate\/imports\/[^/]+\/rows\/[^/]+\/mapping$/;
  await page.route(mappingUrl, (route) =>
    route.fulfill({ status: 422, json: { error: 'Penggantian mapping ditolak untuk pengujian.' } }),
  );
  await customerField.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
  await expect(customerField.getByRole('alert')).toHaveText(
    'Penggantian mapping ditolak untuk pengujian.',
  );
  await expect(customerField.getByText('Customer Test', { exact: true })).toBeVisible();
  await page.unroute(mappingUrl);
  await customerField.getByRole('button', { name: 'Batal mengubah', exact: true }).click();
  await expect(customerField.locator('input')).toHaveCount(0);
  // Choosing a master changes delivery data and requires a fresh inspection.
  await expect(validation).toContainText(
    'Konfirmasikan pemeriksaan setelah melengkapi mapping Accurate.',
  );
  await dialog.getByText('Ringkasan nilai yang dikirim', { exact: true }).click();
  await expect(
    dialog.getByText('Total faktur: Rp 200.000 · Non-pajak', { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: '../../docs/screenshots/accurate-preview-desktop.png',
    fullPage: true,
  });
  await selectOption(
    dialog.getByRole('combobox', { name: 'Status Invoices', exact: true }),
    'CLOSED',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByText('Faktur Penjualan Accurate', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '../../docs/screenshots/accurate-preview-mobile.png',
    fullPage: true,
  });
  page.once('dialog', (confirmation) => confirmation.accept());
  await dialog.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await expect(blocked).toHaveCount(0);
  await expect(page.locator('.import-table')).toContainText('Valid');
  await expect(page.getByRole('checkbox').last()).toBeEnabled();
  await page.getByRole('checkbox').last().check();
  await page.getByRole('button', { name: 'Submit Faktur ke Accurate', exact: true }).click();
  await expect(page.getByText('Tersinkron', { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole('link', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
  await expect(page.getByRole('cell', { name: new RegExp(number) })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Penerimaan Penjualan.' })).toBeVisible();
  await expect(page.getByText('Belum direview', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
