import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { greetingAt } from '../../src/features/dashboard/utils/greeting';
import type { Invoice } from '../../src/features/invoices/types';
import { selectOption } from '../helpers/select-option';

test.use({ timezoneId: 'America/Los_Angeles' });

const actor = {
  id: 'ui-test-user',
  name: 'Kautsar',
  email: 'ui@example.test',
  role: 'super_admin',
  active: true,
};
const invoice: Invoice = {
  id: 'ui-test-invoice',
  number: 'INV-UI-001',
  sourceId: 'source-ui',
  customer: 'Customer Uji',
  branchId: 'company',
  date: '2026-11-13T00:00:00Z',
  dueDate: null,
  businessStatus: 'CLOSED',
  paymentStatus: 'PAID',
  syncStatus: 'FAILED',
  total: 199000,
  outstanding: 0,
  tax: 0,
  discount: 0,
  error: 'Kode item belum sesuai.',
  exception: null,
  updatedAt: '2026-11-13T03:00:00Z',
  items: [],
  payments: [],
};

async function mockWorkspace(page: Page, role = 'super_admin') {
  const requests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    requests.push(path);
    let body: unknown;
    switch (path) {
      case '/auth/get-session':
        body = {
          session: { id: 'ui-session', userId: actor.id, expiresAt: '2030-01-01T00:00:00Z' },
          user: actor,
        };
        break;
      case '/me':
        body = { ...actor, role };
        break;
      case '/branches':
        body = [
          {
            id: 'company',
            name: 'PT. MMI',
            centerId: 'ZENOTI',
            accurateDatabaseId: '999',
            accurateBranchId: '300',
            active: true,
          },
        ];
        break;
      case '/settings':
        body = {
          mode: 'live',
          targetStatus: 'DRAFT',
          queue: 'postgres',
          timezone: 'Asia/Jakarta',
          accurate: {
            mode: 'live',
            taxPolicy: 'gross-no-tax',
            hasApiToken: true,
            hasSignatureSecret: true,
          },
          connections: [
            { id: 'accurate', enabled: true, hasSecret: true, updatedAt: invoice.updatedAt },
          ],
        };
        break;
      case '/accurate/status':
        body = {
          mode: 'live',
          enabled: true,
          configured: true,
          taxPolicy: 'gross-no-tax',
          destinations: [],
        };
        break;
      case '/dashboard':
        body = {
          integrationMode: 'live',
          summary: {
            total: 1,
            synced: 0,
            processing: 0,
            failed: 1,
            pending: 0,
            closed: 1,
            open: 0,
            outstanding: 0,
          },
          rate: 0,
          trend: [],
          recent: [invoice],
          errors: [],
        };
        break;
      case '/invoices':
        body = {
          rows: [invoice],
          total: 1,
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize')),
        };
        break;
      case `/invoices/${invoice.id}`:
        body = { ...invoice, history: [], targets: [] };
        break;
      case '/accurate/delivered-invoices':
        body = [];
        break;
      case '/imports/overview':
        body = {
          items: [],
          total: 0,
          summary: { sent: 0, draft: 0, failed: 0, redeem: 0, processing: 0 },
        };
        break;
      case '/imports':
        body = { items: [], total: 0 };
        break;
      default:
        body = [];
    }
    await route.fulfill({ json: body });
  });
  return requests;
}

test('greeting follows WIB boundaries independently of browser timezone and updates while open', async ({
  page,
}) => {
  for (const [time, expected] of [
    ['2026-11-12T21:59:00Z', 'Selamat malam'],
    ['2026-11-12T22:00:00Z', 'Selamat pagi'],
    ['2026-11-13T03:59:00Z', 'Selamat pagi'],
    ['2026-11-13T04:00:00Z', 'Selamat siang'],
    ['2026-11-13T10:59:00Z', 'Selamat siang'],
    ['2026-11-13T11:00:00Z', 'Selamat malam'],
  ])
    expect(greetingAt(new Date(time))).toBe(expected);
  await mockWorkspace(page);
  await page.clock.install({ time: new Date('2026-11-13T03:59:50Z') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Selamat pagi - Kautsar' })).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(page.getByRole('heading', { name: 'Selamat siang - Kautsar' })).toBeVisible();
});

for (const mobile of [false, true]) {
  test(`settings layout, command placeholder and shortcuts ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 950 });
    const requests = await mockWorkspace(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    const branchFilter = page.getByRole('combobox', { name: 'Filter cabang', exact: true });
    const periodFilter = page.getByRole('combobox', { name: 'Filter periode', exact: true });
    for (const control of [branchFilter, periodFilter]) {
      const shape = await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          height: element.getBoundingClientRect().height,
          radii: [
            style.borderTopLeftRadius,
            style.borderTopRightRadius,
            style.borderBottomRightRadius,
            style.borderBottomLeftRadius,
          ],
        };
      });
      expect(new Set(shape.radii).size).toBe(1);
      expect(parseFloat(shape.radii[0])).toBeGreaterThanOrEqual(shape.height / 2);
      await expect(control).toHaveAttribute('data-slot', 'select-trigger');
    }
    await selectOption(branchFilter, { label: 'PT. MMI' });
    await selectOption(periodFilter, '90');
    await expect(periodFilter).toHaveText('90 hari terakhir');
    await periodFilter.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(periodFilter).toBeFocused();
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.screenshot({
      path: `../../docs/screenshots/dashboard-filters-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await expect(page.locator('.environment-badge')).toHaveCount(0);
    await expect(
      page.locator('#workspace-sidebar').getByRole('button', { name: 'Akun Saya' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Faktur Penjualan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Faktur Penjualan.' })).toBeVisible();
    await expect(
      page.getByText('Pantau invoice, lanjutkan review draft, atau mulai upload baru.', {
        exact: true,
      }),
    ).toHaveCount(0);
    const heading = page.locator('.imports-view .page-heading');
    await expect(
      heading.getByRole('button', { name: 'Upload invoice', exact: true }),
    ).toBeVisible();
    if (!mobile) {
      const titleBox = await heading.getByRole('heading').boundingBox();
      const uploadBox = await heading
        .getByRole('button', { name: 'Upload invoice', exact: true })
        .boundingBox();
      expect(
        titleBox &&
          uploadBox &&
          Math.abs(titleBox.y + titleBox.height / 2 - uploadBox.y - uploadBox.height / 2) < 35,
      ).toBeTruthy();
    }
    await expect(page.getByRole('alert', { name: 'Mode pengiriman Accurate' })).toHaveCount(0);
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await page.getByRole('button', { name: 'Penerimaan Penjualan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Penerimaan Penjualan.' })).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const panel = page.getByRole('tabpanel');
    await expect(page.getByLabel('API Token', { exact: true })).toBeVisible();
    const token = page.getByLabel('API Token', { exact: true });
    await expect(token).toHaveValue('••••••••••••••••');
    await expect(token).toHaveAttribute('readonly', '');
    await page.getByRole('button', { name: 'Ubah API Token', exact: true }).click();
    await token.fill('unsaved-replacement');
    await page.getByRole('button', { name: 'Batal ubah API Token', exact: true }).click();
    await expect(token).toHaveValue('••••••••••••••••');
    const connection = panel.locator('[data-slot=card]').first();
    const formBox = await connection.boundingBox();
    const inputBox = await page.getByLabel('API Token', { exact: true }).boundingBox();
    expect(inputBox!.x - formBox!.x).toBeGreaterThanOrEqual(19);
    expect(await page.getByLabel('Aktifkan koneksi Accurate', { exact: true }).isChecked()).toBe(
      true,
    );
    const toggleBox = await page
      .getByLabel('Aktifkan koneksi Accurate', { exact: true })
      .boundingBox();
    const toggleLabel = await page.locator('label[for="accurate-enabled"]').boundingBox();
    expect(Math.abs(toggleBox!.x - toggleLabel!.x)).toBeLessThan(50);
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    for (const label of ['Koneksi integrasi', 'Tujuan perusahaan', 'Keamanan akun']) {
      await page.getByRole('tab', { name: label, exact: true }).click();
      await expect(panel).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const card = panel.locator('[data-slot=card]').first();
      const lastContent = card.locator('[data-slot=card-content]');
      expect(
        await lastContent.evaluate((element) =>
          parseFloat(getComputedStyle(element).paddingBottom),
        ),
      ).toBeGreaterThanOrEqual(20);
      await page.screenshot({
        path: `../../docs/screenshots/settings-${label.split(' ')[0].toLowerCase()}-${mobile ? 'mobile' : 'desktop'}.png`,
      });
    }
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('button', { name: 'Pilih modul: Easy Recap' }).click();
    await page.getByRole('menuitemradio', { name: /Command/ }).click();
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    const dashboards = requests.filter((path) => path === '/dashboard').length;
    await page.getByRole('button', { name: 'Buka Easy Recap', exact: true }).click();
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    expect(requests.filter((path) => path === '/dashboard').length).toBeGreaterThanOrEqual(
      dashboards,
    );
    expect(errors).toEqual([]);
  });

  test(`notification dropdown, invoice details and notification page ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 900 });
    await mockWorkspace(page);
    await page.goto('/');
    await page.getByRole('button', { name: /^Notifikasi/ }).click();
    const menu = page.getByRole('menu', { name: 'Notifikasi invoice', exact: true });
    await expect(menu.getByText('INV-UI-001', { exact: true })).toBeVisible();
    // Radix hides the background from assistive technology while its menu is open.
    await expect(
      page.getByRole('heading', { name: /^Selamat /, includeHidden: true }),
    ).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(mobile ? 390 : 1440);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /^Notifikasi/ })).toBeFocused();
    await page.getByRole('button', { name: /^Notifikasi/ }).click();
    await menu.getByRole('menuitem', { name: /INV-UI-001/ }).click();
    await expect(page.getByRole('dialog', { name: 'Detail invoice' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Notifikasi/ }).click();
    await menu.getByRole('menuitem', { name: 'Lihat detail notifikasi' }).click();
    await expect(page.getByRole('heading', { name: 'Notifikasi Anda.' })).toBeVisible();
    await expect(page.getByText('Kode item belum sesuai.', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Lihat detail invoice INV-UI-001', exact: true })
      .click();
    await expect(page.getByRole('dialog', { name: 'Detail invoice' })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `../../docs/screenshots/notifications-${mobile ? 'mobile' : 'desktop'}.png`,
    });
  });
}

test('notification empty and failure states can recover without navigating away', async ({
  page,
}) => {
  await mockWorkspace(page, 'viewer');
  let fail = true;
  await page.route('**/api/invoices?*', async (route) => {
    await route.fulfill(
      fail
        ? { status: 503, json: { error: 'Notifikasi sementara tidak tersedia.' } }
        : { json: { rows: [], total: 0, page: 1, pageSize: 5 } },
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Notifikasi/ }).click();
  const menu = page.getByRole('menu', { name: 'Notifikasi invoice', exact: true });
  await expect(menu.getByRole('alert')).toHaveText('Notifikasi sementara tidak tersedia.');
  fail = false;
  await menu.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(menu.getByText('Belum ada notifikasi', { exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Lihat detail notifikasi' }).click();
  await expect(page.getByRole('heading', { name: 'Notifikasi Anda.' })).toBeVisible();
  await expect(page.getByText('Belum ada notifikasi', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }),
  ).toHaveCount(0);
});

test('notification pages load the next records from the API', async ({ page }) => {
  await mockWorkspace(page);
  await page.route('**/api/invoices?*', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const pageNumber = Number(query.get('page'));
    const pageSize = Number(query.get('pageSize'));
    const rows = Array.from({ length: 11 }, (_, index) => ({
      ...invoice,
      id: `invoice-${index + 1}`,
      number: `PAGED-${index + 1}`,
    })).slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    await route.fulfill({ json: { rows, total: 11, page: pageNumber, pageSize } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Notifikasi/ }).click();
  await page.getByRole('menuitem', { name: 'Lihat detail notifikasi' }).click();
  const content = page.getByRole('main', { name: 'Konten ruang kerja' });
  await expect(content.getByText('PAGED-1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Halaman notifikasi: berikutnya', exact: true }).click();
  await expect(content.getByText('PAGED-11', { exact: true })).toBeVisible();
  await expect(content.getByText('PAGED-1', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Halaman notifikasi: sebelumnya', exact: true }),
  ).toBeEnabled();
});
