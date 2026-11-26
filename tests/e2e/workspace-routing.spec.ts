import { expect, test, type Page } from '@playwright/test';
import { workspaceRoutingApi } from '../helpers/workspace-routing-api';

async function navigate(page: Page, name: string, mobile = false) {
  if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('link', { name, exact: true }).click();
}

for (const mobile of [false, true])
  test(`workspace URLs survive refresh and Back/Forward without changing the shell (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    const f = await workspaceRoutingApi(page);
    await page.setViewportSize({ width: mobile ? 390 : 1600, height: mobile ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/easyrecap\/dashboard$/);
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    await navigate(page, 'Faktur Penjualan (Invoices)', mobile);
    await expect(page).toHaveURL(/\/easyrecap\/faktur-penjualan$/);
    await expect(
      page.getByRole('heading', { name: 'Faktur Penjualan.', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/easyrecap\/faktur-penjualan$/);
    await expect(
      page.getByRole('heading', { name: 'Faktur Penjualan.', exact: true }),
    ).toBeVisible();
    await navigate(page, 'Penerimaan Penjualan (Receipt)', mobile);
    await expect(page).toHaveURL(/\/easyrecap\/penerimaan-penjualan$/);
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Faktur Penjualan.', exact: true }),
    ).toBeVisible();
    await page.goForward();
    await expect(
      page.getByRole('heading', { name: 'Penerimaan Penjualan.', exact: true }),
    ).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    await page.getByRole('button', { name: 'Pilih modul: Easy Recap', exact: true }).click();
    await page.getByRole('menuitemradio', { name: /Command/ }).click();
    await expect(page).toHaveURL(/\/command\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard eksekutif', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Dashboard eksekutif', exact: true }),
    ).toBeVisible();
    const beforeDashboard = f.reads.filter((path) => path === '/dashboard').length;
    await page.getByRole('button', { name: 'Menu profil Routing User', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Akun Saya', exact: true }).click();
    await expect(page).toHaveURL(/\/command\/account$/);
    await expect(
      page.getByRole('heading', { name: 'Keamanan akun Anda.', exact: true }),
    ).toBeVisible();
    expect(f.reads.filter((path) => path === '/dashboard')).toHaveLength(beforeDashboard);
    await page.goBack();
    await expect(page).toHaveURL(/\/command\/dashboard$/);
    await page.getByRole('button', { name: 'Buka Easy Recap', exact: true }).click();
    await expect(page).toHaveURL(/\/easyrecap\/dashboard$/);
    if (!mobile) {
      await page.getByRole('button', { name: 'Ciutkan sidebar', exact: true }).click();
      await navigate(page, 'Faktur Penjualan (Invoices)');
      await expect(
        page.getByRole('button', { name: 'Perluas sidebar', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }),
      ).toHaveAttribute('aria-current', 'page');
    }
    if (mobile)
      await expect(page.getByText('Aktivitas sinkronisasi', { exact: true })).toBeVisible();
    else await expect(page.getByText('INV-ROUTING', { exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(f.writes).toEqual([]);
    expect(f.errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `tmp/workspace-routing-${mobile ? 'mobile' : 'desktop'}.png` });
  });

test('a direct batch URL shows login, opens the intended batch after login, and survives refresh', async ({
  page,
}) => {
  const f = await workspaceRoutingApi(page, { signedIn: false, role: 'finance' });
  await page.goto('/easyrecap/faktur-penjualan/route-batch');
  await expect(page.getByRole('form', { name: 'Masuk ke intgrte', exact: true })).toBeVisible();
  expect(f.reads).not.toContain('/imports/route-batch');
  await page.getByLabel('Email', { exact: true }).fill('routing@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-login-password-123!');
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(page).toHaveURL(/\/easyrecap\/faktur-penjualan\/route-batch$/);
  await expect(
    page.getByRole('button', { name: 'Periksa INV-ROUTING', exact: true }),
  ).toBeVisible();
  // Development Strict Mode aborts its first effect; count completed reads only.
  expect(f.completedReads.filter((path) => path === '/imports/route-batch')).toHaveLength(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Periksa INV-ROUTING', exact: true }),
  ).toBeVisible();
  expect(f.completedReads.filter((path) => path === '/imports/route-batch')).toHaveLength(2);
  expect(f.reads).not.toContain('/dashboard');
  await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
  await expect(page).toHaveURL(/\/easyrecap\/faktur-penjualan$/);
  // Reopening from history must read the latest batch, just as before URL routing.
  f.batch.rows[0].candidate.number = 'INV-ROUTING-UPDATED';
  await page.getByRole('button', { name: 'Buka batch route-ba', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Periksa INV-ROUTING-UPDATED', exact: true }),
  ).toBeVisible();
  expect(f.completedReads.filter((path) => path === '/imports/route-batch')).toHaveLength(3);
  await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  await expect(page).toHaveURL(/\/easyrecap\/faktur-penjualan\/upload$/);
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Perusahaan tujuan upload', exact: true }),
  ).toBeVisible();
  expect(f.errors).toEqual([]);
});

test('receipt detail URLs preserve history filters on return and reopen after a browser refresh', async ({
  page,
}) => {
  const f = await workspaceRoutingApi(page, { role: 'finance' });
  await page.goto('/easyrecap/penerimaan-penjualan');
  await page.getByRole('textbox', { name: 'Cari penerimaan', exact: true }).fill('Customer');
  await page.getByRole('button', { name: 'Buka', exact: true }).click();
  await expect(page).toHaveURL(/\/easyrecap\/penerimaan-penjualan\/route-receipt$/);
  await expect(
    page.getByRole('textbox', { name: 'Referensi pembayaran', exact: true }),
  ).toHaveValue('REFERENCE-ROUTING');
  await page.goBack();
  await expect(page.getByRole('textbox', { name: 'Cari penerimaan', exact: true })).toHaveValue(
    'Customer',
  );
  await page.goForward();
  await expect(page).toHaveURL(/\/easyrecap\/penerimaan-penjualan\/route-receipt$/);
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Referensi pembayaran', exact: true }),
  ).toHaveValue('REFERENCE-ROUTING');
  expect(f.reads).not.toContain('/dashboard');
  expect(f.writes).toEqual([]);
  expect(f.errors).toEqual([]);
});

for (const [role, path, destination] of [
  ['finance', '/easyrecap/settings', '/easyrecap/dashboard'],
  ['finance', '/easyrecap/user-management', '/easyrecap/dashboard'],
  ['finance', '/command/audit-log', '/command/dashboard'],
  ['viewer', '/easyrecap/faktur-penjualan/route-batch', '/easyrecap/dashboard'],
  ['viewer', '/easyrecap/penerimaan-penjualan/route-receipt', '/easyrecap/dashboard'],
])
  test(`${role} cannot bypass page access by opening ${path} directly`, async ({ page }) => {
    const f = await workspaceRoutingApi(page, { role });
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    await expect(
      page.getByRole('heading', {
        name: destination.startsWith('/command') ? 'Dashboard eksekutif' : /^Selamat /,
      }),
    ).toBeVisible();
    expect(
      f.reads.some((path) => /^\/(settings|users|audit|imports|receipts)(\/|$)/.test(path)),
    ).toBe(false);
    await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveCount(0);
    expect(f.errors).toEqual([]);
  });

test('unknown workspace pages return a real 404', async ({ page }) => {
  await workspaceRoutingApi(page);
  const response = await page.goto('/command/faktur-penjualan');
  expect(response?.status()).toBe(404);
  await expect(page).toHaveURL(/\/command\/faktur-penjualan$/);
});
