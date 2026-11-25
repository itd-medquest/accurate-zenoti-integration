import { expect, test, type Page } from '@playwright/test';
import type {
  Batch,
  ImportHistoryEntry,
  ImportSummary,
} from '../../src/features/easyrecap/imports/types';
import type { addItem } from '../../src/features/easyrecap/imports/services/imports.service';
import { receiptPdf } from '../fixtures/receipt-fixture';
import { selectOption } from '../helpers/select-option';
import { twoPagePdf } from '../fixtures/two-page-pdf';

const packageDescription = 'Custom Package–Elma–202610131152726–Redeemed';
const longMasterName =
  'FRACTIONAL IPL SHOOT · Layanan Accurate Uji dengan keterangan lengkap untuk pemeriksaan';

async function fixture(
  page: Page,
  notes = true,
  options: { mode?: 'live' | 'simulation'; destination?: boolean; mapped?: boolean } = {},
) {
  const errors: string[] = [];
  const requests: string[] = [];
  const saves: { version: number; itemId: string; masterId: string; kind: string }[] = [];
  const state = { failSave: true, failAdd: true };
  const additions: Parameters<typeof addItem>[2][] = [];
  const batch: Batch = {
    id: 'review-batch',
    branchId: 'review-company',
    status: 'PREVIEW',
    version: 1,
    createdAt: '2026-11-24T03:00:00Z',
    submittedAt: null,
    mode: options.mode ?? 'live',
    accurateDestination: {
      branchId: 'review-company',
      databaseId: '99',
      databaseName: 'Perusahaan Uji',
      targetBranchId: '300',
      targetBranchName: 'Cabang Uji',
    },
    files: [{ id: 'source-file', name: 'Invoice-uji.pdf', size: 1000, format: 'PDF', error: null }],
    rows: [
      {
        id: 'review-row',
        fileId: 'source-file',
        invoiceId: null,
        syncStatus: null,
        status: notes ? 'CONFLICT' : 'VALID',
        errors: notes
          ? [
              'Konfirmasikan pemeriksaan setelah melengkapi mapping Accurate.',
              'Pilih Status Invoices Open atau Closed setelah memeriksa sumber.',
              'Konfirmasikan pemeriksaan setelah melengkapi mapping Accurate.',
            ]
          : [],
        candidate: {
          sourceId: 'source-file',
          sourceInvoiceNumber: 'INV-UI-001',
          receiptNumber: 'RECEIPT-UI-001',
          number: 'INV-UI-001',
          customer: 'Pelanggan Uji',
          customerId: 'MPA-1',
          date: '2026-11-24',
          businessStatus: notes ? 'UNKNOWN' : 'CLOSED',
          currency: 'IDR',
          subtotal: 150000,
          discount: 0,
          tax: 0,
          total: 150000,
          totalPaid: 150000,
          outstanding: 0,
          packageName: null,
          sourceFormat: 'PDF',
          warnings: ['Catatan sumber informasional.'],
          accurateSelection: {
            databaseId: '99',
            targetBranchId: '300',
            customer: { id: 'customer-1', code: 'MPA-1', name: 'Pelanggan Uji' },
            items: {},
          },
          items: [
            {
              id: 'service-1',
              name: 'Layanan Uji',
              quantity: 1,
              unitPrice: 150000,
              discount: 0,
              tax: 0,
            },
            {
              id: 'redeemed-1',
              name: 'Layanan Redeemed',
              quantity: 1,
              unitPrice: 100000,
              discount: 100000,
              tax: 0,
              redeemed: true,
              redemptionNote: packageDescription,
            },
            { id: 'free-1', name: 'Consultation', quantity: 1, unitPrice: 0, discount: 0, tax: 0 },
          ],
          payments: [{ id: 'payment-1', method: 'QRIS', amount: 150000, paidAt: '2026-11-24' }],
          benefits: [],
        },
      },
    ],
  };
  if (options.destination === false) batch.accurateDestination = undefined;
  if (options.mapped)
    batch.rows[0].candidate.accurateSelection!.items['service-1'] = {
      id: '20',
      code: 'SERVICE-001',
      name: longMasterName,
      unitName: 'Jasa',
    };
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /hydration|cannot be a descendant|each child|validateDOMNesting/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const method = route.request().method();
    requests.push(`${method} ${path}`);
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value });
    const actor = {
      id: 'ui-admin',
      name: 'Admin Uji',
      email: 'ui@example.test',
      role: 'super_admin',
      active: true,
    };
    if (path === '/auth/get-session')
      return json({
        session: { id: 'session-ui', userId: actor.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: actor,
      });
    if (path === '/me') return json(actor);
    if (path === '/branches')
      return json([{ id: batch.branchId, name: 'Perusahaan Uji', centerId: 'TEST', active: true }]);
    if (path === '/dashboard')
      return json({
        summary: {
          total: 0,
          synced: 0,
          processing: 0,
          failed: 0,
          pending: 0,
          closed: 0,
          open: 0,
          outstanding: 0,
        },
        rate: 0,
        trend: [],
        recent: [],
        errors: [],
      });
    if (path === '/invoices') return json({ rows: [], total: 0, page: 1, pageSize: 5 });
    if (path === '/imports/overview')
      return json({
        items: [
          {
            ...batch,
            invoiceCount: 1,
            references: ['INV-UI-001'],
            counts: {
              sent: 0,
              draft: 1,
              failed: 0,
              redeem: 0,
              processing: 0,
              simulation: 0,
              local: 0,
            },
          },
        ],
        total: 1,
        summary: { sent: 0, draft: 1, failed: 0, redeem: 0, processing: 0 },
      });
    if (path === '/imports/review-batch') return json(batch);
    if (path === '/imports/review-batch/files/source-file')
      return route.fulfill({
        contentType: 'application/pdf',
        body: receiptPdf('UI-SOURCE', 'RECEIPT-UI-001', 'INV-UI-001'),
      });
    if (path === '/accurate/masters')
      return json({
        database: { id: '99', name: 'Perusahaan Uji' },
        items: [{ id: '20', code: 'SERVICE-001', name: 'Layanan Accurate Uji', unitName: 'Jasa' }],
      });
    if (path === '/imports/review-batch/rows/review-row/items' && method === 'POST') {
      const input = route.request().postDataJSON() as Parameters<typeof addItem>[2];
      additions.push(input);
      if (state.failAdd)
        return json({ error: 'Item dan mapping belum disimpan. Coba kembali.' }, 503);
      if (input.version !== batch.version) return json({ error: 'Versi tidak sesuai.' }, 409);
      batch.rows[0].candidate.items.push({
        id: 'new-service',
        name: input.name,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        discount: 0,
        tax: 0,
      });
      batch.rows[0].candidate.accurateSelection!.items['new-service'] = {
        id: input.accurateMasterId!,
        code: 'SERVICE-001',
        name: 'Layanan Accurate Uji',
        unitName: 'Jasa',
      };
      batch.version++;
      return json(batch);
    }
    if (path.endsWith('/mapping') && method === 'PUT') {
      const input = route.request().postDataJSON() as (typeof saves)[number];
      saves.push(input);
      if (state.failSave)
        return json({ error: 'Mapping belum dapat disimpan. Coba kembali.' }, 503);
      if (input.version !== batch.version) return json({ error: 'Versi tidak sesuai.' }, 409);
      batch.rows[0].candidate.accurateSelection!.items[input.itemId] = {
        id: input.masterId,
        code: 'SERVICE-001',
        name: 'Layanan Accurate Uji',
        unitName: 'Jasa',
      };
      batch.version++;
      batch.rows[0].status = 'VALID';
      batch.rows[0].errors = [];
      return json({ saved: true });
    }
    return json([]);
  });
  return { errors, requests, saves, state, additions, batch };
}

async function openReview(page: Page, mobile = false, dark = false) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  if (dark) await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
  if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Buka batch review-b' }).click();
  await page.getByRole('button', { name: 'Periksa INV-UI-001', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('review counts blocking notes and saves mapping in its item row without losing failed choices', async ({
  page,
}) => {
  const f = await fixture(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openReview(page);
  const dialog = page.getByRole('dialog');
  const status = dialog.locator('.modal-footer').getByRole('status');
  await expect(status).toHaveText('3 Catatan Perlu Ditinjau');
  await expect(status).toHaveCSS('color', 'rgb(185, 57, 77)');
  await expect(status.locator('svg')).toHaveClass(/lucide-circle-x/);
  await expect(
    dialog.getByRole('alert', { name: 'Validasi pengiriman invoice' }).locator('li'),
  ).toHaveCount(3);
  const mapping = dialog.getByLabel('Mapping Accurate Layanan Uji', { exact: true });
  await expect(mapping).toHaveCount(1);
  await expect(mapping.locator('xpath=ancestor::tr')).toHaveClass(/import-item-values/);
  await expect(mapping.locator('xpath=ancestor::tr')).toContainText('Rp 150.000');
  await selectOption(
    dialog.getByRole('combobox', { name: 'Status Invoices', exact: true }),
    'CLOSED',
  );
  await expect(status).toHaveText('2 Catatan Perlu Ditinjau');
  await expect(
    dialog.getByRole('alert', { name: 'Validasi pengiriman invoice' }).locator('li'),
  ).toHaveCount(2);
  await expect(
    dialog.getByRole('button', { name: 'Petakan item Layanan Redeemed', exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'Petakan item Consultation', exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Petakan item Layanan Uji', exact: true }).click();
  const editor = dialog.locator('.import-item-mapping');
  await editor.getByRole('button', { name: 'Cari', exact: true }).click();
  await selectOption(editor.getByRole('combobox'), '20');
  await editor.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('Mapping belum dapat disimpan');
  await expect(editor.getByRole('combobox')).toContainText('SERVICE-001');
  await expect(status).toHaveText('2 Catatan Perlu Ditinjau');
  f.state.failSave = false;
  await editor.getByRole('button', { name: 'Simpan pilihan', exact: true }).click();
  await expect(mapping).toContainText('SERVICE-001');
  await expect(mapping).toContainText('Satuan: Jasa');
  await expect(editor).toHaveCount(0);
  await expect(status).toHaveText('Semua Catatan Sudah Ditinjau');
  await expect(status).toHaveCSS('color', 'rgb(33, 106, 77)');
  await expect(status.locator('svg')).toHaveClass(/lucide-circle-check/);
  expect(f.saves).toEqual([
    { version: 1, kind: 'item', masterId: '20', itemId: 'service-1' },
    { version: 1, kind: 'item', masterId: '20', itemId: 'service-1' },
  ]);
  await page.screenshot({ path: 'tmp/invoice-review-enhancements.png' });
  await dialog.getByRole('button', { name: 'Ubah mapping Layanan Uji', exact: true }).click();
  await expect(dialog.getByRole('textbox', { name: 'Layanan Uji', exact: true })).toBeVisible();
  expect(f.errors).toEqual([]);
});

for (const mobile of [false, true])
  test(`new item and Accurate mapping share one form and retain inputs after failure (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    const f = await fixture(page, false);
    await page.setViewportSize({ width: mobile ? 390 : 2200, height: mobile ? 844 : 1100 });
    await openReview(page, mobile, !mobile);
    const dialog = page.getByRole('dialog');
    if (!mobile) expect((await dialog.boundingBox())!.width).toBeCloseTo(2120, 0);
    await dialog.getByRole('button', { name: 'Tambah item', exact: true }).click();
    const form = dialog.getByRole('form', { name: 'Form tambah item', exact: true });
    await form
      .getByRole('textbox', { name: 'Nama item baru', exact: true })
      .fill('Layanan tambahan');
    await form.getByRole('spinbutton', { name: 'Harga unit item baru', exact: true }).fill('10000');
    await form
      .getByRole('textbox', { name: 'Alasan penambahan item', exact: true })
      .fill('Layanan terlewat saat pembacaan dokumen');
    const save = form.getByRole('button', { name: 'Simpan item baru', exact: true });
    await expect(save).toBeDisabled();
    await form
      .getByRole('textbox', { name: 'Mapping Accurate item baru', exact: true })
      .fill('Layanan');
    await form.getByRole('button', { name: 'Cari', exact: true }).click();
    await selectOption(
      form.getByRole('combobox', {
        name: 'Hasil pencarian Mapping Accurate item baru',
        exact: true,
      }),
      '20',
    );
    await form.getByRole('button', { name: 'Gunakan pilihan', exact: true }).click();
    await expect(form.getByText('Pilihan baru', { exact: true })).toBeVisible();
    expect(f.additions).toHaveLength(0);
    await save.click();
    await expect(form.getByRole('alert')).toContainText('Item dan mapping belum disimpan');
    await expect(form.getByRole('textbox', { name: 'Nama item baru', exact: true })).toHaveValue(
      'Layanan tambahan',
    );
    await expect(form).toContainText('Layanan Accurate Uji');
    f.state.failAdd = false;
    await save.click();
    await expect(form).toHaveCount(0);
    const summary = dialog.getByLabel('Mapping Accurate Layanan tambahan', { exact: true });
    await expect(summary).toContainText('SERVICE-001');
    const values = summary.locator('xpath=ancestor::tr');
    await expect(values).toContainText('Mapping tersimpan');
    await expect(dialog.locator('tbody > tr')).toHaveCount(4);
    await expect(dialog.getByText('Harga invoice/unit', { exact: false })).toHaveCount(0);
    await expect(
      values.getByRole('button', { name: 'Hapus item Layanan tambahan', exact: true }),
    ).toHaveCount(1);
    await expect(values.locator('.import-service-title')).toHaveCSS('font-size', '18px');
    const itemEdit = await values
      .getByRole('button', { name: 'Edit item Layanan tambahan', exact: true })
      .boundingBox();
    const mappingEdit = await values
      .getByRole('button', { name: 'Ubah mapping Layanan tambahan', exact: true })
      .boundingBox();
    expect(
      Math.abs(itemEdit!.x + itemEdit!.width / 2 - mappingEdit!.x - mappingEdit!.width / 2),
    ).toBeLessThan(6);
    expect(f.additions).toHaveLength(2);
    expect(
      f.additions.every((input) => input.accurateMasterId === '20' && input.version === 1),
    ).toBe(true);
    expect(f.saves).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await summary.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `tmp/invoice-item-layout-${mobile ? 'mobile' : 'desktop'}.png` });
    expect(f.errors).toEqual([]);
  });

test('simulation keeps stored mapping tags and status visible without changing delivery mode or exposing live controls', async ({
  page,
}) => {
  const f = await fixture(page, false, { mode: 'simulation', mapped: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openReview(page);
  const dialog = page.getByRole('dialog');
  const row = dialog
    .getByLabel('Mapping Accurate Layanan Uji', { exact: true })
    .locator('xpath=ancestor::tr');
  await expect(row).toContainText('SERVICE-001');
  await expect(row).toContainText('Satuan: Jasa');
  await expect(row).toContainText('Mapping tersimpan');
  await expect(dialog.getByRole('alert', { name: 'Ketersediaan mapping Accurate' })).toContainText(
    'Mode Simulasi',
  );
  await expect(
    row.getByRole('button', { name: 'Ubah mapping Layanan Uji', exact: true }),
  ).toHaveCount(0);
  await expect(
    dialog
      .getByLabel('Mapping Accurate Layanan Redeemed', { exact: true })
      .locator('xpath=ancestor::tr'),
  ).toContainText('Redeemed · Tidak dikirim ke Accurate');
  expect(f.requests.some((request) => /^(PATCH|PUT|POST) /.test(request))).toBe(false);
  expect(f.errors).toEqual([]);
});

test('missing Accurate destination shows the mapping state instead of hiding paid items', async ({
  page,
}) => {
  const f = await fixture(page, false, { destination: false, mapped: true });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openReview(page);
  const dialog = page.getByRole('dialog');
  const mapping = dialog.getByLabel('Mapping Accurate Layanan Uji', { exact: true });
  const row = mapping.locator('xpath=ancestor::tr');
  await expect(mapping).toContainText('Tujuan Accurate belum tersedia');
  await expect(row).toContainText('Tujuan belum tersedia');
  await expect(row).not.toContainText('Mapping tersimpan');
  await expect(row).not.toContainText('SERVICE-001');
  await expect(dialog.getByRole('alert', { name: 'Ketersediaan mapping Accurate' })).toContainText(
    'Minta Super Admin',
  );
  await expect(
    row.getByRole('button', { name: 'Petakan item Layanan Uji', exact: true }),
  ).toHaveCount(0);
  expect(f.errors).toEqual([]);
});

test('review divider supports dragging and keyboard, fits PDF and preserves edits across responsive layouts', async ({
  page,
}) => {
  const f = await fixture(page, false);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openReview(page, false, true);
  const dialog = page.getByRole('dialog');
  const separator = dialog.getByRole('separator', {
    name: 'Ubah lebar panel pemeriksaan dan dokumen',
  });
  const fields = page.locator('[data-panel][id="invoice-review-fields"]');
  const source = page.locator('[data-panel][id="invoice-review-source"]');
  const pdf = dialog.getByRole('img', { name: 'PDF sumber halaman 1' });
  await expect(pdf).toHaveAttribute('data-rendered', 'true');
  const initial = (await fields.boundingBox())!.width;
  const initialPdf = (await pdf.boundingBox())!.width;
  const initialRequests = f.requests.length;
  const handle = (await separator.boundingBox())!;
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x - 210, handle.y + handle.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await fields.boundingBox())!.width).toBeLessThan(initial - 150);
  await expect.poll(async () => (await pdf.boundingBox())!.width).toBeGreaterThan(initialPdf + 100);
  await separator.focus();
  await page.keyboard.press('End');
  await expect.poll(async () => (await fields.boundingBox())!.width).toBeGreaterThan(initial);
  const maximum = (await fields.boundingBox())!.width;
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await fields.boundingBox())!.width).toBeLessThan(maximum);
  await page.keyboard.press('Home');
  await expect.poll(async () => (await fields.boundingBox())!.width).toBeLessThan(initial);
  await separator.dblclick();
  await expect
    .poll(async () => Math.abs((await fields.boundingBox())!.width - initial))
    .toBeLessThan(handle.width + 1);
  expect(f.requests.length).toBe(initialRequests);
  await selectOption(dialog.getByRole('combobox', { name: 'Zoom PDF sumber', exact: true }), '125');
  await dialog.getByRole('button', { name: 'Edit item Layanan Uji', exact: true }).click();
  await dialog
    .getByRole('textbox', { name: 'Nama item', exact: true })
    .fill('Layanan setelah koreksi');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(separator).toBeHidden();
  await expect(
    dialog.getByRole('combobox', { name: 'Zoom PDF sumber', exact: true }),
  ).toContainText('125%');
  await expect(dialog.getByRole('textbox', { name: 'Nama item', exact: true })).toHaveValue(
    'Layanan setelah koreksi',
  );
  const left = (await fields.boundingBox())!;
  const right = (await source.boundingBox())!;
  expect(right.y).toBeGreaterThanOrEqual(left.y + left.height - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/invoice-review-mobile.png' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect(separator).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Nama item', exact: true })).toHaveValue(
    'Layanan setelah koreksi',
  );
  await page.mouse.click(4, 4);
  await expect(dialog).toBeHidden();
  expect(f.errors).toEqual([]);
});

for (const mobile of [false, true])
  test(`mapping pills truncate and disclose full text, and delete actions have equal widths (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    const f = await fixture(page, false, { mapped: true });
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: mobile ? 844 : 1000 });
    await openReview(page, mobile, !mobile);
    const review = page.getByRole('dialog', {
      name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
      exact: true,
    });
    const redeemed = review.getByLabel('Mapping Accurate Layanan Redeemed', { exact: true });
    const packagePill = redeemed.getByRole('button', {
      name: 'Lihat keterangan Layanan Redeemed',
      exact: true,
    });
    await expect(packagePill).toContainText(packageDescription);
    const redeemedRow = redeemed.locator('xpath=ancestor::tr');
    await expect(redeemedRow.getByText(packageDescription, { exact: true })).toHaveCount(1);
    await expect(redeemedRow).not.toContainText('Tidak memerlukan mapping Accurate');
    await expect(redeemedRow).toContainText('Redeemed · Tidak dikirim ke Accurate');
    const pill = review.getByRole('button', { name: 'Lihat keterangan Layanan Uji', exact: true });
    const text = pill.locator('span');
    await expect(text).toHaveCSS('text-overflow', 'ellipsis');
    await expect(text).toHaveCSS('white-space', 'nowrap');
    expect(await text.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
    await pill.click();
    const details = page.getByRole('dialog', { name: 'Keterangan Layanan Uji', exact: true });
    await expect(details).toBeVisible();
    await expect(details).toContainText(`SERVICE-001 · ${longMasterName} · Satuan: Jasa`);
    await expect(details.locator('[data-slot="popover-description"]')).toHaveCSS(
      'white-space',
      'normal',
    );
    await page.keyboard.press('Escape');
    await expect(details).toHaveCount(0);
    await expect(review).toBeVisible();
    await expect(pill).toBeFocused();
    await packagePill.click();
    await expect(
      page.getByRole('dialog', { name: 'Keterangan Layanan Redeemed', exact: true }),
    ).toContainText(packageDescription);
    await page.keyboard.press('Escape');
    const mappingEdit = review.getByRole('button', {
      name: 'Ubah mapping Layanan Uji',
      exact: true,
    });
    const itemEdit = review.getByRole('button', { name: 'Edit item Layanan Uji', exact: true });
    expect(await mappingEdit.evaluate((element) => getComputedStyle(element).color)).toBe(
      await itemEdit.evaluate((element) => getComputedStyle(element).color),
    );
    await pill.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `tmp/invoice-mapping-pills-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await review.getByRole('button', { name: 'Hapus item Layanan Uji', exact: true }).click();
    const confirmation = page.getByRole('alertdialog', { name: 'Hapus item?', exact: true });
    await expect(confirmation).toBeVisible();
    const cancel = confirmation.getByRole('button', { name: 'Batal', exact: true });
    const confirm = confirmation.getByRole('button', { name: 'Ya', exact: true });
    // Measure both actions in the same frame while the dialog entrance animation runs.
    const [cancelBox, confirmBox] = await confirmation
      .locator('.modal-footer button')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const { width, y } = button.getBoundingClientRect();
          return { width, y };
        }),
      );
    expect(Math.abs(cancelBox.width - confirmBox.width)).toBeLessThan(1);
    expect(cancelBox.width).toBeGreaterThan(mobile ? 120 : 140);
    expect(Math.abs(cancelBox.y - confirmBox.y)).toBeLessThan(1);
    await expect(confirm).toBeEnabled();
    await page.screenshot({
      path: `tmp/invoice-delete-actions-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await cancel.click();
    await expect(review).toBeVisible();
    await expect(
      review.getByRole('button', { name: 'Edit item Layanan Uji', exact: true }),
    ).toBeVisible();
    expect(f.requests.some((request) => /^(PATCH|PUT|POST|DELETE) /.test(request))).toBe(false);
    expect(f.errors).toEqual([]);
  });

for (const mobile of [false, true])
  test(`invoice summary cards filter history and reset pagination (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    const f = await fixture(page, false);
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: mobile ? 844 : 1000 });
    const keys = ['sent', 'draft', 'failed', 'redeem', 'processing'] as const;
    const labels = [
      'Berhasil dikirim',
      'Draft',
      'Gagal / perlu diperiksa',
      'Full redeem',
      'Sedang dikirim',
    ];
    const summary: ImportSummary = { sent: 1, draft: 25, failed: 1, redeem: 1, processing: 1 };
    const entries: ImportHistoryEntry[] = keys.flatMap((key) =>
      Array.from({ length: summary[key] }, (_, index) => ({
        id: `history-${key}-${index}`,
        branchId: f.batch.branchId,
        version: 1,
        status: key === 'draft' ? 'PREVIEW' : 'SUBMITTED',
        createdAt: f.batch.createdAt,
        invoiceCount: 1,
        references: [`TEST-${key.toUpperCase()}-${index}`],
        counts: {
          sent: 0,
          draft: 0,
          failed: 0,
          redeem: 0,
          processing: 0,
          simulation: 0,
          local: 0,
          [key]: 1,
        },
      })),
    );
    const queries: URLSearchParams[] = [];
    await page.route('**/api/imports/overview?**', async (route) => {
      const query = new URL(route.request().url()).searchParams;
      queries.push(query);
      const filtered = entries.filter(
        (entry) =>
          !query.get('status') ||
          entry.counts[keys.find((key) => key === query.get('status'))!] > 0,
      );
      const start = (Number(query.get('page')) - 1) * 10;
      await route.fulfill({
        json: { items: filtered.slice(start, start + 10), total: filtered.length, summary },
      });
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    await page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
    await page.getByRole('textbox', { name: 'Cari riwayat', exact: true }).fill('TEST');
    await selectOption(
      page.getByRole('combobox', { name: 'Perusahaan', exact: true }),
      f.batch.branchId,
    );
    const cards = page.getByLabel('Ringkasan status invoice', { exact: true });
    const status = page.getByRole('combobox', { name: 'Status invoice', exact: true });
    const pagination = page.getByRole('navigation', { name: 'Halaman riwayat', exact: true });
    await cards.getByRole('button', { name: 'Filter Draft', exact: true }).click();
    await expect(status).toContainText('Draft');
    await expect(
      pagination.getByRole('button', { name: 'Halaman riwayat: berikutnya', exact: true }),
    ).toBeEnabled();
    await pagination
      .getByRole('button', { name: 'Halaman riwayat: berikutnya', exact: true })
      .click();
    await expect.poll(() => queries.at(-1)?.get('page')).toBe('2');
    for (const [index, key] of keys.entries()) {
      const card = cards.getByRole('button', { name: `Filter ${labels[index]}`, exact: true });
      if (!index) {
        await card.focus();
        await page.keyboard.press('Enter');
      } else await card.click();
      await expect(card).toHaveAttribute('aria-pressed', 'true');
      await expect(status).toContainText(labels[index]);
      await expect.poll(() => queries.at(-1)?.get('status')).toBe(key);
      expect(queries.at(-1)?.get('page')).toBe('1');
      expect(queries.at(-1)?.get('search')).toBe('TEST');
      expect(queries.at(-1)?.get('branch')).toBe(f.batch.branchId);
      await expect(page.locator('#invoice-upload-history tbody tr').first()).toContainText(
        `TEST-${key.toUpperCase()}`,
      );
      await expect(cards.locator('[aria-pressed="true"]')).toHaveCount(1);
    }
    await cards.getByRole('button', { name: 'Filter Sedang dikirim', exact: true }).click();
    await expect(status).toContainText('Semua status');
    await expect(cards.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect.poll(() => queries.at(-1)?.has('status')).toBe(false);
    await page.screenshot({
      path: `tmp/invoice-summary-filters-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(f.errors).toEqual([]);
  });

test('workflow checks completed stages, keeps failed delivery status, and provides clear PDF navigation', async ({
  page,
}) => {
  const f = await fixture(page, false);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let sourceReads = 0;
  await page.route('**/api/imports/review-batch/files/source-file', async (route) => {
    sourceReads++;
    await route.fulfill({ contentType: 'application/pdf', body: twoPagePdf() });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  await page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const steps = page.getByRole('list', { name: 'Tahapan upload invoice', exact: true });
  await expect(steps.locator('[data-state="complete"]')).toHaveCount(0);
  await expect(steps.getByRole('listitem').nth(0)).toHaveAttribute('aria-current', 'step');
  await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
  await page.getByRole('button', { name: 'Buka batch review-b', exact: true }).click();
  await expect(steps.locator('[data-state="complete"]')).toHaveCount(1);
  await expect(steps.getByRole('listitem').nth(1)).toHaveAttribute('aria-current', 'step');
  await expect(steps.locator('li:first-child > span > svg')).toHaveClass(/lucide-check/);
  await expect(steps.locator('li:first-child > span')).toHaveCSS(
    'background-color',
    'rgb(237, 248, 242)',
  );
  await expect(
    page.getByText('Upload, periksa, lalu submit invoice Anda.', { exact: true }),
  ).toHaveCount(0);
  const heading = page.locator('.page-heading');
  const upload = heading.getByRole('button', { name: 'Upload batch baru', exact: true });
  await expect(upload).toBeVisible();
  const headingBounds = (await heading.boundingBox())!;
  const uploadBounds = (await upload.boundingBox())!;
  expect(uploadBounds.x).toBeGreaterThan(headingBounds.x + headingBounds.width / 2);
  expect(uploadBounds.y).toBeLessThan(headingBounds.y + headingBounds.height);
  f.batch.status = 'SUBMITTED';
  f.batch.rows[0].status = 'QUEUED';
  f.batch.rows[0].invoiceId = 'created-invoice';
  f.batch.rows[0].syncStatus = 'PENDING';
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await expect(steps.locator('[data-state="complete"]')).toHaveCount(2);
  await expect(steps.getByRole('listitem').nth(2)).toHaveAttribute('aria-current', 'step');
  for (const result of ['SYNCED', 'FAILED', 'NEEDS_REVIEW']) {
    f.batch.rows[0].syncStatus = result;
    await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
    await expect(steps.locator('[data-state="complete"]')).toHaveCount(3);
    await expect(steps.locator('li > span > svg.lucide-check')).toHaveCount(3);
    await expect(steps.locator('[aria-current]')).toHaveCount(0);
  }
  await page.screenshot({ path: 'tmp/invoice-workflow-complete.png' });
  f.batch.status = 'PREVIEW';
  f.batch.rows[0].status = 'VALID';
  f.batch.rows[0].syncStatus = null;
  f.batch.rows[0].invoiceId = null;
  await page.getByRole('button', { name: 'Refresh preview', exact: true }).click();
  await page.getByRole('button', { name: 'Periksa INV-UI-001', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const previous = dialog.getByRole('button', { name: 'Halaman PDF sebelumnya', exact: true });
  const next = dialog.getByRole('button', { name: 'Halaman PDF berikutnya', exact: true });
  await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
    'data-rendered',
    'true',
  );
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(next.locator('svg')).toHaveCSS('width', '20px');
  await expect(previous.locator('svg')).toHaveCSS('width', '20px');
  await expect(dialog.getByText('Zoom', { exact: true })).toHaveCount(0);
  const zoom = dialog.getByRole('combobox', { name: 'Zoom PDF sumber', exact: true });
  const zoomBounds = (await zoom.boundingBox())!;
  const nextBounds = (await next.boundingBox())!;
  expect(zoomBounds.width).toBeLessThan(120);
  expect(Math.abs(zoomBounds.y - nextBounds.y)).toBeLessThan(8);
  await next.click();
  await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 2' })).toHaveAttribute(
    'data-rendered',
    'true',
  );
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(dialog.getByRole('img', { name: 'PDF sumber halaman 1' })).toHaveAttribute(
    'data-rendered',
    'true',
  );
  await selectOption(dialog.getByRole('combobox', { name: 'Zoom PDF sumber', exact: true }), '125');
  expect(sourceReads).toBe(1);
  await page.screenshot({ path: 'tmp/invoice-pdf-controls.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await zoom.scrollIntoViewIfNeeded();
  const mobileZoom = (await zoom.boundingBox())!;
  const mobileNext = (await next.boundingBox())!;
  expect(mobileZoom.width).toBeLessThan(120);
  expect(Math.abs(mobileZoom.y - mobileNext.y)).toBeLessThan(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/invoice-pdf-controls-mobile.png' });
  expect(f.errors).toEqual([]);
});

for (const mobile of [false, true])
  test(`nominal discounts convert for display without changing exact rupiah input (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    const f = await fixture(page, false, { mode: 'simulation', mapped: true });
    f.state.failAdd = false;
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: 1000 });
    await openReview(page, mobile);
    await page.getByRole('button', { name: 'Tambah item', exact: true }).click();
    const form = page.getByRole('form', { name: 'Form tambah item', exact: true });
    await form
      .getByRole('textbox', { name: 'Nama item baru', exact: true })
      .fill('Nominal source treatment');
    await form
      .getByRole('spinbutton', { name: 'Harga unit item baru', exact: true })
      .fill('1801802');
    await selectOption(
      page.getByRole('combobox', { name: 'Jenis diskon item baru', exact: true }),
      { label: 'Nominal (Rp)' },
    );
    await form
      .getByRole('spinbutton', { name: 'Diskon nominal item baru', exact: true })
      .fill('1622523');
    await form.getByRole('spinbutton', { name: 'Pajak persen item baru', exact: true }).fill('11');
    await form
      .getByRole('textbox', { name: 'Alasan penambahan item', exact: true })
      .fill('Treatment and nominal discount verified against the source');
    await expect(form).toContainText(/Rp\s*179\.279/);
    await expect(form).toContainText(/Rp\s*199\.000/);
    await selectOption(
      page.getByRole('combobox', { name: 'Jenis diskon item baru', exact: true }),
      { label: 'Persentase (%)' },
    );
    await expect(
      form.getByRole('spinbutton', { name: 'Diskon persen item baru', exact: true }),
    ).toHaveValue('90.050017');
    await expect(form).toContainText(/Rp\s*199\.000/);
    await selectOption(
      page.getByRole('combobox', { name: 'Jenis diskon item baru', exact: true }),
      { label: 'Nominal (Rp)' },
    );
    await expect(
      form.getByRole('spinbutton', { name: 'Diskon nominal item baru', exact: true }),
    ).toHaveValue('1622523');
    await form.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'tmp/nominal-discount-' + (mobile ? 'mobile' : 'desktop') + '.png',
    });
    await form.getByRole('button', { name: 'Simpan item baru', exact: true }).click();
    await expect.poll(() => f.additions.length).toBe(1);
    expect(f.additions[0].discountAmount).toBe(1622523);
    expect(f.additions[0].discountPercent).toBeUndefined();
    expect(f.errors).toEqual([]);
  });

test('an exact nominal discount can be edited without submitting its derived percentage', async ({
  page,
}) => {
  const f = await fixture(page, false, { mapped: true });
  const item = f.batch.rows[0].candidate.items[0];
  Object.assign(item, { unitPrice: 1801802, discount: 1622523, tax: 19721 });
  const corrections: Record<string, unknown>[] = [];
  await page.route('**/api/imports/review-batch/rows/review-row/items/service-1', async (route) => {
    const input: Record<string, unknown> = route.request().postDataJSON();
    corrections.push(input);
    f.batch.version++;
    item.discount = Number(input.discountAmount);
    return route.fulfill({ json: f.batch });
  });
  await openReview(page);
  await page.getByRole('button', { name: 'Edit item Layanan Uji', exact: true }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'Diskon nominal item', exact: true }),
  ).toHaveValue('1622523');
  await selectOption(page.getByRole('combobox', { name: 'Jenis diskon item', exact: true }), {
    label: 'Persentase (%)',
  });
  await selectOption(page.getByRole('combobox', { name: 'Jenis diskon item', exact: true }), {
    label: 'Nominal (Rp)',
  });
  await page.getByRole('spinbutton', { name: 'Diskon nominal item', exact: true }).fill('1622522');
  await page
    .getByRole('textbox', { name: 'Alasan koreksi item', exact: true })
    .fill('Nominal checked against original receipt');
  await page.getByRole('button', { name: 'Simpan perubahan item', exact: true }).click();
  await expect.poll(() => corrections.length).toBe(1);
  expect(corrections[0].discountAmount).toBe(1622522);
  expect(corrections[0].discountPercent).toBeUndefined();
  expect(f.errors).toEqual([]);
});

test('a package extraction note requires a reason and stays visible after its review is saved', async ({
  page,
}) => {
  const f = await fixture(page, false, { mapped: true });
  const row = f.batch.rows[0];
  const parserError =
    'Rincian tabel Benefit belum terbaca lengkap. Lengkapi semua layanan sesuai dokumen sumber.';
  row.errors = [parserError];
  row.status = 'REVIEW';
  row.exceptionReview = { errors: [parserError], allowed: true, blockers: [], accepted: false };
  const acknowledgements: Record<string, unknown>[] = [];
  await page.route('**/api/imports/review-batch/rows/review-row/reviewed', async (route) => {
    const input: Record<string, unknown> = route.request().postDataJSON();
    acknowledgements.push(input);
    row.candidate.accountingReviewedAt = '2026-11-24T05:00:00Z';
    row.candidate.reviewException = {
      reason: String(input.exceptionReason),
      actorId: 'review-admin',
      reviewedAt: '2026-11-24T05:00:00Z',
      fingerprint: 'snapshot',
      errors: [parserError],
    };
    row.exceptionReview!.accepted = true;
    row.errors = [];
    f.batch.version++;
    return route.fulfill({ json: f.batch });
  });
  await openReview(page);
  const panel = page.getByRole('alert', {
    name: 'Pemeriksaan invoice dengan catatan',
    exact: true,
  });
  await panel
    .getByRole('checkbox', { name: 'Simpan pemeriksaan dengan catatan', exact: true })
    .check();
  const save = page.getByRole('button', { name: 'Simpan pemeriksaan dengan catatan', exact: true });
  await expect(save).toBeDisabled();
  const reason =
    'All treatments manually checked and reconciled against the original Benefit table';
  await panel
    .getByRole('textbox', { name: 'Alasan melanjutkan dengan catatan', exact: true })
    .fill(reason);
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(acknowledgements[0].exceptionReason).toBe(reason);
  await expect(
    page.getByRole('button', { name: 'Submit dengan catatan', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Periksa INV-UI-001', exact: true }).click();
  await expect(panel).toContainText(reason);
  await expect(panel).toContainText('Pemeriksaan dengan catatan tersimpan');
  expect(f.errors).toEqual([]);
});

test('financial blockers disable review with a note and re-reading requires explicit confirmation', async ({
  page,
}) => {
  const f = await fixture(page, false, { mapped: true });
  const row = f.batch.rows[0];
  const error =
    'Rincian tabel Benefit belum terbaca lengkap. Lengkapi semua layanan sesuai dokumen sumber.';
  row.errors = [error, 'Jumlah item setelah diskon tidak sama dengan subtotal.'];
  row.status = 'REVIEW';
  row.exceptionReview = {
    errors: [error],
    allowed: false,
    blockers: ['Jumlah item setelah diskon tidak sama dengan subtotal.'],
    accepted: false,
  };
  const resets: Record<string, unknown>[] = [];
  await page.route('**/api/imports/review-batch/files/source-file/reparse', async (route) => {
    resets.push(route.request().postDataJSON());
    row.errors = [];
    row.exceptionReview = undefined;
    f.batch.version++;
    return route.fulfill({ json: f.batch });
  });
  await openReview(page);
  const panel = page.getByRole('alert', {
    name: 'Pemeriksaan invoice dengan catatan',
    exact: true,
  });
  await expect(
    panel.getByRole('checkbox', { name: 'Simpan pemeriksaan dengan catatan', exact: true }),
  ).toBeDisabled();
  page.once('dialog', (dialog) => dialog.dismiss());
  await panel.getByRole('button', { name: 'Baca ulang detail Benefit', exact: true }).click();
  expect(resets).toEqual([]);
  page.once('dialog', (dialog) => dialog.accept());
  await panel.getByRole('button', { name: 'Baca ulang detail Benefit', exact: true }).click();
  await expect.poll(() => resets.length).toBe(1);
  expect(resets[0]).toEqual({ version: 1, resetReview: true });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(f.errors).toEqual([]);
});
