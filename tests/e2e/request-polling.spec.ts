import { expect, test, type Page } from '@playwright/test';
import { selectOption } from '../helpers/select-option';
import type { Batch } from '../../src/features/easyrecap/imports/types';
import type { Invoice } from '../../src/features/easyrecap/invoices/types';

type Screen = 'dashboard' | 'imports' | 'receipts';
const paths = { dashboard: '/dashboard', imports: '/imports/overview', receipts: '/receipts' };
const names = {
  dashboard: 'Dashboard',
  imports: 'Faktur Penjualan (Invoices)',
  receipts: 'Penerimaan Penjualan (Receipt)',
};

async function fixture(
  page: Page,
  initial: { processing?: number; stopAfter?: number; showInvoice?: boolean } = {},
) {
  const counts = new Map<string, number>();
  const state = {
    processing: 0,
    failure: '',
    failStatus: 403,
    stopAfter: Number.POSITIVE_INFINITY,
    hold: null as Promise<void> | null,
    showInvoice: false,
    showBatch: false,
    invoiceStatus: 'PROCESSING',
    batchStatus: 'SYNCED',
    ...initial,
  };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const actor = {
    id: 'poll-admin',
    name: 'Admin Uji',
    email: 'poll@example.test',
    role: 'super_admin',
    active: true,
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const count = (counts.get(path) ?? 0) + 1;
    counts.set(path, count);
    if (path === state.failure)
      return route.fulfill({
        status: state.failStatus,
        contentType: 'text/html',
        body: '<h1>Forbidden</h1>',
      });
    if (Object.values(paths).includes(path) && count > 1 && state.hold) await state.hold;
    const processing = count >= state.stopAfter ? 0 : state.processing;
    const invoice: Invoice = {
      id: 'invoice-poll',
      number: 'INV-POLL',
      sourceId: 'source-poll',
      customer: 'Customer Uji',
      branchId: 'company',
      date: '2026-11-19T00:00:00Z',
      dueDate: null,
      businessStatus: 'CLOSED',
      paymentStatus: 'PAID',
      syncStatus: state.invoiceStatus,
      total: 100000,
      outstanding: 0,
      tax: 0,
      discount: 0,
      error: null,
      exception: null,
      updatedAt: '2026-11-19T00:00:00Z',
      items: [],
      payments: [],
    };
    if (path === '/invoices/invoice-poll')
      return route.fulfill({ json: { ...invoice, history: [], targets: [] } });
    if (path === '/imports/batch-poll') {
      const batch: Batch = {
        id: 'batch-poll',
        branchId: 'company',
        status: 'SUBMITTED',
        mode: 'live',
        version: 1,
        createdAt: invoice.updatedAt,
        submittedAt: invoice.updatedAt,
        files: [],
        rows: [
          {
            id: 'row-poll',
            fileId: 'file-poll',
            invoiceId: invoice.id,
            status: 'IMPORTED',
            errors: [],
            syncStatus: state.batchStatus,
            delivery: {
              status: state.batchStatus === 'SYNCED' ? 'SUCCEEDED' : 'PENDING',
              targetId: '123',
              targetNumber: invoice.number,
            },
            candidate: {
              sourceId: invoice.sourceId,
              number: invoice.number,
              customer: invoice.customer,
              customerId: 'CUSTOMER',
              date: invoice.date,
              businessStatus: 'CLOSED',
              currency: 'IDR',
              subtotal: invoice.total,
              discount: 0,
              tax: 0,
              total: invoice.total,
              totalPaid: invoice.total,
              outstanding: 0,
              packageName: null,
              sourceFormat: 'PDF',
              warnings: [],
              items: [],
              payments: [],
              benefits: [],
            },
          },
        ],
      };
      return route.fulfill({ json: batch });
    }
    let body: unknown = [];
    if (path === '/auth/get-session')
      body = {
        session: { id: 'poll-session', userId: actor.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: actor,
      };
    if (path === '/me') body = actor;
    if (path === '/branches')
      body = [
        {
          id: 'company',
          name: 'PT. MMI',
          centerId: 'center',
          accurateDatabaseId: '99',
          accurateBranchId: '300',
          active: true,
        },
      ];
    if (path === '/invoices') body = { rows: [], total: 0, page: 1, pageSize: 5 };
    if (path === '/dashboard')
      body = {
        summary: {
          total: 8,
          synced: 0,
          processing,
          failed: 0,
          pending: 8,
          closed: 0,
          open: 8,
          outstanding: 0,
        },
        rate: 0,
        trend: [],
        recent: state.showInvoice ? [invoice] : [],
        errors: [],
      };
    if (path === '/imports/overview')
      body = {
        items: state.showBatch
          ? [
              {
                id: 'batch-poll',
                branchId: 'company',
                status: 'SUBMITTED',
                version: 1,
                createdAt: invoice.updatedAt,
                invoiceCount: 1,
                references: [invoice.number],
                counts: {
                  sent: 1,
                  draft: 0,
                  failed: 0,
                  redeem: 0,
                  processing: 0,
                  simulation: 0,
                  local: 0,
                },
              },
            ]
          : [],
        total: 0,
        summary: { sent: 0, draft: 0, failed: 0, redeem: 0, processing },
      };
    if (path === '/receipts')
      body = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 25,
        summary: { review: 0, draft: 0, processing, succeeded: 0, attention: 0 },
      };
    if (path === '/accurate/status')
      body = {
        mode: 'live',
        enabled: true,
        configured: true,
        taxPolicy: 'gross-no-tax',
        destinations: [],
      };
    await route.fulfill({ json: body });
  });
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  const count = (screen: Screen) => counts.get(paths[screen]) ?? 0;
  async function open(screen: Screen) {
    if (screen !== 'dashboard')
      await page.getByRole('link', { name: names[screen], exact: true }).click();
    await expect.poll(() => count(screen)).toBe(1);
    if (screen === 'dashboard') {
      await expect(page.getByLabel('Filter periode')).toBeEnabled();
      await expect(page.getByRole('button', { name: /Muat ulang/ })).toHaveCount(0);
      await expect(page.locator('.dashboard-toolbar .filter-meta')).toHaveCount(0);
    } else {
      await expect(
        page.getByRole('button', { name: 'Muat ulang', exact: true }).first(),
      ).toBeEnabled();
    }
  }
  return { state, counts, count, open, errors };
}

for (const screen of ['dashboard', 'imports', 'receipts'] as const) {
  test(`${screen}: idle pages make no periodic requests and user actions fetch fresh data`, async ({
    page,
  }) => {
    const f = await fixture(page);
    await f.open(screen);
    await page.clock.fastForward(120_000);
    expect(f.count(screen)).toBe(1);
    expect(f.counts.get('/invoices')).toBe(1);
    if (screen === 'dashboard') {
      await selectOption(page.getByLabel('Filter periode'), '90');
    } else {
      await page.getByRole('button', { name: 'Muat ulang', exact: true }).first().click();
    }
    await expect.poll(() => f.count(screen)).toBe(2);
    await page.clock.fastForward(120_000);
    expect(f.count(screen)).toBe(2);
    expect(f.errors).toEqual([]);
  });

  test(`${screen}: active processing is polled once then stops on completion`, async ({ page }) => {
    const f = await fixture(page, { processing: 1, stopAfter: 2 });
    await f.open(screen);
    const before = f.count(screen);
    await page.clock.runFor(14_000);
    expect(f.count(screen)).toBe(before);
    await page.clock.runFor(2_000);
    await expect.poll(() => f.count(screen)).toBe(before + 1);
    await page.clock.fastForward(120_000);
    expect(f.count(screen)).toBe(before + 1);
    expect(f.errors).toEqual([]);
  });

  test(`${screen}: an HTML 403 stops automatic requests until manual retry`, async ({ page }) => {
    const f = await fixture(page, { processing: 1 });
    await f.open(screen);
    f.state.failure = paths[screen];
    if (screen === 'dashboard') {
      await page.clock.runFor(16_000);
    } else {
      await page.getByRole('button', { name: 'Muat ulang', exact: true }).first().click();
    }
    await expect(
      page.getByText('Akses ditolak. Periksa hak akses akun Anda.', { exact: true }),
    ).toBeVisible();
    const failedCount = f.count(screen);
    await page.clock.fastForward(300_000);
    expect(f.count(screen)).toBe(failedCount);
    f.state.failure = '';
    f.state.processing = 0;
    await page
      .getByRole('button', { name: screen === 'imports' ? 'Muat ulang' : 'Coba lagi', exact: true })
      .first()
      .click();
    await expect.poll(() => f.count(screen)).toBe(failedCount + 1);
    await expect(
      page.getByText('Akses ditolak. Periksa hak akses akun Anda.', { exact: true }),
    ).toHaveCount(0);
    expect(f.errors).toEqual([]);
  });
}

test('overview requests are serial, pause in hidden tabs, and stop when navigation changes', async ({
  page,
}) => {
  const f = await fixture(page);
  f.state.processing = 1;
  await f.open('imports');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(120_000);
  expect(f.count('imports')).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  let release = () => {};
  f.state.hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.clock.runFor(16_000);
  await expect.poll(() => f.count('imports')).toBe(2);
  await page.clock.fastForward(120_000);
  expect(f.count('imports')).toBe(2);
  f.state.processing = 0;
  release();
  await expect(page.getByRole('button', { name: 'Muat ulang', exact: true })).toBeEnabled();
  await page.getByRole('link', { name: names.receipts, exact: true }).click();
  await expect.poll(() => f.count('receipts')).toBe(1);
  await page.clock.fastForward(120_000);
  expect(f.count('imports')).toBe(2);
  expect(f.count('receipts')).toBe(1);
  expect(f.errors).toEqual([]);
});

test('filter changes fetch fresh data without restarting an idle polling loop', async ({
  page,
}) => {
  const f = await fixture(page);
  await f.open('dashboard');
  await selectOption(page.getByLabel('Filter periode'), '90');
  await expect.poll(() => f.count('dashboard')).toBe(2);
  await page.clock.fastForward(120_000);
  expect(f.count('dashboard')).toBe(2);
  await page.getByRole('link', { name: names.imports, exact: true }).click();
  await expect.poll(() => f.count('imports')).toBe(1);
  await page.getByLabel('Cari riwayat', { exact: true }).fill('INV-SEARCH');
  await expect.poll(() => f.count('imports')).toBe(2);
  await page.clock.fastForward(120_000);
  expect(f.count('imports')).toBe(2);
  expect(f.errors).toEqual([]);
});

test('a completed SUBMITTED invoice batch no longer polls its detail', async ({ page }) => {
  const f = await fixture(page);
  f.state.showBatch = true;
  await f.open('imports');
  await page.getByRole('button', { name: 'Buka batch batch-po' }).click();
  await expect(page.getByRole('button', { name: 'Kembali ke riwayat', exact: true })).toBeVisible();
  await expect.poll(() => f.counts.get('/imports/batch-poll')).toBe(1);
  await page.clock.fastForward(120_000);
  expect(f.counts.get('/imports/batch-poll')).toBe(1);
  expect(f.errors).toEqual([]);
});

test('an active invoice batch stops polling when its rows finish despite SUBMITTED status', async ({
  page,
}) => {
  const f = await fixture(page);
  f.state.showBatch = true;
  f.state.batchStatus = 'PROCESSING';
  await f.open('imports');
  await page.getByRole('button', { name: 'Buka batch batch-po' }).click();
  await expect(page.getByRole('button', { name: 'Kembali ke riwayat', exact: true })).toBeVisible();
  await expect.poll(() => f.counts.get('/imports/batch-poll')).toBe(1);
  f.state.batchStatus = 'SYNCED';
  await page.clock.runFor(16_000);
  await expect.poll(() => f.counts.get('/imports/batch-poll')).toBe(2);
  await page.clock.fastForward(120_000);
  expect(f.counts.get('/imports/batch-poll')).toBe(2);
  expect(f.errors).toEqual([]);
});

test('invoice detail polling stops on completion and suspends dashboard background reads', async ({
  page,
}) => {
  const f = await fixture(page, { processing: 1, showInvoice: true });
  await f.open('dashboard');
  await page.getByRole('button', { name: 'INV-POLL', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => f.counts.get('/invoices/invoice-poll')).toBe(1);
  await page.clock.runFor(1000);
  const dashboardReads = f.count('dashboard');
  f.state.invoiceStatus = 'SYNCED';
  await page.clock.runFor(15_000);
  await expect.poll(() => f.counts.get('/invoices/invoice-poll')).toBe(2);
  await page.clock.fastForward(120_000);
  expect(f.counts.get('/invoices/invoice-poll')).toBe(2);
  expect(f.count('dashboard')).toBe(dashboardReads);
  expect(f.errors).toEqual([]);
});

test('a server error during active polling stops automatic retries', async ({ page }) => {
  const f = await fixture(page);
  f.state.processing = 1;
  await f.open('imports');
  f.state.failure = paths.imports;
  f.state.failStatus = 500;
  await page.clock.runFor(16_000);
  await expect(page.getByText(/Backend mengalami kesalahan \(HTTP 500\)/)).toBeVisible();
  const reads = f.count('imports');
  await page.clock.fastForward(300_000);
  expect(f.count('imports')).toBe(reads);
  expect(f.errors).toEqual([]);
});

test('an expired session stops polling and returns to login without repeated API calls', async ({
  page,
}) => {
  const f = await fixture(page);
  f.state.processing = 1;
  await f.open('imports');
  f.state.failure = paths.imports;
  f.state.failStatus = 401;
  await page.clock.runFor(16_000);
  await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeVisible();
  const reads = f.count('imports');
  await page.clock.fastForward(120_000);
  expect(f.count('imports')).toBe(reads);
  expect(f.errors).toEqual([]);
});
