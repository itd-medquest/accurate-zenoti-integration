import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { receiptPdf } from '../fixtures/receipt-fixture';

test.skip(
  process.env.ACCURATE_MOCK_SERVER !== 'true' || process.env.CUSTOMER_CREATION_FIXTURE !== 'true',
  'Requires isolated Accurate customer fixture; never run against a company database.',
);
test.setTimeout(120000);
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

async function setup(page: Page, mobile: boolean, role = 'super_admin') {
  await page.setViewportSize({ width: mobile ? 390 : 1500, height: mobile ? 844 : 1000 });
  const signIn = await page.request.post(`${api}/api/auth/sign-in/email`, {
    data: {
      email: env.SEED_ADMIN_EMAIL,
      password: env.SEED_ADMIN_PASSWORD,
    },
    headers: { Origin: 'http://localhost:3001' },
  });
  expect(signIn.ok()).toBeTruthy();
  {
    const connection = await page.request.patch(`${api}/api/settings/accurate`, {
      data: {
        enabled: true,
        accurate: {
          mode: 'live',
          apiToken: 'customer-browser-token',
          signatureSecret: 'customer-browser-secret',
        },
      },
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(connection.ok()).toBeTruthy();
    const destination = await page.request.put(`${api}/api/accurate/destinations/branch-jakarta`, {
      data: { targetBranchId: '300' },
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(destination.ok()).toBeTruthy();
  }
  if (role !== 'super_admin') {
    const finance = await page.request.post(`${api}/api/auth/sign-in/email`, {
      data: { email: 'finance@example.test', password: env.SEED_ADMIN_PASSWORD },
      headers: { Origin: 'http://localhost:3001' },
    });
    expect(finance.ok()).toBeTruthy();
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /^Selamat / })).toBeVisible();
  if (!mobile) await page.getByRole('button', { name: 'Gunakan mode gelap', exact: true }).click();
  if (mobile) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
  await page.getByRole('button', { name: 'Faktur Penjualan (Invoices)', exact: true }).click();
  await page.getByRole('button', { name: 'Upload invoice', exact: true }).click();
  const invoice = `CUSTOMER-${randomUUID().slice(0, 8)}`;
  await page.getByLabel('Pilih file invoice').setInputFiles({
    name: 'anonymous-customer.pdf',
    mimeType: 'application/pdf',
    buffer: receiptPdf(randomUUID(), `${invoice}-RECEIPT`, invoice),
  });
  await page.getByRole('button', { name: 'Upload & buat preview', exact: true }).click();
  await page.getByRole('button', { name: invoice, exact: true }).click();
  const detail = page.getByRole('dialog', {
    name: 'Konfirmasi dan Periksa Invoice sebelum di Submit',
    exact: true,
  });
  const field = detail
    .locator('[data-slot=field]')
    .filter({ has: page.getByText('Customer Accurate', { exact: true }) });
  const edit = field.getByRole('button', { name: 'Ubah Customer Accurate', exact: true });
  if (await edit.isVisible()) await edit.click();
  await field.getByRole('textbox').fill(`Missing Customer ${randomUUID().slice(0, 8)}`);
  await field.getByRole('button', { name: 'Cari', exact: true }).click();
  await expect(field.getByRole('combobox')).toContainText('Tidak ada hasil');
  return { detail, field };
}

for (const mobile of [false, true]) {
  test(`new customer form resolves defaults, preserves failed mapping and retries safely ${mobile ? 'mobile' : 'desktop dark'}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const { detail, field } = await setup(page, mobile);
    await field.getByRole('button', { name: 'Tambah customer', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Tambah customer Accurate', exact: true });
    await expect(form.getByLabel('ID pelanggan', { exact: true })).toHaveValue(/^MPA-\d+$/);
    for (const [label, value] of [
      ['Kategori', 'Astetic'],
      ['Dipakai di cabang', 'PT Mylab Prima Inovatif'],
      ['Mata uang utama', 'Indonesian Rupiah (IDR)'],
      ['Kategori harga', 'Umum'],
      ['Kategori diskon', 'Umum'],
      ['Syarat pembayaran', 'C.O.D'],
    ]) {
      await expect(form.getByLabel(label, { exact: true })).toHaveValue(value);
      await expect(form.getByLabel(label, { exact: true })).toHaveAttribute('readonly', '');
    }
    const name = `Customer Browser ${randomUUID().slice(0, 8)}`;
    await form.getByLabel('Nama customer', { exact: true }).fill(name);
    const customerNo = await form.getByLabel('ID pelanggan', { exact: true }).inputValue();
    expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const save = form.getByRole('button', { name: 'Buat dan gunakan customer', exact: true });
    await expect(save).toBeInViewport();
    mkdirSync(resolve('../../docs/screenshots'), { recursive: true });
    await page.screenshot({
      path: resolve(
        `../../docs/screenshots/customer-create-${mobile ? 'mobile' : 'dark-desktop'}.png`,
      ),
    });
    await save.click();
    const confirmation = page.getByRole('alertdialog', {
      name: 'Buat customer di Accurate?',
      exact: true,
    });
    await expect(confirmation).toContainText(name);
    await confirmation.getByRole('button', { name: 'Kembali', exact: true }).click();
    await expect(form.getByLabel('Nama customer', { exact: true })).toHaveValue(name);
    let creates = 0;
    page.on('request', (request) => {
      if (/\/customer$/.test(request.url()) && request.method() === 'POST') creates++;
    });
    const mapping = /\/api\/accurate\/imports\/[^/]+\/rows\/[^/]+\/mapping$/;
    await page.route(mapping, (route) =>
      route.fulfill({
        status: 409,
        json: { error: 'Mapping gagal untuk pengujian; customer tetap tersimpan.' },
      }),
    );
    await save.click();
    await confirmation.getByRole('button', { name: 'Ya, buat customer', exact: true }).click();
    await expect(
      form.getByText(`Customer ${customerNo} sudah dibuat`, { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByText('Mapping gagal untuk pengujian; customer tetap tersimpan.', { exact: true }),
    ).toBeVisible();
    expect(creates).toBe(1);
    await page.unroute(mapping);
    await form.getByRole('button', { name: 'Gunakan customer', exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(field.getByText(name, { exact: true })).toBeVisible();
    await expect(field.getByText('Tersimpan', { exact: true })).toBeVisible();
    await expect(field.locator('input')).toHaveCount(0);
    expect(creates).toBe(1);
    await expect(detail).toContainText(
      'Konfirmasikan pemeriksaan setelah melengkapi mapping Accurate.',
    );
    expect(errors).toEqual([]);
  });
}

test('customer response lost in browser can be checked without a new request identity', async ({
  page,
}) => {
  const { field } = await setup(page, false);
  await field.getByRole('button', { name: 'Tambah customer', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Tambah customer Accurate', exact: true });
  await expect(form.getByLabel('ID pelanggan', { exact: true })).toHaveValue(/^MPA-\d+$/);
  await form
    .getByLabel('Nama customer', { exact: true })
    .fill(`Recovered Browser ${randomUUID().slice(0, 8)}`);
  const ids: string[] = [];
  let lost = false;
  await page.route(/\/api\/accurate\/imports\/[^/]+\/rows\/[^/]+\/customer$/, async (route) => {
    ids.push(route.request().postDataJSON().requestId);
    const result = await route.fetch();
    if (!lost) {
      lost = true;
      await route.fulfill({
        status: 409,
        json: { error: 'Respons terputus untuk pengujian. Periksa hasil.' },
      });
    } else await route.fulfill({ response: result });
  });
  await form.getByRole('button', { name: 'Buat dan gunakan customer', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Ya, buat customer', exact: true })
    .click();
  await expect(
    form.getByText('Respons terputus untuk pengujian. Periksa hasil.', { exact: true }),
  ).toBeVisible();
  await expect(form.getByLabel('Nama customer', { exact: true })).toHaveAttribute('readonly', '');
  await form.getByRole('button', { name: 'Periksa hasil', exact: true }).click();
  await expect(form).toHaveCount(0);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
test('finance can create and map a customer from empty results without Settings access', async ({ page }) => {
  const { field } = await setup(page, false, 'finance');
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  await field.getByRole('button', { name: 'Tambah customer', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Tambah customer Accurate', exact: true });
  await expect(form.getByLabel('ID pelanggan', { exact: true })).toHaveValue(/^MPA-\d+$/);
  const name = `Finance Customer ${randomUUID().slice(0, 8)}`;
  await form.getByLabel('Nama customer', { exact: true }).fill(name);
  let creates = 0;
  page.on('request', (request) => {
    if (/\/customer$/.test(request.url()) && request.method() === 'POST') creates++;
  });
  await form.getByRole('button', { name: 'Buat dan gunakan customer', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Ya, buat customer', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  await expect(field.getByText(name, { exact: true })).toBeVisible();
  await expect(field.getByText('Tersimpan', { exact: true })).toBeVisible();
  expect(creates).toBe(1);
});
