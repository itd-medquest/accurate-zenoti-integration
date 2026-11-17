import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectOption } from '../helpers/select-option';
import type { ReceiptConfiguration, ReceiptDraft } from '../../src/features/receipts/types';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const branch = '00000000-0000-4000-8000-000000000001';
const draftId = '00000000-0000-4000-8000-000000000002';
const mappingId = '00000000-0000-4000-8000-000000000003';
const actor = {
  id: 'UI-ADMIN',
  name: 'Finance Uji',
  email: 'ui@example.test',
  role: 'super_admin',
  active: true,
};

async function mockApi(
  page: Page,
  blocked = false,
  outcome: 'success' | 'uncertain' | 'rejected' = 'success',
  options: {
    balanceUnavailable?: boolean;
    legacyNumber?: boolean;
    sourceMethod?: 'card' | 'bank';
  } = {},
) {
  let balanceUnavailable = options.balanceUnavailable ?? false;
  let current: ReceiptDraft = {
    id: draftId,
    invoiceId: '00000000-0000-4000-8000-000000000004',
    branchId: branch,
    databaseId: '99',
    number: options.legacyNumber ? 'INT-RC-LEGACY' : 'INV-EXAMPLE',
    mappingId: null,
    mappingVersion: null,
    bank: null,
    method: null,
    sourceMethod: 'qris',
    grossAmount: 200001,
    rateBps: 0,
    feeAmount: 0,
    netAmount: 0,
    paymentDate: '2026-11-01',
    paymentReference: '',
    notes: '',
    version: 1,
    status: 'DRAFT',
    targetId: null,
    targetNumber: null,
    bankAccountNo: null,
    bankAccountName: null,
    feeAccountNo: null,
    feeAccountName: null,
    error: null,
    completedAt: null,
    attemptedAt: null,
  };
  let prepared = false,
    saved = 0,
    remoteSubmits = 0,
    mappingAttempts = 0,
    queuedReads = 0,
    checks = 0,
    reopens = 0;
  const config: ReceiptConfiguration = {
    database: { id: '99', name: 'Perusahaan Uji' },
    banks: ['BCA', 'BNI'],
    methods: ['CREDIT_CARD', 'DEBIT_CARD', 'QRIS', 'BANK_TRANSFER'],
    mappings: [
      {
        id: mappingId,
        branchId: branch,
        databaseId: '99',
        bank: 'BCA',
        method: 'QRIS',
        accountId: '101',
        accountNo: '110101',
        accountName: 'Bank BCA contoh',
        feeAccountId: '201',
        feeAccountNo: '610001',
        feeAccountName: 'Beban administrasi',
        version: 1,
      },
    ],
    rates: { CREDIT_CARD: 200, DEBIT_CARD: 180, QRIS: 70, BANK_TRANSFER: 0 },
    rounding: 'ceil',
    destinations: [{ branchId: branch, databaseId: '99', targetBranchId: '300' }],
  };
  if (options.sourceMethod) {
    current.sourceMethod = options.sourceMethod;
    const template = config.mappings[0];
    config.mappings = (['BCA', 'BNI'] as const).flatMap((bank) =>
      (['CREDIT_CARD', 'DEBIT_CARD', 'QRIS', 'BANK_TRANSFER'] as const).map((method) => ({
        ...template,
        id: `${bank}-${method}`,
        bank,
        method,
      })),
    );
  }
  const observedFilters: string[] = [];
  if (blocked) {
    prepared = true;
    current = {
      ...current,
      mappingId,
      mappingVersion: 1,
      bank: 'BCA',
      method: 'QRIS',
      bankAccountNo: '110101',
      bankAccountName: 'Bank BCA contoh',
      feeAccountNo: '610001',
      feeAccountName: 'Beban administrasi',
      rateBps: 70,
      feeAmount: 1401,
      netAmount: 198600,
      paymentReference: 'REFERENCE-SAVED',
    };
    config.mappings[0] = {
      ...config.mappings[0],
      accountNo: '110999',
      accountName: 'Akun baru setelah perubahan',
      version: 2,
    };
  }
  await page.route(`${api}/api/**`, async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    const path = url.pathname.replace('/api', '');
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === '/auth/get-session')
      return json({
        session: { id: 'ui-session', userId: actor.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: actor,
      });
    if (path === '/me') return json(actor);
    if (path === '/branches')
      return json([
        {
          id: branch,
          name: 'Perusahaan Uji',
          centerId: 'TEST',
          accurateDatabaseId: '99',
          accurateBranchId: '300',
          active: true,
        },
      ]);
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
    if (path === '/invoices') return json({ rows: [], total: 0, page: 1, pageSize: 25 });
    if (path === '/imports/overview')
      return json({
        items: [],
        total: 0,
        summary: { sent: 0, draft: 0, failed: 0, redeem: 0, processing: 0 },
      });
    if (path === '/settings')
      return json({
        mode: 'live',
        targetStatus: 'SALES_INVOICE',
        queue: 'postgresql',
        timezone: 'Asia/Jakarta',
        accurate: {
          mode: 'live',
          taxPolicy: 'gross-no-tax',
          hasApiToken: true,
          hasSignatureSecret: true,
        },
        connections: [
          { id: 'accurate', enabled: true, hasSecret: true, updatedAt: '2026-11-01T00:00:00Z' },
        ],
      });
    if (path === '/accurate/status')
      return json({
        mode: 'live',
        enabled: true,
        configured: true,
        taxPolicy: 'gross-no-tax',
        destinations: [],
      });
    if (path === '/receipts/configuration') return json(config);
    if (path === '/receipts/accounts')
      return json({
        database: config.database,
        items:
          url.searchParams.get('kind') === 'bank'
            ? [{ id: '102', code: '110102', name: 'Bank BNI contoh', type: 'CASH_BANK' }]
            : [{ id: '201', code: '610001', name: 'Beban administrasi', type: 'EXPENSE' }],
      });
    if (path === '/receipts/mappings' && method === 'PUT') {
      mappingAttempts++;
      if (mappingAttempts === 1)
        return json({ error: 'Contoh penolakan: akun belum tersedia.' }, 422);
      const body = route.request().postDataJSON();
      const row = {
        ...body,
        id: '00000000-0000-4000-8000-000000000005',
        databaseId: '99',
        accountNo: '110102',
        accountName: 'Bank BNI contoh',
        feeAccountNo: '610001',
        feeAccountName: 'Beban administrasi',
        version: 1,
      };
      config.mappings.push(row);
      return json(row);
    }
    if (path === '/receipts/drafts' && method === 'POST') {
      prepared = true;
      return json(current);
    }
    if (path === '/receipts/' + draftId && method === 'GET') {
      if (current.status === 'QUEUED' && queuedReads++ >= 1)
        current = {
          ...current,
          status: outcome === 'success' ? 'SUCCEEDED' : 'NEEDS_REVIEW',
          version: current.version + 1,
          attemptedAt: '2026-11-17T02:00:00Z',
          error: outcome === 'success' ? null : 'Hasil penerimaan perlu diperiksa.',
          targetId: outcome === 'success' ? '901' : null,
          targetNumber: outcome === 'success' ? current.number : null,
        };
      return json({
        draft: current,
        invoice: { number: 'INV-EXAMPLE', customer: 'Customer Uji', total: 200001 },
        source: {
          method: current.sourceMethod,
          paidAt: '2026-11-01T00:00:00+07:00',
          gross: 200001,
          grouped: true,
          payments: Array.from({ length: 8 }, (_, index) => ({
            id: `SOURCE-ITEM-${index + 1}:collection`,
            amount: index ? 25000 : 25001,
            method: current.sourceMethod,
            paidAt: '2026-11-01T00:00:00+07:00',
          })),
        },
        configuration: config,
        validation: {
          editable: !blocked,
          message: blocked ? 'Pembayaran sumber berubah. Data tersimpan tetap tersedia.' : null,
        },
        delivery: {
          enabled: !blocked && !balanceUnavailable && current.status === 'DRAFT',
          message: blocked
            ? 'Pembayaran sumber berubah.'
            : balanceUnavailable
              ? 'Identitas atau saldo piutang Accurate belum lengkap/konsisten.'
              : '',
        },
        balance:
          !blocked && !balanceUnavailable && current.status === 'DRAFT'
            ? { outstanding: 200001, checkedAt: '2026-11-17T02:00:00Z' }
            : null,
        actions: {
          canCheck: current.status === 'NEEDS_REVIEW',
          canReopen: current.status === 'NEEDS_REVIEW' && outcome === 'rejected',
        },
      });
    }
    if (path === '/receipts/' + draftId && method === 'PUT') {
      const body = route.request().postDataJSON();
      saved++;
      expect(body.mappingVersion).toBe(1);
      current = {
        ...current,
        ...body,
        number: 'INV-EXAMPLE',
        version: current.version + 1,
        bank: 'BCA',
        method: 'QRIS',
        bankAccountNo: '110101',
        bankAccountName: 'Bank BCA contoh',
        feeAccountNo: '610001',
        feeAccountName: 'Beban administrasi',
        rateBps: 70,
        feeAmount: 1401,
        netAmount: 198600,
      };
      return json(current);
    }
    if (/\/submit$/.test(path)) {
      remoteSubmits++;
      expect(route.request().postDataJSON().confirmed).toBe(true);
      current = { ...current, status: 'QUEUED', version: current.version + 1 };
      return json(current);
    }
    if (/\/check$/.test(path)) {
      checks++;
      current = {
        ...current,
        status: 'SUCCEEDED',
        error: null,
        targetId: '901',
        targetNumber: current.number,
        version: current.version + 1,
      };
      return json(current);
    }
    if (/\/reopen$/.test(path)) {
      reopens++;
      current = {
        ...current,
        status: 'DRAFT',
        error: null,
        attemptedAt: null,
        version: current.version + 1,
      };
      return json(current);
    }
    if (path === '/receipts') {
      observedFilters.push(url.search);
      return json({
        items: [
          {
            invoiceId: current.invoiceId,
            invoiceNumber: 'INV-EXAMPLE',
            customer: 'Customer Uji',
            branchId: branch,
            branchName: 'Perusahaan Uji',
            sourceKey: 'a'.repeat(64),
            sourceMethod: current.sourceMethod,
            paidAt: '2026-11-01T00:00:00+07:00',
            gross: 200001,
            grouped: true,
            paymentCount: 8,
            status: prepared ? current.status : 'TO_REVIEW',
            draft: prepared ? current : null,
            error: null,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
        summary: {
          review: prepared ? 0 : 1,
          draft: prepared ? 1 : 0,
          processing: 0,
          succeeded: 0,
          attention: 0,
        },
      });
    }
    return json({}, 404);
  });
  return {
    state: () => ({ saved, remoteSubmits, mappingAttempts, observedFilters, checks, reopens }),
    restoreBalance: () => {
      balanceUnavailable = false;
    },
  };
}

for (const mobile of [false, true])
  test(`receipt review uses saved mappings, ceils fees and preserves filters ${mobile ? 'mobile' : 'dark desktop'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const fixture = await mockApi(page);
    await page.setViewportSize({ width: mobile ? 390 : 1500, height: mobile ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    if (!mobile)
      await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
    await expect(page.getByRole('table', { name: 'Riwayat penerimaan penjualan' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.screenshot({
      path: `../../docs/screenshots/receipt-history-${mobile ? 'mobile' : 'dark'}.png`,
      fullPage: true,
    });
    await page.getByLabel('Cari penerimaan').fill('Customer');
    await expect
      .poll(() =>
        fixture.state().observedFilters.some((query) => query.includes('search=Customer')),
      )
      .toBe(true);
    await page.getByLabel('Periode pembayaran', { exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Periode pembayaran');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(page.getByText('Review penerimaan', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Lihat Semua', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sembunyikan', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sembunyikan', exact: true }).click();
    await selectOption(page.getByLabel('Bank dan metode pembayaran', { exact: true }), mappingId);
    await page.getByLabel('Referensi pembayaran', { exact: true }).fill('SOURCE-RECEIPT-EXAMPLE');
    await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
    await expect.poll(() => fixture.state().saved).toBe(1);
    await expect(page.getByText('Rp 1.401', { exact: true })).toBeVisible();
    await expect(page.getByText('Rp 198.600', { exact: true })).toBeVisible();
    await page.getByLabel(/Saya telah memeriksa sumber/).check();
    await expect(
      page.getByRole('button', { name: 'Kirim ke Accurate', exact: true }),
    ).toBeEnabled();
    await page.getByRole('button', { name: 'Kirim ke Accurate', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Rp 200.001');
    await expect(page.getByRole('alertdialog')).toContainText('Rp 1.401');
    await expect(page.getByRole('alertdialog')).toContainText('Rp 198.600');
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    expect(fixture.state().remoteSubmits).toBe(0);
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.locator('main.workspace-content').evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: `../../docs/screenshots/receipt-review-${mobile ? 'mobile' : 'dark'}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByLabel('Catatan Finance', { exact: true }).fill('Catatan belum disimpan');
    await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Ada perubahan yang belum disimpan');
    await page.getByRole('button', { name: 'Lanjutkan review', exact: true }).click();
    await expect(page.getByLabel('Catatan Finance', { exact: true })).toHaveValue(
      'Catatan belum disimpan',
    );
    await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
    await page.getByRole('button', { name: 'Lanjutkan tanpa menyimpan', exact: true }).click();
    await expect(page.getByLabel('Cari penerimaan')).toHaveValue('Customer');
    expect(errors).toEqual([]);
  });

for (const outcome of ['success', 'uncertain', 'rejected'] as const)
  test(`receipt submission confirms exact amounts and handles ${outcome} without duplicate submits`, async ({
    page,
  }) => {
    const fixture = await mockApi(page, false, outcome);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    await expect(page.getByText('Sisa tagihan Accurate', { exact: true })).toBeVisible();
    await selectOption(page.getByLabel('Bank dan metode pembayaran', { exact: true }), mappingId);
    await page.getByLabel('Referensi pembayaran', { exact: true }).fill('REFERENCE-CONFIRMED');
    await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
    await expect(page.getByText('Draft tersimpan di intgrte.', { exact: true })).toBeVisible();
    await page.getByLabel(/Saya telah memeriksa sumber/).check();
    await page.getByRole('button', { name: 'Kirim ke Accurate', exact: true }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Kirim penerimaan ke Accurate?' });
    await expect(confirm).toContainText('Rp 198.600');
    await confirm.getByRole('button', { name: 'Ya, kirim penerimaan', exact: true }).click();
    await expect(
      page.getByText('Penerimaan sedang diproses. Status akan diperbarui otomatis.', {
        exact: true,
      }),
    ).toBeVisible();
    if (outcome === 'uncertain') {
      const check = page.getByRole('button', { name: 'Periksa hasil di Accurate', exact: true });
      await expect(check).toBeVisible({ timeout: 12000 });
      await expect(
        page.getByRole('button', { name: 'Kembalikan ke draft', exact: true }),
      ).toHaveCount(0);
      await check.click();
      await expect(
        page.getByText('Penerimaan terverifikasi di Accurate.', { exact: true }),
      ).toBeVisible();
      expect(fixture.state().checks).toBe(1);
    } else if (outcome === 'rejected') {
      await page
        .getByRole('button', { name: 'Kembalikan ke draft', exact: true })
        .click({ timeout: 12000 });
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Ya, kembalikan ke draft', exact: true })
        .click();
      await expect(page.getByLabel('Referensi pembayaran', { exact: true })).toBeEnabled();
      await expect(page.getByLabel('Referensi pembayaran', { exact: true })).toHaveValue(
        'REFERENCE-CONFIRMED',
      );
      expect(fixture.state().reopens).toBe(1);
    } else
      await expect(
        page.getByText('Penerimaan terverifikasi di Accurate.', { exact: true }),
      ).toBeVisible({ timeout: 12000 });
    expect(fixture.state().remoteSubmits).toBe(1);
    expect(errors).toEqual([]);
  });

test('a blocked draft displays its saved account and fee snapshot after mapping changes', async ({
  page,
}) => {
  await mockApi(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
  await page.getByRole('button', { name: 'Buka', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Pembayaran sumber berubah' }),
  ).toBeVisible();
  await expect(page.getByLabel('Bank dan metode pembayaran', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Referensi pembayaran', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Referensi pembayaran', { exact: true })).toHaveValue(
    'REFERENCE-SAVED',
  );
  await expect(page.getByText('110101 · Bank BCA contoh', { exact: true })).toBeVisible();
  await expect(page.getByText('Akun baru setelah perubahan', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Rp 1.401', { exact: true })).toBeVisible();
  await expect(page.getByText('Rp 198.600', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan draft', exact: true })).toHaveCount(0);
});

test('shared calendar preserves the existing invoice upload-period field and supports keyboard dismissal', async ({
  page,
}) => {
  await mockApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  const period = page.getByRole('button', { name: 'Periode upload', exact: true });
  await expect(period).toHaveText('Semua waktu');
  await period.click();
  await expect(page.getByRole('dialog')).toContainText('Periode upload');
  await expect(page.getByRole('button', { name: 'Terapkan', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(period).toBeFocused();
  await period.click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(period).toHaveText('Semua waktu');
});

test('a balance lookup error allows mapping and draft entry, but keeps delivery disabled until rechecked', async ({
  page,
}) => {
  const fixture = await mockApi(page, false, 'success', { balanceUnavailable: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Pengiriman menunggu' })).toBeVisible();
  await expect(page.getByLabel('Bank dan metode pembayaran', { exact: true })).toBeEnabled();
  await selectOption(page.getByLabel('Bank dan metode pembayaran', { exact: true }), mappingId);
  await page.getByLabel('Referensi pembayaran', { exact: true }).fill('REFERENCE-WAITING-BALANCE');
  await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
  await expect.poll(() => fixture.state().saved).toBe(1);
  await page.getByLabel(/Saya telah memeriksa sumber/).check();
  await expect(page.getByRole('button', { name: 'Kirim ke Accurate', exact: true })).toBeDisabled();
  expect(fixture.state().remoteSubmits).toBe(0);
  fixture.restoreBalance();
  await page.getByRole('button', { name: 'Periksa ulang saldo', exact: true }).click();
  await expect(page.getByText('Sisa tagihan Accurate', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Referensi pembayaran', { exact: true })).toHaveValue(
    'REFERENCE-WAITING-BALANCE',
  );
  await expect(page.getByRole('button', { name: 'Kirim ke Accurate', exact: true })).toBeEnabled();
});

test('No. Bukti uses the exact invoice number and a legacy draft must be saved before sending', async ({
  page,
}) => {
  const fixture = await mockApi(page, false, 'success', { legacyNumber: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  const number = page
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: 'No. Bukti Accurate' }) });
  await expect(number.locator('dd')).toHaveText('INV-EXAMPLE');
  await expect(page.getByLabel(/Saya telah memeriksa sumber/)).toBeDisabled();
  await selectOption(page.getByLabel('Bank dan metode pembayaran', { exact: true }), mappingId);
  await page.getByLabel('Referensi pembayaran', { exact: true }).fill('REFERENCE-EXACT-NUMBER');
  await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
  await expect.poll(() => fixture.state().saved).toBe(1);
  await expect(page.getByText('Draft tersimpan di intgrte.', { exact: true })).toBeVisible();
  await expect(number.locator('dd')).toHaveText('INV-EXAMPLE');
  expect(fixture.state().remoteSubmits).toBe(0);
});

for (const sourceMethod of ['card', 'bank'] as const)
  test(`saved BCA and BNI mappings remain selectable and match ${sourceMethod} source payments`, async ({
    page,
  }) => {
    await mockApi(page, false, 'success', { sourceMethod });
    await page.goto('/');
    await page.getByRole('button', { name: 'Penerimaan Penjualan (Receipt)', exact: true }).click();
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    const control = page.getByLabel('Bank dan metode pembayaran', { exact: true });
    await expect(control).toBeEnabled();
    await control.click();
    for (const bank of ['BCA', 'BNI']) {
      if (sourceMethod === 'card') {
        await expect(
          page.getByRole('option', { name: `${bank} · Kartu kredit (CC)`, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: `${bank} · Kartu debit`, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: `${bank} · Transfer rekening langsung`, exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByRole('option', { name: `${bank} · Transfer rekening langsung`, exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('option', { name: `${bank} · Kartu kredit (CC)`, exact: true }),
        ).toHaveCount(0);
      }
      await expect(page.getByRole('option', { name: `${bank} · QRIS`, exact: true })).toHaveCount(
        0,
      );
    }
    await page.keyboard.press('Escape');
  });

test('receipt mapping keeps an unsaved selection after failure and shows persisted account badges after success', async ({
  page,
}) => {
  const fixture = await mockApi(page);
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Akun penerimaan', exact: true }).click();
  await selectOption(page.getByLabel('Bank / penyedia', { exact: true }), 'BNI');
  await page.getByRole('textbox', { name: 'Akun kas/bank penerima', exact: true }).fill('110102');
  await page.getByRole('button', { name: 'Cari', exact: true }).first().click();
  await selectOption(
    page.getByRole('combobox', { name: 'Hasil pencarian akun kas/bank penerima', exact: true }),
    '102',
  );
  await page.getByRole('button', { name: 'Gunakan akun', exact: true }).click();
  await page.getByRole('textbox', { name: 'Akun biaya administrasi', exact: true }).fill('610001');
  await page.getByRole('button', { name: 'Cari', exact: true }).click();
  await selectOption(
    page.getByRole('combobox', { name: 'Hasil pencarian akun biaya administrasi', exact: true }),
    '201',
  );
  await page.getByRole('button', { name: 'Gunakan akun', exact: true }).click();
  await expect(page.getByText('Dipilih · belum disimpan', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Simpan mapping akun', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Contoh penolakan' })).toBeVisible();
  await expect(page.getByText('Dipilih · belum disimpan', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Simpan mapping akun', exact: true }).click();
  await expect(page.getByText('Tersimpan', { exact: true })).toHaveCount(2);
  expect(fixture.state().mappingAttempts).toBe(2);
  mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
  await page.locator('main.workspace-content').evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: '../../docs/screenshots/receipt-accounts-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Simpan mapping akun', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: '../../docs/screenshots/receipt-accounts-mobile.png',
    fullPage: true,
  });
});
