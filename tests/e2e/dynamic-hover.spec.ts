import { expect, test, type Locator, type Page } from '@playwright/test';

async function workspace(page: Page, dark = false) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light' });
  await page.addInitScript(
    (theme) => localStorage.setItem('intgrte-theme', theme),
    dark ? 'dark' : 'light',
  );
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const actor = {
      id: 'hover-admin',
      name: 'Admin Hover',
      email: 'hover@example.test',
      role: 'super_admin',
      active: true,
    };
    const invoices = Array.from({ length: 3 }, (_, index) => ({
      id: `invoice-${index}`,
      number: `HOVER-${index + 1}`,
      customer: `Customer ${index + 1}`,
      date: '2026-11-19',
      total: 150000,
      status: 'CLOSED',
      syncStatus: 'FAILED',
      branchId: 'company-1',
      updatedAt: '2026-11-19T03:00:00Z',
      error: 'Periksa pemetaan.',
    }));
    let body: unknown = [];
    if (path === '/auth/get-session')
      body = {
        session: { id: 'session', userId: actor.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: actor,
      };
    if (path === '/me') body = actor;
    if (path === '/branches')
      body = Array.from({ length: 35 }, (_, i) => ({
        id: `company-${i + 1}`,
        name: `Perusahaan ${String(i + 1).padStart(2, '0')}`,
        active: true,
      }));
    if (path === '/invoices')
      body = { rows: invoices, total: invoices.length, page: 1, pageSize: 20 };
    if (path === '/dashboard')
      body = {
        summary: {
          total: 3,
          synced: 0,
          processing: 0,
          failed: 3,
          pending: 0,
          closed: 3,
          open: 0,
          outstanding: 0,
        },
        rate: 0,
        trend: [],
        recent: invoices,
        errors: [],
      };
    if (path === '/imports/overview')
      body = {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        summary: { draft: 0, sent: 0, failed: 0, redeem: 0, processing: 0 },
      };
    await route.fulfill({ json: body });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  const toggle = page.getByRole('button', {
    name: dark ? 'Gunakan mode gelap' : 'Gunakan mode terang',
    exact: true,
  });
  if (await toggle.isVisible()) await toggle.click();
  return errors;
}

async function corners(locator: Locator) {
  return locator.evaluate((element) => {
    const css = getComputedStyle(element);
    return [
      css.borderTopLeftRadius,
      css.borderTopRightRadius,
      css.borderBottomRightRadius,
      css.borderBottomLeftRadius,
    ];
  });
}

async function innerCorners(locator: Locator) {
  return locator.evaluate((element) => {
    const css = getComputedStyle(element);
    const inset = parseFloat(css.paddingLeft);
    return [
      css.borderTopLeftRadius,
      css.borderTopRightRadius,
      css.borderBottomRightRadius,
      css.borderBottomLeftRadius,
    ].map((radius) => `${Math.max(0, parseFloat(radius) - inset)}px`);
  });
}

async function expectPopupGutter(popup: Locator, lastRow: Locator) {
  const boundary = await popup.boundingBox();
  const row = await lastRow.boundingBox();
  if (!boundary || !row) throw new Error('Popup or row has no bounds');
  const inset = await popup.evaluate((element) =>
    parseFloat(getComputedStyle(element).paddingLeft),
  );
  expect(inset).toBeGreaterThan(0);
  expect(row.x - boundary.x).toBeCloseTo(inset, 1);
  expect(boundary.x + boundary.width - row.x - row.width).toBeCloseTo(inset, 1);
  expect(boundary.y + boundary.height - row.y - row.height).toBeCloseTo(inset, 1);
}

for (const dark of [false, true]) {
  for (const mobile of [false, true]) {
    test(`workspace rows follow the actual menu corners (${dark ? 'dark' : 'light'}, ${mobile ? 'mobile' : 'desktop'})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: mobile ? 390 : 1440, height: 950 });
      const errors = await workspace(page, dark);
      if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
      const trigger = page.getByRole('button', { name: 'Pilih modul: Easy Recap', exact: true });
      await trigger.click();
      const menu = page.getByRole('menu', { name: 'Modul platform' });
      const recap = menu.getByRole('menuitemradio', { name: /Easy Recap/ });
      const command = menu.getByRole('menuitemradio', { name: /Command/ });
      const radius = await innerCorners(menu);
      expect(await corners(recap)).toEqual(['0px', '0px', '0px', '0px']);
      expect(await corners(command)).toEqual(['0px', '0px', radius[2], radius[3]]);
      await command.hover();
      await expect(command).toHaveAttribute('data-highlighted', '');
      if (dark) {
        await expect(command).toHaveCSS('background-color', 'rgb(83, 67, 223)');
        await expect(command).toHaveCSS('color', 'rgb(255, 255, 255)');
        await expect(command.locator('small')).toHaveCSS('color', 'rgb(255, 255, 255)');
      }
      expect(
        await command.evaluate((element) => getComputedStyle(element).backgroundColor),
      ).not.toBe('rgba(0, 0, 0, 0)');
      await page.keyboard.press('Home');
      await expect(recap).toBeFocused();
      await page.keyboard.press('End');
      await expect(command).toBeFocused();
      expect(await corners(command)).toEqual(['0px', '0px', radius[2], radius[3]]);
      await expectPopupGutter(menu, command);
      await menu.screenshot({
        path: `tmp/dynamic-hover-menu-${dark ? 'dark' : 'light'}-${mobile ? 'mobile' : 'desktop'}.png`,
      });
      expect(await menu.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

test('account and notification groups respect headings, separators and footers', async ({
  page,
}) => {
  const errors = await workspace(page, true);
  await page.getByRole('button', { name: 'Menu profil Admin Hover', exact: true }).click();
  let menu = page.getByRole('menu');
  const radius = await innerCorners(menu);
  expect(await corners(menu.getByRole('menuitem', { name: 'Akun Saya', exact: true }))).toEqual([
    '0px',
    '0px',
    '0px',
    '0px',
  ]);
  const logout = menu.getByRole('menuitem', { name: 'Logout', exact: true });
  await logout.hover();
  expect(await corners(logout)).toEqual(['0px', '0px', radius[2], radius[3]]);
  await expectPopupGutter(menu, logout);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Notifikasi/ }).click();
  menu = page.getByRole('menu', { name: 'Notifikasi invoice' });
  await expect(menu.getByRole('menuitem')).toHaveCount(4);
  for (const row of await menu
    .locator('[data-slot=dropdown-menu-group]')
    .first()
    .getByRole('menuitem')
    .all()) {
    expect(await corners(row)).toEqual(['0px', '0px', '0px', '0px']);
  }
  const footer = menu.getByRole('menuitem', { name: /Lihat detail notifikasi/ });
  await footer.hover();
  const footerRadius = await innerCorners(menu);
  expect(await corners(footer)).toEqual(['0px', '0px', footerRadius[2], footerRadius[3]]);
  await expectPopupGutter(menu, footer);
  await menu.screenshot({ path: 'tmp/dynamic-hover-notifications.png' });
  expect(errors).toEqual([]);
});

test('select options follow top, middle and bottom edges during keyboard navigation and scrolling', async ({
  page,
}) => {
  const errors = await workspace(page);
  const trigger = page.getByRole('combobox', { name: 'Filter cabang', exact: true });
  await trigger.click();
  const list = page.getByRole('listbox');
  const options = list.getByRole('option');
  await expect(options).toHaveCount(36);
  // Arrow controls can occupy the outer scroll edge; each option must inherit
  // precisely the corners available to the viewport, not its own capsule.
  const boundary = await corners(list.locator('[data-slot=select-group]'));
  expect(await corners(options.first())).toEqual([boundary[0], boundary[1], '0px', '0px']);
  expect(await corners(options.nth(1))).toEqual(['0px', '0px', '0px', '0px']);
  expect(await corners(options.last())).toEqual(['0px', '0px', boundary[2], boundary[3]]);
  await page.keyboard.press('End');
  await expect(options.last()).toHaveAttribute('data-highlighted', '');
  await expect(options.last()).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(trigger).toContainText('Perusahaan 35');
  await expect(trigger).toBeFocused();
  expect(errors).toEqual([]);
});

test('dynamic, hidden, disabled, single and square rows inherit asymmetric boundaries without measuring DOM', async ({
  page,
}) => {
  await workspace(page);
  await page.evaluate(() => {
    const root = document.createElement('div');
    root.id = 'hover-contract';
    root.dataset.hoverList = '';
    root.style.cssText =
      'border-radius:24px 16px 12px 8px; width:280px; position:fixed; top:100px; right:20px; background:var(--popover);';
    root.innerHTML =
      '<div data-hover-group><button data-hover-item disabled>Disabled first</button><button data-hover-item>Middle</button><button data-hover-item>Last</button></div>';
    document.body.append(root);
  });
  const root = page.locator('#hover-contract');
  const rows = root.locator('button');
  expect(await corners(rows.nth(0))).toEqual(['24px', '16px', '0px', '0px']);
  expect(await corners(rows.nth(1))).toEqual(['0px', '0px', '0px', '0px']);
  expect(await corners(rows.nth(2))).toEqual(['0px', '0px', '12px', '8px']);
  await rows.first().evaluate((element) => {
    element.setAttribute('hidden', '');
  });
  expect(await corners(rows.nth(1))).toEqual(['24px', '16px', '0px', '0px']);
  await rows.last().evaluate((element) => element.remove());
  expect(await corners(rows.nth(1))).toEqual(['24px', '16px', '12px', '8px']);
  // A positioned Radix submenu wrapper occupies no row space and must not
  // remove the last trigger's bottom corners when the submenu opens.
  await root.locator('[data-hover-group]').evaluate((element) => {
    const popup = document.createElement('div');
    popup.setAttribute('data-radix-popper-content-wrapper', '');
    popup.style.position = 'fixed';
    element.append(popup);
  });
  expect(await corners(rows.nth(1))).toEqual(['24px', '16px', '12px', '8px']);
  await root.evaluate((element) => {
    element.style.borderRadius = '0px';
  });
  expect(await corners(rows.nth(1))).toEqual(['0px', '0px', '0px', '0px']);
  // An inset inner boundary uses the actual reduced radius and propagates it.
  await root.evaluate((element) => {
    element.style.borderRadius = '24px';
    element.style.padding = '4px';
    const group = element.querySelector<HTMLElement>('[data-hover-group]');
    if (group) {
      group.removeAttribute('data-hover-group');
      group.dataset.hoverList = '';
      group.style.borderRadius = '20px';
    }
  });
  expect(await corners(rows.nth(1))).toEqual(['20px', '20px', '20px', '20px']);
});

test('table hover and keyboard focus preserve square inner rows and standalone button geometry', async ({
  page,
}) => {
  await workspace(page);
  const card = page.locator('.activity-panel').filter({ hasText: 'Invoice terbaru' });
  const rows = card.locator('[data-slot=table-body] > tr');
  await expect(rows).toHaveCount(3);
  const row = rows.nth(1);
  const detail = row.getByRole('button', { name: 'Detail HOVER-2', exact: true });
  const before = await corners(detail);
  await detail.hover();
  expect(await corners(detail)).toEqual(before);
  expect(await corners(row)).toEqual(['0px', '0px', '0px', '0px']);
  const hoverBackground = await row.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.getByRole('heading', { name: /^Selamat / }).hover();
  await row.getByRole('button', { name: 'HOVER-2', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(detail).toBeFocused();
  expect(await row.evaluate((element) => getComputedStyle(element).backgroundColor)).toEqual(
    hoverBackground,
  );
  expect(await detail.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  expect(await detail.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  expect(await corners(detail)).toEqual(before);
  await card.screenshot({ path: 'tmp/dynamic-hover-table.png' });
});

test('invoice filters and calendar day/range hover use their own geometry', async ({ page }) => {
  const errors = await workspace(page);
  await page.getByRole('link', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  const status = page.getByRole('combobox', { name: 'Status invoice', exact: true });
  await status.click();
  const list = page.getByRole('listbox');
  const options = list.getByRole('option');
  const radius = await innerCorners(list);
  expect(await corners(options.first())).toEqual([radius[0], radius[1], '0px', '0px']);
  expect(await corners(options.nth(1))).toEqual(['0px', '0px', '0px', '0px']);
  expect(await corners(options.last())).toEqual(['0px', '0px', radius[2], radius[3]]);
  await expectPopupGutter(list, options.last());
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Periode upload', exact: true }).click();
  const calendar = page.locator('[data-slot=calendar]');
  const days = calendar.locator('button[data-day]');
  await expect(days.nth(10)).toBeVisible();
  const day = days.nth(10);
  const cellRadius = await day.evaluate((element) => {
    if (!element.parentElement) throw new Error('Day has no cell');
    return getComputedStyle(element.parentElement).borderRadius;
  });
  await day.hover();
  expect(await day.evaluate((element) => getComputedStyle(element).borderRadius)).toEqual(
    cellRadius,
  );
  await day.click();
  await days.nth(13).click();
  const middle = calendar.locator('[data-range-middle=true]');
  await expect(middle.first()).toBeVisible();
  await middle.first().hover();
  expect(await corners(middle.first())).toEqual(['0px', '0px', '0px', '0px']);
  expect(
    await calendar
      .locator('tbody tr')
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe('rgba(0, 0, 0, 0)');
  expect(errors).toEqual([]);
});
