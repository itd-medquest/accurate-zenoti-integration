import { expect, test, type Page } from '@playwright/test';
import { selectOption } from '../helpers/select-option';

async function mockWorkspace(page: Page, signedIn = true) {
  const auditQueries: string[] = [];
  const errors: string[] = [];
  const state = { failAudit: false, total: 103 };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const actor = {
      id: 'feedback-admin',
      name: 'Admin Uji',
      email: 'admin@example.test',
      role: 'super_admin',
      active: true,
    };
    let body: unknown = [];
    if (path === '/auth/get-session')
      body = signedIn
        ? {
            session: {
              id: 'feedback-session',
              userId: actor.id,
              expiresAt: '2099-01-01T00:00:00Z',
            },
            user: actor,
          }
        : null;
    if (path === '/me') body = actor;
    if (path === '/branches') body = [];
    if (path === '/invoices') body = { rows: [], total: 0, page: 1, pageSize: 5 };
    if (path === '/dashboard')
      body = {
        summary: {
          total: 36,
          synced: 24,
          processing: 0,
          failed: 4,
          pending: 8,
          closed: 24,
          open: 12,
          outstanding: 0,
        },
        rate: 66.7,
        trend: Array.from({ length: 12 }, (_, index) => ({
          date: `2026-11-${String(index + 7).padStart(2, '0')}`,
          total: 3,
          synced: [0, 0, 1, 3, 3, 3, 2, 3, 2, 2, 2, 3][index],
          failed: 0,
        })),
        recent: [],
        errors: [],
      };
    if (path === '/audit/overview') {
      auditQueries.push(url.search);
      if (state.failAudit)
        return route.fulfill({ status: 503, json: { error: 'Audit sementara tidak tersedia.' } });
      const pageSize = Number(url.searchParams.get('pageSize'));
      const current = Math.min(
        Number(url.searchParams.get('page')),
        Math.max(1, Math.ceil(state.total / pageSize)),
      );
      const start = (current - 1) * pageSize;
      body = {
        items: Array.from({ length: Math.min(pageSize, state.total - start) }, (_, index) => ({
          id: `audit-${start + index}`,
          action: 'invoice.review',
          actorId: 'feedback-admin',
          entityId: `INV-${String(state.total - start - index).padStart(3, '0')}`,
          createdAt: '2026-11-19T03:00:00Z',
          details: { source: 'Pengujian UI' },
        })),
        total: state.total,
        page: current,
        pageSize,
      };
    }
    await route.fulfill({ json: body });
  });
  return { auditQueries, errors, state };
}

for (const dark of [false, true]) {
  test(`chart hover clears its tooltip without leaving visual remnants (${dark ? 'dark' : 'light'})`, async ({
    page,
  }, info) => {
    const f = await mockWorkspace(page);
    await page.setViewportSize({ width: 1500, height: 1050 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    await expect(page.getByText('Aktivitas sinkronisasi', { exact: true })).toBeVisible();
    if (dark) await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
    const chart = page.locator('.trend-chart');
    await expect(chart.locator('.recharts-area')).toHaveCount(2);
    await page.evaluate(() => document.fonts.ready);
    // Wait for the existing chart reveal before comparing hover pixels.
    await chart.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    const before = await chart.screenshot({
      animations: 'disabled',
      path: `tmp/chart-before-hover-${dark ? 'dark' : 'light'}.png`,
    });
    const box = await chart.boundingBox();
    if (!box) throw new Error('Chart has no visible bounds');
    for (let index = 0; index < 12; index++) {
      await chart.hover({ position: { x: 70 + ((box.width - 100) * index) / 11, y: 70 } });
    }
    const tooltip = chart.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('Nov 2026');
    await expect(tooltip).toContainText('Total invoice');
    await expect(tooltip).toContainText('Tersinkron');
    await info.attach('chart-hover', {
      body: await chart.screenshot({
        animations: 'disabled',
        path: `tmp/chart-hover-${dark ? 'dark' : 'light'}.png`,
      }),
      contentType: 'image/png',
    });
    await page.getByRole('heading', { name: /^Selamat / }).hover();
    await expect(tooltip).toBeHidden();
    const after = await chart.screenshot({ animations: 'disabled' });
    await info.attach('chart-after-hover', { body: after, contentType: 'image/png' });
    expect(after.equals(before)).toBe(true);
    expect(f.errors).toEqual([]);
  });
}

for (const mode of ['expanded', 'collapsed', 'mobile'] as const) {
  test(`workspace menu keeps readable labels and a visible selected indicator (${mode})`, async ({
    page,
  }, info) => {
    const f = await mockWorkspace(page);
    await page.setViewportSize({ width: mode === 'mobile' ? 390 : 1440, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    if (mode === 'collapsed')
      await page.getByRole('button', { name: 'Ciutkan sidebar', exact: true }).click();
    if (mode === 'mobile')
      await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    const trigger = page.getByRole('button', { name: 'Pilih modul: Easy Recap', exact: true });
    await trigger.click();
    const menu = page.getByRole('menu', { name: 'Modul platform' });
    await expect(menu).toBeVisible();
    const active = menu.getByRole('menuitemradio', { name: /Easy Recap/ });
    await expect(active).toHaveAttribute('aria-checked', 'true');
    const bounds = await menu.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(260);
    const label = active.locator('strong');
    expect(await label.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    expect(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await info.attach('workspace-menu', {
      body: await page.screenshot({ path: `tmp/workspace-menu-${mode}.png` }),
      contentType: 'image/png',
    });
    if (mode !== 'mobile') {
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
    }
    await menu.getByRole('menuitemradio', { name: /Command/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Dashboard eksekutif', exact: true }),
    ).toBeVisible();
    expect(f.errors).toEqual([]);
  });
}

for (const mobile of [false, true]) {
  test(`audit history pages through older records and changes page size without polling (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }, info) => {
    const f = await mockWorkspace(page);
    await page.clock.install();
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 950 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    await page.getByRole('link', { name: 'Audit Log', exact: true }).click();
    const table = page.getByRole('table', { name: 'Audit aktivitas' });
    await expect(table.getByRole('row')).toHaveCount(26);
    await expect(table).toContainText('INV-103');
    const previous = page.getByRole('button', {
      name: 'Halaman audit aktivitas: sebelumnya',
      exact: true,
    });
    const next = page.getByRole('button', {
      name: 'Halaman audit aktivitas: berikutnya',
      exact: true,
    });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(table).toContainText('INV-078');
    await expect(previous).toBeEnabled();
    await selectOption(page.getByLabel('Halaman audit aktivitas: jumlah per halaman'), '50');
    await expect(table.getByRole('row')).toHaveCount(51);
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(table).toContainText('INV-053');
    await expect(next).toBeEnabled();
    await next.click();
    await expect(table.getByRole('row')).toHaveCount(4);
    await expect(table).toContainText('INV-001');
    await expect(next).toBeDisabled();
    await expect(page.getByRole('navigation', { name: 'Halaman audit aktivitas' })).toContainText(
      '101–103 dari 103',
    );
    const count = f.auditQueries.length;
    await page.clock.fastForward(120_000);
    expect(f.auditQueries.length).toBe(count);
    expect(f.auditQueries).toContain('?page=1&pageSize=50');
    await info.attach('audit-pagination', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(f.errors).toEqual([]);
  });
}

test('audit request failures stop without repeated requests and allow an explicit retry', async ({
  page,
}) => {
  const f = await mockWorkspace(page);
  f.state.failAudit = true;
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  await page.getByRole('link', { name: 'Audit Log', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Audit sementara tidak tersedia.',
  );
  await page.clock.fastForward(120_000);
  expect(f.auditQueries.length).toBe(1);
  f.state.failAudit = false;
  f.state.total = 0;
  await page.getByRole('button', { name: 'Coba lagi', exact: true }).click();
  await expect(page.getByText('Belum ada aktivitas operasional.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Halaman audit aktivitas: berikutnya' }),
  ).toBeDisabled();
  expect(f.auditQueries.length).toBe(2);
  expect(f.errors).toEqual([]);
});

test('login displays Secured Platform instead of a version number', async ({ page }) => {
  await mockWorkspace(page, false);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Selamat datang!' })).toBeVisible();
  await expect(page.getByText('Secured Platform', { exact: true })).toBeVisible();
  await expect(page.getByText('v0.0.1', { exact: true })).toHaveCount(0);
});
