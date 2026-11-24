import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Actor } from '../../src/types';

const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

for (const mobile of [false, true]) {
  test(`user deletion confirms, retains failed attempts and updates counts ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1440, height: 1000 });
    await page.goto('/');
    await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Masuk', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: /^Selamat (pagi|siang|malam) - / }),
    ).toBeVisible();
    const actor: Actor = await (await page.request.get(`${api}/api/me`)).json();
    const target: Actor = {
      id: 'test-delete-user',
      name: 'Pengguna Uji Hapus',
      email: 'delete-ui@example.test',
      role: 'finance',
      active: true,
    };
    let attempts = 0;
    let releaseDelete: () => void = () => {};
    const waiting = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    await page.route(`${api}/api/users`, (route) => route.fulfill({ json: [actor, target] }));
    await page.route(`${api}/api/users/${target.id}`, async (route) => {
      expect(route.request().method()).toBe('DELETE');
      attempts++;
      if (attempts === 1) {
        await route.fulfill({
          status: 409,
          json: {
            error: 'Pengguna memiliki riwayat upload. Nonaktifkan akun melalui Edit pengguna.',
          },
        });
      } else {
        await waiting;
        await route.fulfill({ json: { ok: true } });
      }
    });
    if (mobile) await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await page.getByRole('link', { name: 'User Management', exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Hapus pengguna ${actor.name}`, exact: true }),
    ).toBeDisabled();
    const trigger = page.getByRole('button', {
      name: `Hapus pengguna ${target.name}`,
      exact: true,
    });
    const modal = page.getByRole('alertdialog', { name: 'Hapus pengguna?' });
    await trigger.click();
    await expect(modal).toContainText(target.email);
    await expect(modal).toContainText('tidak dapat dibatalkan');
    await modal.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modal).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(attempts).toBe(0);
    await trigger.click();
    await page.screenshot({
      path: `../../docs/screenshots/user-delete-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await modal.getByRole('button', { name: 'Ya, hapus pengguna', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Nonaktifkan akun melalui Edit pengguna.' }),
    ).toBeVisible();
    await expect(modal).toBeVisible();
    await expect(
      page.getByRole('row', { includeHidden: true }).filter({ hasText: target.email }),
    ).toHaveCount(1);
    await modal.getByRole('button', { name: 'Ya, hapus pengguna', exact: true }).click();
    await expect(modal.getByRole('button', { name: 'Menghapus...', exact: true })).toBeDisabled();
    await expect(modal.getByRole('button', { name: 'Batal', exact: true })).toBeDisabled();
    releaseDelete();
    await expect(modal).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: target.email })).toHaveCount(0);
    await expect(page.getByText('1 anggota ruang kerja', { exact: true })).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Pengguna berhasil dihapus.');
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
