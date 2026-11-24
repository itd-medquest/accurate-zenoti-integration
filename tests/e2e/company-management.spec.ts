import { test, expect, type Page } from '@playwright/test';
import { selectOption } from '../helpers/select-option';

async function fixture(page: Page) {
  const companies = [
    { id: 'legacy', name: 'PT. MMI', protected: true, configured: true, enabled: true },
  ];
  const saved: { branchId: string | null; body: unknown }[] = [];
  const deleted: string[] = [];
  const errors: string[] = [];
  const state = { rejectDelete: false };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = route.request().method();
    const actor = {
      id: 'admin',
      name: 'Admin',
      email: 'admin@example.test',
      role: 'super_admin',
      active: true,
    };
    let body: unknown = [];
    const company =
      companies.find((row) => row.id === url.searchParams.get('branchId')) ?? companies[0];
    const branches = () =>
      companies.map((row) => ({
        id: row.id,
        name: row.name,
        centerId: row.id,
        accurateDatabaseId: 'unconfigured',
        accurateBranchId: 'unconfigured',
        active: true,
      }));
    if (path === '/auth/get-session')
      body = {
        session: { id: 'session', userId: actor.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: actor,
      };
    if (path === '/me') body = actor;
    if (path === '/branches') body = branches();
    if (path === '/invoices') body = { rows: [], total: 0, page: 1, pageSize: 5 };
    if (path === '/dashboard')
      body = {
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
      };
    if (path === '/settings')
      body = {
        mode: 'live',
        targetStatus: 'SALES_INVOICE',
        queue: 'mysql',
        timezone: 'Asia/Jakarta',
        accurate: {
          mode: 'live',
          taxPolicy: 'gross-no-tax',
          hasApiToken: company?.configured ?? false,
          hasSignatureSecret: company?.configured ?? false,
        },
        connections: [
          {
            id: 'accurate',
            enabled: company?.enabled ?? false,
            hasSecret: company?.configured ?? false,
            updatedAt: '2026-11-19T00:00:00Z',
          },
        ],
      };
    if (path === '/settings/accurate' && method === 'PATCH') {
      saved.push({
        branchId: url.searchParams.get('branchId'),
        body: route.request().postDataJSON(),
      });
      if (company) {
        company.configured = true;
        company.enabled = true;
      }
      body = { ok: true };
    }
    if (path === '/settings/accurate/test')
      body = {
        ok: true,
        simulation: false,
        database: { id: company?.id, name: company?.name },
        message: `Terhubung ke ${company?.name}.`,
      };
    if (path === '/companies' && method === 'POST') {
      const input = route.request().postDataJSON();
      const created = {
        id: 'company-new',
        name: String(input.name),
        protected: false,
        configured: false,
        enabled: false,
      };
      companies.push(created);
      return route.fulfill({ status: 201, json: { id: created.id, name: created.name } });
    }
    if (path === '/companies')
      body = companies.map((row) => ({
        ...branches().find((branch) => branch.id === row.id),
        canDelete: !row.protected,
        deleteReason: row.protected
          ? 'Perusahaan memiliki riwayat upload atau transaksi yang harus dipertahankan.'
          : null,
        connection: {
          mode: 'live',
          taxPolicy: 'gross-no-tax',
          hasApiToken: row.configured,
          hasSignatureSecret: row.configured,
          enabled: row.enabled,
        },
      }));
    if (path.startsWith('/companies/') && method === 'DELETE') {
      if (state.rejectDelete)
        return route.fulfill({
          status: 409,
          json: { error: 'Perusahaan berubah. Periksa kembali sebelum menghapus.' },
        });
      const id = path.split('/').at(-1)!;
      const target = companies.find((row) => row.id === id);
      expect(route.request().postDataJSON()).toEqual({ confirmationName: target?.name });
      deleted.push(id);
      companies.splice(
        companies.findIndex((row) => row.id === id),
        1,
      );
      body = { ok: true };
    }
    await route.fulfill({ json: body });
  });
  return { companies, saved, deleted, errors, state };
}

for (const mobile of [false, true]) {
  test(`admin manages companies with isolated connection forms and typed deletion (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }, info) => {
    const f = await fixture(page);
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Perusahaan', exact: true }).click();
    await expect(page.getByText('Daftar perusahaan', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Hapus perusahaan PT. MMI', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Tambah perusahaan', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tambah perusahaan', exact: true });
    await dialog.getByLabel('Nama perusahaan', { exact: true }).fill('PT Perusahaan Baru');
    await dialog.getByRole('button', { name: 'Tambah perusahaan', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('PT Perusahaan Baru', { exact: true })).toBeVisible();
    await page
      .getByRole('button', { name: 'Atur koneksi PT Perusahaan Baru', exact: true })
      .click();
    await expect(page.getByLabel('Perusahaan yang diatur', { exact: true })).toContainText(
      'PT Perusahaan Baru',
    );
    await expect(page.getByLabel('API Token', { exact: true })).toHaveValue('');
    await page.getByLabel('API Token', { exact: true }).fill('synthetic-company-token');
    await page.getByLabel('Signature Secret', { exact: true }).fill('synthetic-company-secret');
    await page.getByLabel('Aktifkan koneksi Accurate', { exact: true }).check();
    await page.getByRole('button', { name: 'Simpan koneksi', exact: true }).click();
    await expect.poll(() => f.saved.length).toBe(1);
    expect(f.saved[0].branchId).toBe('company-new');
    await expect(page.getByLabel('API Token', { exact: true })).toHaveAttribute('type', 'password');
    await expect(page.getByLabel('API Token', { exact: true })).not.toHaveValue('');
    await selectOption(page.getByLabel('Perusahaan yang diatur', { exact: true }), 'legacy');
    await expect(page.getByLabel('Perusahaan yang diatur', { exact: true })).toContainText(
      'PT. MMI',
    );
    await expect(page.getByLabel('API Token', { exact: true })).not.toHaveValue(
      'synthetic-company-token',
    );
    await page.getByRole('tab', { name: 'Perusahaan', exact: true }).click();
    await expect(page.getByText('PT Perusahaan Baru', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `tmp/companies-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page
      .getByRole('button', { name: 'Hapus perusahaan PT Perusahaan Baru', exact: true })
      .click();
    const confirmation = page.getByRole('alertdialog');
    const remove = confirmation.getByRole('button', { name: 'Hapus perusahaan', exact: true });
    await expect(remove).toBeDisabled();
    await confirmation.getByLabel('Ketik nama perusahaan', { exact: true }).fill('Nama berbeda');
    await expect(remove).toBeDisabled();
    await confirmation
      .getByLabel('Ketik nama perusahaan', { exact: true })
      .fill('PT Perusahaan Baru');
    await expect(remove).toBeEnabled();
    f.state.rejectDelete = true;
    await remove.click();
    await expect(confirmation.getByRole('alert')).toContainText('Perusahaan berubah.');
    await expect(confirmation.getByLabel('Ketik nama perusahaan', { exact: true })).toHaveValue(
      'PT Perusahaan Baru',
    );
    expect(f.deleted).toEqual([]);
    f.state.rejectDelete = false;
    await remove.click();
    await expect(confirmation).toBeHidden();
    await expect(page.getByText('PT Perusahaan Baru', { exact: true })).toHaveCount(0);
    expect(f.deleted).toEqual(['company-new']);
    expect(f.companies.map((row) => row.id)).toEqual(['legacy']);
    expect(f.errors).toEqual([]);
  });
}
