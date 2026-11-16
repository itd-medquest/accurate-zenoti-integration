import { selectOption } from '../helpers/select-option';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { receiptPdf } from '../fixtures/receipt-fixture';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const webOrigin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').origin;
async function login(page: Page) {
  await page.request.get(`${api}/api/health`);
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / })).toBeVisible({
    timeout: 15000,
  });
}
test('bulk PDFs are reviewed before submit and source totals stay identical', async ({ page }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const prefix = `E2E-${Date.now()}`;
  const numbers = [`${prefix}-1`, `${prefix}-2`];
  await page.getByLabel('Pilih file invoice').setInputFiles(
    numbers.map((number, i) => ({
      name: `invoice-${i + 1}.pdf`,
      mimeType: 'application/pdf',
      buffer: receiptPdf(randomUUID(), number),
    })),
  );
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preview sebelum pengiriman' })).toBeVisible({
    timeout: 30000,
  });
  expect(
    (await (await page.request.get(`${api}/api/invoices?search=${prefix}`)).json()).total,
  ).toBe(0);
  await expect(
    page.getByRole('button', { name: 'Submit ke Accurate (simulasi)', exact: true }),
  ).toBeDisabled();
  for (const number of numbers) {
    await page.getByRole('button', { name: number, exact: true }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
    });
    await expect(dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
      '135.135',
    );
    await expect(dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
      '14.865',
    );
    await expect(dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
      '70%',
    );
    await expect(
      dialog.getByRole('row').filter({ hasText: 'Relaxing Body Massage' }),
    ).toContainText('75%');
    await expect(
      dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' }),
    ).not.toContainText('315.315');
    await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
      'data-rendered',
      'true',
    );
    await expect(dialog.getByRole('link', { name: 'Unduh sumber' })).toBeVisible();
    const panels = await dialog.locator('.import-review-columns').evaluate((el) => {
      const children = [...el.children];
      const a = children[0].getBoundingClientRect(),
        b = children[1].getBoundingClientRect();
      return { left: a.x, right: b.x, topA: a.y, topB: b.y };
    });
    expect(panels.right).toBeGreaterThan(panels.left);
    expect(Math.abs(panels.topA - panels.topB)).toBeLessThan(2);
    await page.screenshot({ path: '../../docs/screenshots/import-source-preview-desktop.png' });
    await expect(dialog.locator('.import-table-totals tr')).toHaveCount(1);
    await expect(dialog.locator('.import-table-totals td.amount')).toContainText('200.000');
    await expect(dialog.locator('.detail-header').getByLabel('Status Invoices')).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Dokumen sumber', exact: true })).toHaveCount(0);
    await selectOption(dialog.getByLabel('Status Invoices'), 'CLOSED');
    await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  }
  await page.getByRole('checkbox', { name: /Saya telah memeriksa item/ }).check();
  mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
  await page.screenshot({
    path: '../../docs/screenshots/import-preview-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Submit ke Accurate (simulasi)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hasil pengiriman batch' })).toBeVisible();
  await expect(page.locator('.import-table').getByText('Tersinkron', { exact: true })).toHaveCount(
    2,
    { timeout: 20000 },
  );
  const rows = await (await page.request.get(`${api}/api/invoices?search=${prefix}`)).json();
  expect(rows.total).toBe(2);
  expect(rows.rows.every((i: { total: number }) => i.total === 200000)).toBeTruthy();
});
test('upload area keeps content contained on desktop and mobile without page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Upload invoice dalam satu batch' }),
  ).toBeVisible();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    const layout = await page.locator('.import-dropzone').evaluate((element) => {
      const box = element.getBoundingClientRect();
      const footer = document.querySelector('.import-upload-footer')!.getBoundingClientRect();
      return {
        height: box.height,
        contained: [...element.children].every((child) => {
          const bounds = child.getBoundingClientRect();
          return (
            bounds.top >= box.top &&
            bounds.bottom <= box.bottom &&
            bounds.left >= box.left &&
            bounds.right <= box.right
          );
        }),
        footerGap: footer.top - box.bottom,
      };
    });
    expect(layout.height).toBeGreaterThanOrEqual(192);
    expect(layout.contained).toBe(true);
    expect(layout.footerGap).toBeGreaterThanOrEqual(16);
    if (width === 1440) {
      await page.screenshot({
        path: '../../docs/screenshots/import-upload-desktop.png',
        fullPage: true,
      });
    }
  }
  await page.screenshot({
    path: '../../docs/screenshots/import-upload-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('Sales Accrual source can be inspected on desktop and mobile, then wrong upload removed', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page
    .getByLabel('Pilih file invoice')
    .setInputFiles(resolve('../../docs/templates/contoh-sales-accrual.xlsx'));
  const responsePromise = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/imports'),
  );
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  const batch = await (await responsePromise).json();
  await page.getByRole('button', { name: 'DEMO-001', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.getByLabel('Sheet dokumen sumber')).toHaveText('Sales-Accrual');
  await expect(dialog.locator('.source-highlight')).toHaveCount(1);
  await expect(dialog.locator('.source-highlight')).toContainText('Pelanggan Contoh');
  await expect(dialog.locator('.import-table-totals td.amount')).toContainText('200.000');
  await page.screenshot({ path: '../../docs/screenshots/import-excel-source-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () =>
      dialog
        .locator('.import-review-columns')
        .evaluate((element) => element.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(390);
  const layout = await dialog.locator('.import-review-columns').evaluate((el) => {
    const a = el.children[0].getBoundingClientRect(),
      b = el.children[1].getBoundingClientRect();
    return { a: a.y, b: b.y, right: el.getBoundingClientRect().right, width: innerWidth };
  });
  expect(layout.b).toBeGreaterThan(layout.a);
  expect(layout.right).toBeLessThanOrEqual(layout.width);
  await dialog.locator('.source-preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '../../docs/screenshots/import-excel-source-mobile.png' });
  await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
  await page
    .getByRole('button', { name: `Hapus riwayat ${batch.id.slice(0, 8)}`, exact: true })
    .click();
  const confirm = page.getByRole('alertdialog', { name: 'Hapus riwayat upload?' });
  await confirm.getByRole('button', { name: 'Hapus riwayat', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(
    page.getByRole('button', { name: `Hapus riwayat ${batch.id.slice(0, 8)}`, exact: true }),
  ).toHaveCount(0);
});

test('Accounting completes missing package services with exact original totals', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1500, height: 1050 });
  await login(page);
  const Excel = createRequire(resolve('package.json'))(resolve('../backend/node_modules/exceljs'));
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(resolve('../../docs/templates/contoh-sales-accrual.xlsx'));
  const sheet = workbook.worksheets[0],
    number = `PACKAGE-E2E-${Date.now()}`;
  sheet.getCell('A5').value = 'Package';
  sheet.getCell('C5').value = number;
  sheet.getCell('S5').value = number;
  sheet.getCell('I5').value = 'Custom Package Contoh';
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'sales-package.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  const responsePromise = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/imports'),
  );
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  const batch = await (await responsePromise).json();
  await page.getByRole('button', { name: number, exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.locator('.package-detail-notice')).toContainText(
    'Rincian item belum terbaca lengkap',
  );
  await expect(dialog.getByRole('button', { name: 'Input detail item', exact: true })).toHaveCount(
    0,
  );
  await dialog
    .getByRole('button', { name: 'Hapus item Custom Package Contoh', exact: true })
    .click();
  const removed = page.waitForResponse(
    (response) => response.request().method() === 'DELETE' && response.url().includes('/items/'),
  );
  await page
    .getByRole('alertdialog', { name: 'Hapus item?' })
    .getByRole('button', { name: 'Ya', exact: true })
    .click();
  expect((await removed).status(), 'Backend must load the current item deletion endpoint').toBe(
    200,
  );
  for (const [name, price, discount] of [
    ['Collagen Dew Facial', '450450', '70'],
    ['Relaxing Body Massage', '180180', '75'],
  ]) {
    await dialog.getByRole('button', { name: 'Tambah item', exact: true }).click();
    const form = dialog.getByRole('form', { name: 'Form tambah item' });
    await form.getByLabel('Nama item baru', { exact: true }).fill(name);
    await form.getByLabel('Harga unit item baru', { exact: true }).fill(price);
    await form.getByLabel('Diskon persen item baru', { exact: true }).fill(discount);
    await form.getByLabel('Pajak persen item baru', { exact: true }).fill('11');
    await form
      .getByLabel('Alasan penambahan item', { exact: true })
      .fill('Melengkapi layanan paket sesuai invoice sumber');
    await form.getByRole('button', { name: 'Simpan item baru', exact: true }).click();
    await expect(form).toBeHidden();
  }
  await expect(dialog.locator('.package-detail-notice')).toHaveCount(0);
  await expect(dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
    '70%',
  );
  await expect(dialog.locator('.import-table-totals td.amount')).toContainText('200.000');
  await expect(dialog.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
    '150.000',
  );
  await page.screenshot({ path: '../../docs/screenshots/import-package-detail-desktop.png' });
  await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
  await page
    .getByRole('button', { name: `Hapus riwayat ${batch.id.slice(0, 8)}`, exact: true })
    .click();
  await page
    .getByRole('alertdialog', { name: 'Hapus riwayat upload?' })
    .getByRole('button', { name: 'Hapus riwayat', exact: true })
    .click();
  await expect(page.getByRole('alertdialog', { name: 'Hapus riwayat upload?' })).toBeHidden();
});

test('invoice codes group source rows, pagination bounds rendering, and review uses status icons', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1500, height: 1050 });
  await login(page);
  const Excel = createRequire(resolve('package.json'))(resolve('../backend/node_modules/exceljs'));
  const w = new Excel.Workbook();
  await w.xlsx.readFile(resolve('../../docs/templates/contoh-sales-accrual.xlsx'));
  const s = w.worksheets[0],
    sample = s.getRow(5).values,
    prefix = `PAGE-${Date.now()}`;
  for (let n = 5; n <= 35; n++) {
    s.getRow(n).values = sample;
    const code = `${prefix}-${n === 6 ? 5 : n}`;
    s.getCell(`C${n}`).value = code;
    s.getCell(`S${n}`).value = code;
  }
  s.getCell('A36').value = 'Total: ';
  s.getCell('M36').value = { formula: 'SUM(M5:M35)', result: 6200000 };
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'paginated-sales.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(await w.xlsx.writeBuffer()),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await expect(page.locator('.import-table tbody tr')).toHaveCount(25);
  await expect(page.locator('.import-table input[type=checkbox]')).toHaveCount(0);
  await expect(page.locator('.import-summary-grid').getByText('30', { exact: true })).toHaveCount(
    2,
  );
  await page.getByRole('button', { name: `${prefix}-5`, exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.locator('.source-group-detail tbody tr')).toHaveCount(2);
  await expect(dialog.locator('.source-highlight')).toHaveCount(2);
  await dialog.getByRole('checkbox', { name: 'Hanya baris invoice ini' }).uncheck();
  await expect(dialog.getByRole('navigation', { name: 'Halaman sumber Excel' })).toContainText(
    '32',
  );
  await dialog
    .getByRole('button', { name: 'Halaman sumber Excel: berikutnya', exact: true })
    .click();
  await expect(dialog.locator('.source-sheet tbody tr')).toHaveCount(10);
  await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await expect(page.getByLabel('Sudah diperiksa Accounting', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Halaman invoice: berikutnya', exact: true }).click();
  await expect(page.locator('.import-table tbody tr')).toHaveCount(5);
  await expect(page.getByRole('button', { name: `${prefix}-35`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Halaman invoice: sebelumnya', exact: true }).click();
  await expect(page.getByLabel('Sudah diperiksa Accounting', { exact: true })).toHaveCount(1);
  await page.screenshot({ path: '../../docs/screenshots/import-review-pagination.png' });
});

test('duplicate-only batch can be confirmed without sending again and inspection icons open details', async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const number = `DUPLICATE-UI-${Date.now()}`,
    buffer = receiptPdf(randomUUID(), number);
  for (let round = 0; round < 2; round++) {
    if (round) {
      await page.getByRole('button', { name: 'Upload batch baru', exact: true }).click();
      const newBatch = page.getByRole('alertdialog', { name: 'Upload batch baru?' });
      await expect(newBatch).toContainText('status pengirimannya saat ini');
      await newBatch.getByRole('button', { name: 'Lanjutkan upload', exact: true }).click();
    }
    await page
      .getByLabel('Pilih file invoice')
      .setInputFiles({ name: `receipt-${round}.pdf`, mimeType: 'application/pdf', buffer });
    await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
    await page.getByRole('button', { name: 'Belum diperiksa Accounting', exact: true }).click();
    const dialog = page.getByRole('dialog', {
      name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
    });
    await expect(dialog).toBeVisible();
    await selectOption(dialog.getByLabel('Status Invoices'), 'CLOSED');
    await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }).click();
    await expect(dialog).toBeVisible();
    page.once('dialog', (confirmation) => confirmation.accept());
    await dialog.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }).click();
    await expect(dialog).toBeHidden();
    const confirm = page.getByRole('checkbox', { name: /Saya telah memeriksa item/ });
    await expect(confirm).toBeEnabled();
    if (round) {
      await expect(
        page.getByText('1 invoice sudah tercatat sebelumnya', { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Selesaikan review (sudah ada)', exact: true }),
      ).toBeDisabled();
    }
    await confirm.check();
    await page
      .getByRole('button', {
        name: round ? 'Selesaikan review (sudah ada)' : 'Submit ke Accurate (simulasi)',
        exact: true,
      })
      .click();
    await expect(page.getByRole('heading', { name: 'Hasil pengiriman batch' })).toBeVisible();
    await expect(
      page.locator('.import-table').getByText('Tersinkron', { exact: true }),
    ).toHaveCount(1, { timeout: 20000 });
    const result = await (await page.request.get(`${api}/api/invoices?search=${number}`)).json();
    expect(result.total).toBe(1);
    expect(result.rows[0].total).toBe(200000);
    if (round)
      await expect(
        page.getByText(
          'Review batch selesai. Semua invoice sudah ada; tidak ada transaksi atau antrean baru dibuat.',
          { exact: true },
        ),
      ).toBeVisible();
  }
});

test('upload shows transfer and processing progress, then colored cards with preview and per-file removal', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const batchId = randomUUID(),
    fileIds = [randomUUID(), randomUUID()];
  const makeCandidate = (index: number) => ({
    sourceId: randomUUID(),
    number: `UPLOAD-DEMO-${index + 1}`,
    customer: 'Pelanggan Contoh',
    customerId: 'DEMO001',
    date: '2026-10-15',
    dueDate: null,
    businessStatus: 'CLOSED',
    currency: 'IDR',
    subtotal: 180180,
    discount: 0,
    tax: 19820,
    total: 200000,
    totalPaid: 200000,
    outstanding: 0,
    packageName: null,
    sourceFormat: 'PDF',
    warnings: [],
    errors: [],
    benefits: [],
    items: [
      {
        id: `line-${index}`,
        name: 'Layanan Contoh',
        kind: 'service',
        quantity: 1,
        unitPrice: 180180,
        discount: 0,
        tax: 19820,
        mapped: true,
      },
    ],
    payments: [
      {
        id: `payment-${index}`,
        method: 'qris',
        amount: 200000,
        paidAt: '2026-10-15T00:00:00+07:00',
      },
    ],
  });
  let batch: any = {
    id: batchId,
    branchId: 'branch-jakarta',
    status: 'PREVIEW',
    version: 1,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    mode: 'simulation',
    files: fileIds.map((id, i) => ({
      id,
      name: `receipt-${i + 1}.pdf`,
      size: 5000,
      format: 'PDF',
      error: null,
    })),
    rows: fileIds.map((fileId, i) => ({
      id: randomUUID(),
      fileId,
      invoiceId: null,
      candidate: makeCandidate(i),
      status: 'REVIEW',
      errors: [],
      syncStatus: null,
    })),
  };
  const cors = {
    'access-control-allow-origin': webOrigin,
    'access-control-allow-credentials': 'true',
  };
  let releaseUpload!: () => void;
  const waiting = new Promise<void>((resolve) => (releaseUpload = resolve));
  const transferServer = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', webOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
      response.writeHead(204);
      response.end();
      return;
    }
    request.on('data', () => {});
    request.on('end', () => {
      void waiting.then(() => {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify(batch));
      });
    });
  });
  await new Promise<void>((resolve) => transferServer.listen(0, '127.0.0.1', resolve));
  const transferPort = (transferServer.address() as { port: number }).port;
  try {
    await page.route(`${api}/api/imports`, async (route) => {
      if (route.request().method() === 'POST') {
        await route.continue({ url: `http://127.0.0.1:${transferPort}/api/imports` });
      } else await route.continue();
    });
    await page.route(`${api}/api/imports?*`, (route) =>
      route.fulfill({
        json: {
          items: batch.files.length
            ? [
                {
                  id: batch.id,
                  branchId: batch.branchId,
                  status: batch.status,
                  version: batch.version,
                  createdAt: batch.createdAt,
                },
              ]
            : [],
          total: batch.files.length ? 1 : 0,
        },
        headers: cors,
      }),
    );
    await page.route(`${api}/api/imports/${batchId}/files/*`, async (route) => {
      const fileId = route.request().url().split('/').at(-1)!;
      if (route.request().method() === 'GET') {
        await route.fulfill({
          body: receiptPdf(randomUUID(), 'PREVIEW-DEMO'),
          contentType: 'application/pdf',
          headers: cors,
        });
        return;
      }
      if (route.request().method() !== 'DELETE') {
        await route.continue();
        return;
      }
      expect(route.request().postDataJSON().version).toBe(batch.version);
      batch = {
        ...batch,
        version: batch.version + 1,
        files: batch.files.filter((f: any) => f.id !== fileId),
        rows: batch.rows.filter((r: any) => r.fileId !== fileId),
      };
      await route.fulfill({
        json: batch.files.length ? { deleted: false, batch } : { deleted: true },
        headers: cors,
      });
    });
    await page.getByLabel('Pilih file invoice').setInputFiles(
      [0, 1].map((i) => ({
        name: `receipt-${i + 1}.pdf`,
        mimeType: 'application/pdf',
        buffer: receiptPdf(randomUUID(), `UPLOAD-${i}`),
      })),
    );
    await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
    await expect(page.locator('.upload-progress-panel')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Upload & buat preview', exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole('progressbar', { name: 'Menyiapkan preview invoice' })).toBeVisible(
      {
        timeout: 10000,
      },
    );
    await page.screenshot({ path: '../../docs/screenshots/import-upload-progress.png' });
    releaseUpload();
    await expect(page.getByRole('heading', { name: 'Hasil upload', exact: true })).toBeVisible();
    await expect(page.locator('.upload-result-card')).toHaveCount(2);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    expect(
      await page
        .locator('.upload-result-card')
        .first()
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe('rgba(0, 0, 0, 0)');
    await page.getByRole('button', { name: 'Preview file receipt-1.pdf', exact: true }).click();
    const preview = page.getByRole('dialog', { name: 'Preview dokumen upload' });
    await expect(preview.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
      'data-rendered',
      'true',
    );
    await preview.getByRole('button', { name: 'Tutup', exact: true }).click();
    await page.screenshot({ path: '../../docs/screenshots/import-upload-result-cards.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.locator('.upload-result-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: '../../docs/screenshots/import-upload-results-mobile.png' });
    for (let i = 1; i <= 2; i++) {
      await page.getByRole('button', { name: `Hapus file receipt-${i}.pdf`, exact: true }).click();
      const confirmation = page.getByRole('alertdialog', { name: 'Hapus file upload?' });
      await confirmation.getByRole('button', { name: 'Hapus file', exact: true }).click();
      await expect(confirmation).toBeHidden();
      if (i === 1) {
        await expect(page.locator('.upload-result-card')).toHaveCount(1);
        await expect(
          page.getByRole('button', { name: 'Preview file receipt-2.pdf', exact: true }),
        ).toBeVisible();
      }
    }
    await expect(
      page.getByRole('heading', { name: 'Upload invoice dalam satu batch', exact: true }),
    ).toBeVisible();
  } finally {
    releaseUpload();
    await new Promise<void>((resolve) => transferServer.close(() => resolve()));
  }
});

test('upload failure keeps selected files and reports an error without a success card', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.route(`${api}/api/imports`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 413,
      json: { error: 'File melampaui batas upload.' },
      headers: {
        'access-control-allow-origin': webOrigin,
        'access-control-allow-credentials': 'true',
      },
    });
  });
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'retry.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), 'RETRY-DEMO'),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await expect(page.locator('.imports-view>.alert.warning[role=alert]')).toContainText(
    'File melampaui batas upload.',
  );
  await expect(page.locator('.upload-progress-panel.failed')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Upload & buat preview', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('.import-selected-files')).toContainText('retry.pdf');
  await expect(page.locator('.upload-result-card')).toHaveCount(0);
});

test('reviewed icon persists and updating inspection requires confirmation before overwriting status', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const number = `REVIEW-${Date.now()}`;
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'review.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), number),
  });
  const uploaded = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/imports'),
  );
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  const batch = await (await uploaded).json();
  const endpoint = `${api}/api/imports/${batch.id}`;
  await page.getByRole('button', { name: number, exact: true }).click();
  const modal = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await selectOption(modal.getByLabel('Status Invoices'), 'CLOSED');
  await modal.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(1);
  const toast = page.getByRole('status').filter({
    hasText: /Invoice sudah diperiksa Accounting\.|Pemeriksaan invoice berhasil diperbarui\./,
  });
  await expect(toast).toContainText('Invoice sudah diperiksa Accounting.');
  const box = await toast.boundingBox();
  expect(box!.y).toBeLessThan(50);
  expect(box!.x + box!.width).toBeGreaterThan(page.viewportSize()!.width - 50);
  await toast.getByRole('button', { name: 'Tutup notifikasi' }).click();
  await expect(toast).toHaveCount(0);
  const before = await (await page.request.get(endpoint)).json();
  expect(before.rows[0].candidate.businessStatus).toBe('CLOSED');
  const stamp = before.rows[0].candidate.accountingReviewedAt;
  expect(stamp).toBeTruthy();
  await page.getByRole('button', { name: number, exact: true }).click();
  await expect(
    modal.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }),
  ).toBeVisible();
  await selectOption(modal.getByLabel('Status Invoices'), 'OPEN');
  page.once('dialog', async (confirmation) => {
    expect(confirmation.message()).toContain('ditimpa');
    await confirmation.dismiss();
  });
  await modal.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }).click();
  await expect(modal).toBeVisible();
  const cancelled = await (await page.request.get(endpoint)).json();
  expect(cancelled.version).toBe(before.version);
  expect(cancelled.rows[0].candidate.businessStatus).toBe('CLOSED');
  expect(cancelled.rows[0].candidate.accountingReviewedAt).toBe(stamp);
  page.once('dialog', (confirmation) => confirmation.accept());
  await modal.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }).click();
  await expect(modal).toBeHidden();
  await expect(toast).toContainText('Pemeriksaan invoice berhasil diperbarui.');
  await expect(toast).toHaveCount(0, { timeout: 7000 });
  const updated = await (await page.request.get(endpoint)).json();
  expect(updated.rows[0].candidate.businessStatus).toBe('OPEN');
  expect(updated.rows[0].candidate.accountingReviewedAt).toBeTruthy();
  expect(updated.rows[0].candidate.accountingReviewedAt).not.toBe(stamp);
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page
    .locator('.import-history')
    .getByRole('button', { name: /^Buka batch / })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(1);
});

test('item correction UI cancels safely, confirms reviewed edits, and resets inspection after save', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await login(page);
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const number = `ITEM-${Date.now()}`;
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'editable.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), number),
  });
  const uploaded = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().endsWith('/api/imports'),
  );
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  let batch = await (await uploaded).json();
  const marked = await page.request.patch(
    `${api}/api/imports/${batch.id}/rows/${batch.rows[0].id}/reviewed`,
    { headers: { Origin: webOrigin }, data: { version: batch.version } },
  );
  expect(marked.ok()).toBeTruthy();
  batch = await marked.json();
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }).click();
  const modal = page.locator('.import-review-modal');
  const edit = modal.getByRole('button', { name: 'Edit item Collagen Dew Facial', exact: true });
  const writes: Record<string, unknown>[] = [];
  let oldBackend = true;
  await page.route('**/api/imports/*/rows/*/items/*', async (route) => {
    if (oldBackend) {
      oldBackend = false;
      await route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: '<pre>Cannot PATCH /api/imports/example/rows/example/items/example</pre>',
      });
      return;
    }
    const body = route.request().postDataJSON();
    writes.push(body);
    const item = batch.rows[0].candidate.items[0];
    item.name = body.name;
    item.unitPrice = body.unitPrice;
    item.discount = Math.round((body.unitPrice * body.quantity * body.discountPercent) / 100);
    item.discountPercent = body.discountPercent;
    item.discountRoundingAdjustment = 0;
    item.tax = Math.round(
      ((body.unitPrice * body.quantity - item.discount) * body.taxPercent) / 100,
    );
    item.taxPercent = body.taxPercent;
    item.taxRoundingAdjustment = 0;
    batch.rows[0].candidate.accountingReviewedAt = undefined;
    batch.rows[0].candidate.discount = batch.rows[0].candidate.items.reduce(
      (n: number, i: any) => n + i.discount,
      0,
    );
    batch.rows[0].errors = ['Jumlah item setelah diskon tidak sama dengan subtotal.'];
    batch.version++;
    await route.fulfill({ json: batch });
  });
  await edit.click();
  await expect(modal.getByLabel('Pajak persen item', { exact: true })).toHaveValue('11');
  await expect(modal.getByLabel('Diskon persen item', { exact: true })).toHaveValue('70');
  await modal.getByLabel('Harga awal item', { exact: true }).fill('500450');
  await modal.getByLabel('Alasan koreksi item').fill('Harga disesuaikan dengan dokumen sumber');
  await expect(
    modal.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }),
  ).toBeDisabled();
  await modal.getByRole('button', { name: 'Batal', exact: true }).click();
  expect(writes).toHaveLength(0);
  await expect(modal.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
    '450.450',
  );
  await edit.click();
  await modal.getByLabel('Harga awal item', { exact: true }).fill('8392321');
  for (const invalid of ['', '-1', '101', '5.1234567']) {
    await modal.getByLabel('Diskon persen item', { exact: true }).fill(invalid);
    await expect(modal).not.toContainText('NaN');
    await expect(
      modal.getByRole('button', { name: 'Simpan perubahan item', exact: true }),
    ).toBeDisabled();
  }
  await modal.getByLabel('Diskon persen item', { exact: true }).fill('5');
  await modal.getByLabel('Pajak persen item', { exact: true }).fill('11');
  await expect(modal.locator('.import-item-editing')).toContainText('7.972.705');
  await expect(modal.locator('.import-item-editing')).toContainText('8.849.703');
  await expect(modal.locator('.import-item-correction [role="alert"]')).toHaveCount(0);
  await page.screenshot({ path: '../../docs/screenshots/import-edit-percentages.png' });
  await modal.getByLabel('Alasan koreksi item').fill('Harga disesuaikan dengan dokumen sumber');
  page.once('dialog', (confirmation) => confirmation.dismiss());
  await modal.getByRole('button', { name: 'Simpan perubahan item', exact: true }).click();
  expect(writes).toHaveLength(0);
  page.once('dialog', (confirmation) => confirmation.accept());
  await modal.getByRole('button', { name: 'Simpan perubahan item', exact: true }).click();
  await expect(modal.locator('.import-item-correction [role="alert"]')).toContainText(
    'Restart backend',
  );
  await expect(modal.getByLabel('Harga awal item', { exact: true })).toHaveValue('8392321');
  expect(writes).toHaveLength(0);
  page.once('dialog', (confirmation) => confirmation.accept());
  await modal.getByRole('button', { name: 'Simpan perubahan item', exact: true }).click();
  await expect(modal.getByLabel('Harga awal item', { exact: true })).toHaveCount(0);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    unitPrice: 8392321,
    discountPercent: 5,
    taxPercent: 11,
    reason: 'Harga disesuaikan dengan dokumen sumber',
  });
  expect(writes[0].tax).toBeUndefined();
  await expect(modal.getByRole('row').filter({ hasText: 'Collagen Dew Facial' })).toContainText(
    '8.392.321',
  );
  await expect(page.locator('.import-table tbody tr').filter({ hasText: number })).toContainText(
    'Perlu diperiksa',
  );
  await expect(page.locator('.import-table .invoice-review-status.checked')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Tutup', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Belum diperiksa Accounting', exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Submit ke Accurate (simulasi)', exact: true }),
  ).toBeDisabled();
});

test('failed PDF can be read again, then OCR preview shows fractional unit prices and requires review', async ({
  page,
}) => {
  await login(page);
  const candidate = {
    sourceId: '',
    number: '',
    customer: '',
    customerId: '',
    date: '',
    businessStatus: 'UNKNOWN',
    currency: 'IDR',
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    totalPaid: 0,
    outstanding: 0,
    packageName: null,
    sourceFormat: 'PDF',
    warnings: [],
    items: [],
    payments: [],
    benefits: [],
  };
  const file = {
    id: 'source',
    name: 'scan.pdf',
    size: 1024,
    format: 'PDF',
    error: 'Font lama tidak terbaca.',
  };
  const branch = (await (await page.request.get(`${api}/api/branches`)).json())[0];
  const batch = {
    id: 'ocr-ui',
    branchId: branch.id,
    status: 'PREVIEW',
    version: 1,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    mode: 'simulation',
    files: [file],
    rows: [
      {
        id: 'failed',
        fileId: 'source',
        invoiceId: null,
        candidate,
        status: 'REVIEW',
        errors: ['File belum terbaca.'],
        syncStatus: null,
      },
    ],
  };
  const parsed = {
    ...candidate,
    sourceId: 'zenoti:receipt:TEST-OCR',
    number: 'TEST-OCR',
    customer: 'Sample Customer',
    customerId: 'TEST001',
    date: '2026-10-26',
    extractionMethod: 'ocr',
    subtotal: 7207207,
    tax: 792793,
    total: 8000000,
    totalPaid: 8000000,
    items: [
      {
        id: 'line',
        name: 'Glow Skin Booster',
        quantity: 4,
        unitPrice: 1801801.75,
        discount: 0,
        tax: 792793,
      },
    ],
    payments: [
      { id: 'payment', method: 'card', amount: 8000000, paidAt: '2026-10-26T00:00:00+07:00' },
    ],
  };
  const next = {
    ...batch,
    version: 2,
    files: [{ ...file, error: null }],
    rows: [
      { ...batch.rows[0], id: 'read', candidate: parsed, errors: ['Hasil OCR harus diperiksa.'] },
    ],
  };
  await page.route('**/api/imports', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: batch });
    else await route.continue();
  });
  await page.route('**/api/imports/ocr-ui/files/source/reparse', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ version: 1 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ json: next });
  });
  await page.route('**/api/imports/ocr-ui/files/source', (route) =>
    route.fulfill({ contentType: 'application/pdf', body: receiptPdf(randomUUID(), 'TEST-OCR') }),
  );
  await page.route('**/api/imports/ocr-ui/rows/read/reviewed', (route) =>
    route.fulfill({
      json: {
        ...next,
        version: 3,
        rows: [
          {
            ...next.rows[0],
            errors: [],
            candidate: { ...parsed, accountingReviewedAt: new Date().toISOString() },
          },
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'scan.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), 'TEST-OCR'),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await expect(page.locator('.import-table')).toContainText('Belum terbaca');
  await expect(page.locator('.import-table')).not.toContainText('Rp 0');
  await page.getByRole('button', { name: 'Baca ulang', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Membaca PDF...', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'TEST-OCR', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Submit ke Accurate (simulasi)', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'TEST-OCR', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.getByRole('cell', { name: /1\.801\.801,75/ })).toBeVisible();
  await expect(dialog.locator('.import-table-totals td.amount')).toContainText('8.000.000');
  await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
    'data-rendered',
    'true',
  );
  await dialog.getByRole('button', { name: 'Selesai memeriksa', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('checkbox', { name: /Saya telah memeriksa item/ }).check();
  await expect(
    page.getByRole('button', { name: 'Submit ke Accurate (simulasi)', exact: true }),
  ).toBeEnabled();
});

test('package issues use passive notices while matching automatic details need no notice', async ({
  page,
}) => {
  await login(page);
  const branch = (await (await page.request.get(`${api}/api/branches`)).json())[0];
  const parent = {
    id: 'package',
    name: 'Custom Package Sample',
    quantity: 1,
    unitPrice: 8108108,
    discount: 0,
    tax: 891892,
  };
  const items = [
    {
      id: 'package:detail:1',
      name: 'Sample facial',
      quantity: 6,
      unitPrice: 2702703,
      discount: 8108110,
      discountPercent: 50,
      discountRoundingAdjustment: 1,
      tax: 891892,
    },
    {
      id: 'package:detail:2',
      name: 'Sample massage',
      quantity: 1,
      unitPrice: 360360,
      discount: 360360,
      discountPercent: 100,
      tax: 0,
    },
  ];
  const candidate = {
    sourceId: 'MATCHED-PACKAGE',
    number: 'MATCHED-PACKAGE',
    customer: 'Sample Customer',
    customerId: 'TEST001',
    date: '2026-10-26',
    businessStatus: 'CLOSED',
    currency: 'IDR',
    subtotal: 8108108,
    discount: 8468470,
    tax: 891892,
    total: 9000000,
    totalPaid: 9000000,
    outstanding: 0,
    packageName: parent.name,
    packageParents: [parent],
    sourceFormat: 'PDF',
    extractionMethod: 'ocr',
    warnings: [],
    items,
    payments: [],
    benefits: [],
  };
  const baseRow = {
    id: 'matching',
    fileId: 'source',
    invoiceId: null,
    status: 'REVIEW',
    errors: ['Hasil OCR harus diperiksa.'],
    syncStatus: null,
  };
  const batch = {
    id: 'package-visibility',
    branchId: branch.id,
    status: 'PREVIEW',
    version: 1,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    mode: 'simulation',
    files: [{ id: 'source', name: 'sample-package.pdf', size: 1024, format: 'PDF', error: null }],
    rows: [
      { ...baseRow, candidate },
      {
        ...baseRow,
        id: 'mismatch',
        errors: ['Jumlah item setelah diskon tidak sama dengan subtotal.'],
        candidate: {
          ...candidate,
          sourceId: 'MISMATCH-PACKAGE',
          number: 'MISMATCH-PACKAGE',
          items: [{ ...items[0], discount: 8108100 }, items[1]],
        },
      },
      {
        ...baseRow,
        id: 'missing',
        errors: ['Detail paket belum lengkap.'],
        candidate: {
          ...candidate,
          sourceId: 'MISSING-PACKAGE',
          number: 'MISSING-PACKAGE',
          items: [parent],
        },
      },
    ],
  };
  await page.route('**/api/imports', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: batch });
    else await route.continue();
  });
  await page.route('**/api/imports/package-visibility/files/source', (route) =>
    route.fulfill({
      contentType: 'application/pdf',
      body: receiptPdf(randomUUID(), 'MATCHED-PACKAGE'),
    }),
  );
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'sample-package.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), 'MATCHED-PACKAGE'),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await page.getByRole('button', { name: 'MATCHED-PACKAGE', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
  });
  await expect(dialog.locator('.package-detail-notice')).toHaveCount(0);
  await expect(dialog.getByRole('row').filter({ hasText: 'Sample facial' })).toContainText(
    '9.000.000',
  );
  await expect(
    dialog.getByRole('button', { name: 'Edit item Sample facial', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'MISMATCH-PACKAGE', exact: true }).click();
  const notice = dialog.locator('.package-detail-notice');
  await expect(notice).toHaveAttribute('role', 'status');
  await expect(notice).toContainText('Nilai rincian belum sesuai invoice sumber');
  await expect(notice.getByRole('button')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Edit detail item', exact: true })).toHaveCount(
    0,
  );
  await expect(dialog.getByRole('button', { name: 'Tambah item', exact: true })).toBeEnabled();
  await expect(
    dialog.getByRole('button', { name: 'Hapus item Sample facial', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Edit item Sample facial', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Simpan perubahan item', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'MISSING-PACKAGE', exact: true }).click();
  await expect(notice).toContainText('Rincian item belum terbaca lengkap');
  await expect(notice).toContainText('Hapus baris paket induk');
  await expect(notice.getByRole('button')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Input detail item', exact: true })).toHaveCount(
    0,
  );
  await dialog.getByRole('button', { name: 'Tambah item', exact: true }).click();
  await expect(dialog.getByRole('form', { name: 'Form tambah item' })).toBeVisible();
  await page.screenshot({ path: '../../docs/screenshots/import-package-info-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('add item is above the table, saves a versioned addition and opens its paginated row', async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1050 });
  const branch = (await (await page.request.get(`${api}/api/branches`)).json())[0];
  const items = Array.from({ length: 25 }, (_, i) => ({
    id: 'line-' + i,
    name: 'Existing service ' + (i + 1),
    quantity: 1,
    unitPrice: 100000,
    discount: 0,
    tax: 0,
  }));
  const candidate = {
    sourceId: 'ADD-UI',
    number: 'ADD-UI',
    customer: 'Sample Customer',
    customerId: 'TEST001',
    date: '2026-10-26',
    businessStatus: 'CLOSED',
    currency: 'IDR',
    subtotal: 2500000,
    discount: 0,
    tax: 0,
    total: 2500000,
    totalPaid: 2500000,
    outstanding: 0,
    packageName: null,
    sourceFormat: 'PDF',
    warnings: [],
    items,
    payments: [],
    benefits: [],
    accountingReviewedAt: new Date().toISOString(),
  };
  const row = {
    id: 'row',
    fileId: 'source',
    invoiceId: null,
    candidate,
    status: 'REVIEW',
    errors: [],
    syncStatus: null,
  };
  const batch = {
    id: 'add-ui',
    branchId: branch.id,
    status: 'PREVIEW',
    version: 1,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    mode: 'simulation',
    files: [{ id: 'source', name: 'source.pdf', size: 1024, format: 'PDF', error: null }],
    rows: [row],
  };
  await page.route('**/api/imports', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: batch });
    else await route.continue();
  });
  await page.route('**/api/imports/add-ui/files/source', (route) =>
    route.fulfill({ contentType: 'application/pdf', body: receiptPdf(randomUUID(), 'ADD-UI') }),
  );
  let saves = 0;
  await page.route('**/api/imports/add-ui/rows/row/items', async (route) => {
    saves++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({
      version: 1,
      name: 'Missing service',
      kind: 'service',
      quantity: 1,
      unitPrice: 50000,
      discountPercent: 0,
      taxPercent: 0,
      reason: 'Missing line from the source PDF',
    });
    await route.fulfill({
      status: 201,
      json: {
        ...batch,
        version: 2,
        rows: [
          {
            ...row,
            candidate: {
              ...candidate,
              accountingReviewedAt: undefined,
              items: [
                ...items,
                {
                  id: 'manual-new',
                  name: 'Missing service',
                  quantity: 1,
                  unitPrice: 50000,
                  discount: 0,
                  discountPercent: 0,
                  tax: 0,
                  taxPercent: 0,
                },
              ],
            },
            errors: ['Jumlah item setelah diskon tidak sama dengan subtotal.'],
          },
        ],
      },
    });
  });
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'source.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), 'ADD-UI'),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await page.getByRole('button', { name: 'ADD-UI', exact: true }).click();
  const dialog = page.getByRole('dialog', {
      name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
    }),
    add = dialog.getByRole('button', { name: 'Tambah item', exact: true });
  await expect(add).toBeVisible();
  const position = await add.evaluate((el) => {
    const table = el.closest('.import-detail')!.querySelector('table')!;
    const a = el.getBoundingClientRect(),
      b = table.getBoundingClientRect();
    return { above: a.bottom <= b.top, right: Math.abs(a.right - b.right) };
  });
  expect(position.above).toBeTruthy();
  expect(position.right).toBeLessThan(4);
  await add.click();
  const form = dialog.getByRole('form', { name: 'Form tambah item' });
  await expect(
    dialog.getByRole('button', { name: 'Perbarui Pemeriksaan', exact: true }),
  ).toBeDisabled();
  await form.getByLabel('Nama item baru', { exact: true }).fill('Missing service');
  for (const value of ['2382321', '13513515', '']) {
    await form.getByLabel('Harga unit item baru', { exact: true }).fill(value);
    await expect(form).not.toContainText('NaN');
  }
  await form.getByLabel('Harga unit item baru', { exact: true }).fill('50000');
  await form
    .getByLabel('Alasan penambahan item', { exact: true })
    .fill('Missing line from the source PDF');
  await expect(form).not.toContainText('NaN');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1050 });
  page.once('dialog', (d) => d.accept());
  await form.getByRole('button', { name: 'Simpan item baru', exact: true }).click();
  await expect(form).toBeHidden();
  expect(saves).toBe(1);
  await expect(
    dialog.getByRole('button', { name: 'Edit item Missing service', exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole('navigation', { name: 'Halaman item invoice' })).toContainText(
    '2 / 2',
  );
  await expect(dialog.locator('.import-table-totals td.amount')).toContainText('2.550.000');
  await expect(add).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('.import-table')).toContainText('Perlu diperiksa');
  const submitted = { ...batch, status: 'SUBMITTED', version: 3 };
  await page.route('**/api/imports/add-ui', (route) => route.fulfill({ json: submitted }));
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await page.getByRole('button', { name: 'ADD-UI', exact: true }).click();
  await expect(add).toBeVisible();
  await expect(add).toBeDisabled();
});

test('delete icon confirms with Ya or Batal, retains failed attempts and clamps item pagination', async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page);
  await page.setViewportSize({ width: 1440, height: 1050 });
  const branch = (await (await page.request.get(`${api}/api/branches`)).json())[0];
  const originalItems = Array.from({ length: 25 }, (_, i) => ({
    id: 'line-' + i,
    name: 'Existing service ' + (i + 1),
    quantity: 1,
    unitPrice: 100000,
    discount: 0,
    tax: 0,
  }));
  const wrong = {
    id: 'manual-item',
    name: 'Incorrect manual item',
    quantity: 1,
    unitPrice: 50000,
    discount: 0,
    tax: 0,
  };
  const candidate = {
    sourceId: 'DELETE-UI',
    number: 'DELETE-UI',
    customer: 'Sample Customer',
    customerId: 'TEST001',
    date: '2026-10-26',
    businessStatus: 'CLOSED',
    currency: 'IDR',
    subtotal: 2500000,
    discount: 0,
    tax: 0,
    total: 2500000,
    totalPaid: 2500000,
    outstanding: 0,
    packageName: null,
    sourceFormat: 'PDF',
    warnings: [],
    items: [...originalItems, wrong],
    payments: [],
    benefits: [],
    accountingReviewedAt: new Date().toISOString(),
  };
  const row = {
    id: 'row',
    fileId: 'source',
    invoiceId: null,
    candidate,
    status: 'REVIEW',
    errors: ['Jumlah item setelah diskon tidak sama dengan subtotal.'],
    syncStatus: null,
  };
  const batch = {
    id: 'delete-ui',
    branchId: branch.id,
    status: 'PREVIEW',
    version: 1,
    createdAt: new Date().toISOString(),
    submittedAt: null,
    mode: 'simulation',
    files: [{ id: 'source', name: 'source.pdf', size: 1024, format: 'PDF', error: null }],
    rows: [row],
  };
  await page.route('**/api/imports', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: batch });
    else await route.continue();
  });
  await page.route('**/api/imports/delete-ui/files/source', (route) =>
    route.fulfill({ contentType: 'application/pdf', body: receiptPdf(randomUUID(), 'DELETE-UI') }),
  );
  let calls = 0;
  await page.route('**/api/imports/delete-ui/rows/row/items/manual-item', async (route) => {
    calls++;
    expect(route.request().method()).toBe('DELETE');
    expect(route.request().postDataJSON()).toEqual({ version: 1 });
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (calls === 1) {
      await route.fulfill({
        status: 500,
        json: { error: 'Penghapusan belum berhasil. Coba kembali.' },
      });
      return;
    }
    await route.fulfill({
      json: {
        ...batch,
        version: 2,
        rows: [
          {
            ...row,
            errors: [],
            candidate: { ...candidate, items: originalItems, accountingReviewedAt: undefined },
          },
        ],
      },
    });
  });
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'source.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), 'DELETE-UI'),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await page.getByRole('button', { name: 'DELETE-UI', exact: true }).click();
  const review = page.getByRole('dialog', {
      name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
    }),
    confirmation = page.getByRole('alertdialog', { name: 'Hapus item?' });
  await review
    .getByRole('button', { name: 'Halaman item invoice: berikutnya', exact: true })
    .click();
  const remove = review.getByRole('button', {
    name: 'Hapus item Incorrect manual item',
    exact: true,
  });
  await remove.click();
  await expect(confirmation).toContainText('Incorrect manual item');
  await expect(page.getByRole('alertdialog')).toHaveCount(1);
  await confirmation.getByRole('button', { name: 'Batal', exact: true }).click();
  expect(calls).toBe(0);
  await expect(remove).toBeVisible();
  await remove.click();
  await page.keyboard.press('Escape');
  await expect(confirmation).toBeHidden();
  expect(calls).toBe(0);
  await remove.click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await expect(confirmation.getByRole('button', { name: 'Ya', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1050 });
  mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
  await page.screenshot({ path: '../../docs/screenshots/import-delete-item-confirm.png' });
  await confirmation.getByRole('button', { name: 'Ya', exact: true }).click();
  await expect(confirmation.getByRole('alert')).toContainText('Penghapusan belum berhasil');
  expect(calls).toBe(1);
  await confirmation.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(remove).toBeVisible();
  await remove.click();
  await confirmation.getByRole('button', { name: 'Ya', exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(calls).toBe(2);
  await expect(remove).toHaveCount(0);
  await expect(review.locator('tbody tr')).toHaveCount(25);
  await expect(
    review.getByRole('button', { name: 'Hapus item Existing service 1', exact: true }),
  ).toBeVisible();
  await expect(review.locator('.import-table-totals td.amount')).toContainText('2.500.000');
  await expect(review.getByRole('navigation', { name: 'Halaman item invoice' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Sudah diperiksa Accounting', exact: true }),
  ).toHaveCount(0);
  const submitted = { ...batch, status: 'SUBMITTED', version: 3 };
  await page.route('**/api/imports/delete-ui', (route) => route.fulfill({ json: submitted }));
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await page.getByRole('button', { name: 'DELETE-UI', exact: true }).click();
  await expect(review.getByRole('button', { name: /^Hapus item / })).toHaveCount(0);
});
