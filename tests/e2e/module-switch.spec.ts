import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
for (const mobile of [false, true]) {
  test(`module selection and dashboard navigation ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / }),
    ).toBeVisible();
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    const switcher = page.getByRole('button', { name: 'Pilih modul: Easy Recap' });
    await switcher.click();
    await expect(page.getByRole('menu', { name: 'Modul platform' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(switcher).toBeFocused();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await switcher.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: /Easy Recap/ })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitemradio', { name: /Command/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Dashboard eksekutif' })).toBeVisible();
    await expect(page.getByText('Coming soon', { exact: true })).toBeVisible();
    await expect(page.locator('.dashboard-toolbar')).toHaveCount(0);
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await expect(page.locator('.sidebar > nav').first().getByRole('link')).toHaveCount(1);
    await expect(
      page.locator('.sidebar > nav').first().getByRole('link', { name: 'Dashboard' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Pilih modul: Command' }).click();
    await page.getByRole('menuitemradio', { name: /Easy Recap/ }).click();
    await expect(
      page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / }),
    ).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ringkasan eksekutif' })).toHaveCount(0);
    if (mobile)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
  });
}
