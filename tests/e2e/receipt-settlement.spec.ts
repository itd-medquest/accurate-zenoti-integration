import { expect, test, type Page } from '@playwright/test';
import type {
  ReceiptDetail,
  ReceiptDraft,
  ReceiptConfiguration,
  ReceiptAmountMode,
  ReceiptMethod,
} from '../../src/features/easyrecap/receipts/types';
import { settlementAmounts } from '../../src/features/easyrecap/receipts/lib/settlement';
import { selectOption } from '../helpers/select-option';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const historyUrl = '/easyrecap/penerimaan-penjualan';
const branch = '00000000-0000-4000-8000-000000000001';
const invoiceId = '00000000-0000-4000-8000-000000000004';
const cardKey = 'a'.repeat(64),
  bankKey = 'b'.repeat(64);

async function settlementFixture(page: Page) {
  const config: ReceiptConfiguration = {
    database: { id: '99', name: 'Test company' },
    banks: ['BCA', 'BNI'],
    methods: ['CREDIT_CARD', 'DEBIT_CARD', 'QRIS', 'BANK_TRANSFER'],
    rounding: 'ceil',
    rates: { CREDIT_CARD: 200, DEBIT_CARD: 180, QRIS: 70, BANK_TRANSFER: 0 },
    destinations: [{ branchId: branch, databaseId: '99', targetBranchId: '300' }],
    mappings: ['CREDIT_CARD', 'BANK_TRANSFER'].map((method, index) => ({
      id: `00000000-0000-4000-8000-00000000000${index + 5}`,
      branchId: branch,
      databaseId: '99',
      bank: 'BCA',
      method: method === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'BANK_TRANSFER',
      accountId: '101',
      accountNo: '110101',
      accountName: 'Test bank',
      feeAccountId: index ? null : '201',
      feeAccountNo: index ? null : '610001',
      feeAccountName: index ? null : 'Test expense',
      version: 1,
    })),
  };
  const stages: (ReceiptDraft & { paymentSourceKey: string })[] = [];
  const saves: { amountMode: ReceiptAmountMode; inputAmount?: number }[] = [];
  const filters: string[] = [];
  let submits = 0;
  const source = (key: string) => ({
    gross: key === cardKey ? 1990000 : 9000,
    method: key === cardKey ? 'card' : 'bank',
  });
  const completed = (key: string) =>
    stages.filter((row) => row.paymentSourceKey === key && row.status === 'SUCCEEDED');
  const settled = (key: string) => completed(key).reduce((sum, row) => sum + row.grossAmount, 0);
  const remaining = (key: string) => source(key).gross - settled(key);
  const invoiceRemaining = () => remaining(cardKey) + remaining(bankKey);
  function prepare(key: string) {
    const existing = stages.find(
      (row) => row.paymentSourceKey === key && row.status !== 'SUCCEEDED',
    );
    if (existing) return existing;
    if (!remaining(key)) return stages.filter((row) => row.paymentSourceKey === key).at(-1);
    const row: (typeof stages)[number] = {
      id: `00000000-0000-4000-8000-${String(stages.length + 10).padStart(12, '0')}`,
      invoiceId,
      branchId: branch,
      databaseId: '99',
      paymentSourceKey: key,
      number:
        'RECEIPT-MULTI' + (stages.length ? '-' + String.fromCharCode(64 + stages.length) : ''),
      receiptSequence: stages.length,
      amountMode: 'FULL',
      inputAmount: null,
      mappingId: null,
      mappingVersion: null,
      bank: null,
      method: null,
      sourceMethod: source(key).method,
      grossAmount: remaining(key),
      rateBps: 0,
      feeAmount: 0,
      netAmount: 0,
      paymentDate: '2026-11-06',
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
    stages.push(row);
    return row;
  }
  await page.route(`${api}/api/**`, async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname.slice(4),
      method = route.request().method();
    const json = (body: unknown, status = 200) => route.fulfill({ json: body, status });
    const user = {
      id: 'test-user',
      name: 'Finance Test',
      email: 'finance@example.test',
      role: 'finance',
      active: true,
    };
    if (path === '/auth/get-session')
      return json({
        session: { id: 'session', userId: user.id, expiresAt: '2099-01-01T00:00:00Z' },
        user,
      });
    if (path === '/me') return json(user);
    if (path === '/branches')
      return json([{ id: branch, name: 'Test company', centerId: 'TEST', active: true }]);
    if (path === '/receipts/configuration') return json(config);
    if (path === '/receipts/drafts') return json(prepare(route.request().postDataJSON().sourceKey));
    if (path === '/receipts') {
      filters.push(url.searchParams.get('status') ?? '');
      const partial = settled(cardKey) + settled(bankKey) > 0 && invoiceRemaining() > 0;
      const status = !invoiceRemaining()
        ? 'SUCCEEDED'
        : partial
          ? 'PARTIAL'
          : stages.length
            ? 'DRAFT'
            : 'TO_REVIEW';
      return json({
        items: [
          {
            invoiceId,
            invoiceNumber: 'INV-MULTI',
            customer: 'Test customer',
            branchId: branch,
            branchName: 'Test company',
            sourceKey: cardKey,
            sourceMethod: 'mixed',
            paidAt: '2026-11-06T00:00:00+07:00',
            gross: 1999000,
            paymentCount: 2,
            grouped: false,
            status,
            draft: stages.at(-1) ?? null,
            error: null,
            settlement: {
              gross: 1999000,
              settled: 1999000 - invoiceRemaining(),
              remaining: invoiceRemaining(),
              paymentCount: 2,
            },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
        summary: {
          review: stages.length ? 0 : 1,
          draft: 0,
          processing: 0,
          succeeded: invoiceRemaining() ? 0 : 1,
          attention: 0,
          partial: partial ? 1 : 0,
        },
      });
    }
    const row = stages.find(
      (entry) => path === '/receipts/' + entry.id || path === '/receipts/' + entry.id + '/submit',
    );
    if (!row) return json({}, 404);
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      const mapping = config.mappings.find((entry) => entry.id === body.mappingId);
      if (!mapping) throw new Error('Missing test mapping');
      const previous = completed(row.paymentSourceKey);
      const values = settlementAmounts({
        remaining: remaining(row.paymentSourceKey),
        rateBps: config.rates[mapping.method],
        mode: body.amountMode,
        amount: body.inputAmount,
        priorGross: previous.reduce((sum, entry) => sum + entry.grossAmount, 0),
        priorFee: previous.reduce((sum, entry) => sum + entry.feeAmount, 0),
      });
      saves.push(body);
      Object.assign(row, body, {
        version: row.version + 1,
        bank: 'BCA',
        method: mapping.method,
        grossAmount: values.gross,
        feeAmount: values.fee,
        netAmount: values.net,
        rateBps: values.rateBps,
        bankAccountNo: mapping.accountNo,
        bankAccountName: mapping.accountName,
        feeAccountNo: mapping.feeAccountNo,
        feeAccountName: mapping.feeAccountName,
      });
      return json(row);
    }
    if (path.endsWith('/submit')) {
      submits++;
      Object.assign(row, {
        status: 'SUCCEEDED',
        targetNumber: row.number,
        targetId: String(900 + stages.length),
        version: row.version + 1,
      });
      return json(row);
    }
    const key = row.paymentSourceKey,
      state = source(key);
    const prior = completed(key).filter((entry) => entry.id !== row.id);
    const feeFor = (method: ReceiptMethod) => ({
      gross: prior
        .filter((entry) => entry.method === method)
        .reduce((sum, entry) => sum + entry.grossAmount, 0),
      fee: prior
        .filter((entry) => entry.method === method)
        .reduce((sum, entry) => sum + entry.feeAmount, 0),
    });
    const data: ReceiptDetail = {
      draft: row,
      receiptNumber: row.number,
      invoice: { number: 'INV-MULTI', customer: 'Test customer', total: 1999000 },
      source: {
        key,
        receiptNumber: row.number,
        method: state.method,
        paidAt: '2026-11-06T00:00:00+07:00',
        gross: state.gross,
        grouped: false,
        payments: [
          {
            id: key,
            method: state.method,
            amount: state.gross,
            paidAt: '2026-11-06T00:00:00+07:00',
          },
        ],
      },
      configuration: config,
      validation: { editable: true, message: null },
      delivery: { enabled: true, message: '' },
      balance: { outstanding: invoiceRemaining(), checkedAt: '2026-11-25T02:00:00Z' },
      actions: {
        canSetNumber: false,
        canCheck: false,
        canReopen: false,
        canContinue: row.status === 'SUCCEEDED' && remaining(key) > 0,
      },
      settlement: {
        available: state.gross - prior.reduce((sum, entry) => sum + entry.grossAmount, 0),
        settled: settled(key),
        remaining: remaining(key),
        invoiceGross: 1999000,
        invoiceSettled: 1999000 - invoiceRemaining(),
        invoiceRemaining: invoiceRemaining(),
        payments: [cardKey, bankKey].map((paymentKey) => ({
          key: paymentKey,
          ...source(paymentKey),
          paidAt: '2026-11-06T00:00:00+07:00',
          settled: settled(paymentKey),
          remaining: remaining(paymentKey),
          receiptId:
            stages.filter((entry) => entry.paymentSourceKey === paymentKey).at(-1)?.id ?? null,
        })),
        history: stages
          .filter((entry) => entry.paymentSourceKey === key)
          .map((entry) => ({
            id: entry.id,
            number: entry.number,
            gross: entry.grossAmount,
            fee: entry.feeAmount,
            net: entry.netAmount,
            method: entry.method,
            status: entry.status,
            paymentDate: entry.paymentDate,
            error: null,
          })),
        feeBasis: {
          CREDIT_CARD: feeFor('CREDIT_CARD'),
          DEBIT_CARD: feeFor('DEBIT_CARD'),
          QRIS: feeFor('QRIS'),
          BANK_TRANSFER: feeFor('BANK_TRANSFER'),
        },
      },
    };
    return json(data);
  });
  return { saves, filters, stages, config, submits: () => submits };
}

for (const mobile of [false, true])
  test(`multiple payments settle in stages with net/gross input, immutable history and pending status ${mobile ? 'mobile' : 'desktop'}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const fixture = await settlementFixture(page);
    await page.setViewportSize({ width: mobile ? 390 : 1500, height: mobile ? 844 : 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(historyUrl);
    await page.getByRole('button', { name: 'Review', exact: true }).click();
    const paymentPicker = page.getByRole('combobox', { name: 'Pilih pembayaran', exact: true });
    await expect(paymentPicker).toBeVisible();
    await expect(paymentPicker).toContainText('1. Kartu');
    await expect(page.getByText('Pembayaran pada faktur', { exact: true })).toHaveCount(0);
    const summary = page.getByRole('region', { name: 'Ringkasan penerimaan', exact: true });
    const workspace = page.getByRole('main', { name: 'Konten ruang kerja', exact: true });
    if (!mobile) {
      const title = await page
        .getByRole('heading', { name: 'Rincian pembayaran', exact: true })
        .boundingBox();
      const picker = await paymentPicker.boundingBox();
      if (!title || !picker) throw new Error('Payment header is missing');
      expect(Math.abs(title.y + title.height / 2 - picker.y - picker.height / 2)).toBeLessThan(3);
      await workspace.evaluate((element) => {
        element.scrollTop = 450;
      });
      await expect
        .poll(async () => {
          const card = await summary.boundingBox(),
            main = await workspace.boundingBox();
          const inset = await workspace.evaluate((element) =>
            parseFloat(getComputedStyle(element).paddingTop),
          );
          return card && main ? Math.abs(card.y - main.y - inset - 20) : Infinity;
        })
        .toBeLessThan(3);
      const pinned = await summary.boundingBox();
      await workspace.evaluate((element) => {
        element.scrollTop = 550;
      });
      await expect
        .poll(async () => {
          const card = await summary.boundingBox();
          return card && pinned ? Math.abs(card.y - pinned.y) : Infinity;
        })
        .toBeLessThan(3);
    } else {
      await expect
        .poll(() => summary.evaluate((element) => getComputedStyle(element).position))
        .toBe('static');
    }
    await selectOption(
      page.getByLabel('Bank dan metode pembayaran', { exact: true }),
      fixture.config.mappings[0].id,
    );
    await page.getByLabel('Catat nominal aktual / penerimaan sebagian', { exact: true }).check();
    await page.getByLabel('Dana bersih masuk rekening', { exact: true }).fill('975100');
    await expect(page.getByLabel('Dana bersih masuk rekening', { exact: true })).toHaveValue(
      '975.100',
    );
    await page.getByLabel('Referensi pembayaran', { exact: true }).fill('BANK-REF-1');
    await selectOption(paymentPicker, bankKey);
    await expect(page.getByRole('alertdialog')).toContainText('Ada perubahan yang belum disimpan');
    await page.getByRole('button', { name: 'Lanjutkan review', exact: true }).click();
    await expect(paymentPicker).toContainText('1. Kartu');
    await expect(page.getByLabel('Dana bersih masuk rekening', { exact: true })).toHaveValue(
      '975.100',
    );
    await page.getByLabel('Dana bersih masuk rekening', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `tmp/receipt-actual-input-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
    await expect.poll(() => fixture.saves.length).toBe(1);
    expect(fixture.saves[0].inputAmount).toBe(975100);
    expect(fixture.saves[0].amountMode).toBe('NET');
    async function submit() {
      await page.getByLabel(/Saya telah memeriksa sumber/).check();
      await page.getByRole('button', { name: 'Kirim ke Accurate', exact: true }).click();
      await expect(page.getByRole('alertdialog')).toContainText('Rp 995.000');
      await page.getByRole('button', { name: 'Ya, kirim penerimaan', exact: true }).click();
    }
    await submit();
    await expect(
      page.getByRole('button', { name: 'Catat penerimaan berikutnya', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Dana bersih masuk rekening', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Bank dan metode pembayaran', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Kembali ke riwayat', exact: true }).click();
    await page.getByRole('button', { name: 'Filter Diterima sebagian', exact: true }).click();
    await expect.poll(() => fixture.filters.at(-1)).toBe('PARTIAL');
    await expect(page.getByRole('table')).toContainText('Diterima sebagian');
    await page.getByRole('button', { name: 'Buka', exact: true }).click();
    await page.getByRole('button', { name: 'Catat penerimaan berikutnya', exact: true }).click();
    await expect(page.getByText('RECEIPT-MULTI-A', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Buka RECEIPT-MULTI', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Buka RECEIPT-MULTI-A', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Buka RECEIPT-MULTI-A', exact: true }).click();
    await expect(page.getByLabel('Bank dan metode pembayaran', { exact: true })).toBeEnabled();
    await selectOption(
      page.getByLabel('Bank dan metode pembayaran', { exact: true }),
      fixture.config.mappings[0].id,
    );
    await page.getByLabel('Catat nominal aktual / penerimaan sebagian', { exact: true }).check();
    await page.getByLabel('Dana bersih masuk rekening', { exact: true }).fill('1990000');
    await expect(page.getByRole('button', { name: 'Simpan draft', exact: true })).toBeDisabled();
    await selectOption(page.getByLabel('Nominal yang dimasukkan', { exact: true }), 'GROSS');
    await page.getByLabel('Nominal sebelum fee', { exact: true }).fill('995000');
    await page.getByLabel('Referensi pembayaran', { exact: true }).fill('BANK-REF-2');
    await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
    await expect.poll(() => fixture.saves.length).toBe(2);
    await submit();
    await selectOption(paymentPicker, bankKey);
    await expect(paymentPicker).toBeFocused();
    await expect(paymentPicker).toContainText('2. Transfer bank');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByText('RECEIPT-MULTI-B', { exact: true }).first()).toBeVisible();
    await selectOption(
      page.getByLabel('Bank dan metode pembayaran', { exact: true }),
      fixture.config.mappings[1].id,
    );
    await page.getByLabel('Referensi pembayaran', { exact: true }).fill('BANK-REF-3');
    await page.getByRole('button', { name: 'Simpan draft', exact: true }).click();
    await expect.poll(() => fixture.saves.length).toBe(3);
    await page.getByLabel(/Saya telah memeriksa sumber/).check();
    await page.getByRole('button', { name: 'Kirim ke Accurate', exact: true }).click();
    await expect(page.getByRole('alertdialog')).toContainText('Rp 9.000');
    await page.getByRole('button', { name: 'Ya, kirim penerimaan', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Catat penerimaan berikutnya', exact: true }),
    ).toHaveCount(0);
    await paymentPicker.click();
    await expect(page.getByRole('listbox').getByText('Selesai', { exact: true })).toHaveCount(2);
    await expect(page.getByRole('listbox')).toContainText('Rp 1.990.000');
    await expect(page.getByRole('listbox')).toContainText('Rp 9.000');
    await page.screenshot({
      path: `tmp/receipt-payment-picker-${mobile ? 'mobile' : 'desktop'}.png`,
    });
    await page.keyboard.press('Escape');
    expect(fixture.submits()).toBe(3);
    expect(fixture.stages.reduce((sum, row) => sum + row.grossAmount, 0)).toBe(1999000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `tmp/receipt-settlement-${mobile ? 'mobile' : 'desktop'}.png`,
      fullPage: true,
    });
    if (!mobile) {
      await page.setViewportSize({ width: 1500, height: 600 });
      await workspace.evaluate((element) => {
        element.scrollTop = 450;
      });
      await expect
        .poll(() => summary.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(true);
      const card = await summary.boundingBox(),
        main = await workspace.boundingBox();
      if (!card || !main) throw new Error('Sticky summary is missing');
      expect(card.y).toBeGreaterThanOrEqual(main.y);
      expect(card.y + card.height).toBeLessThanOrEqual(600);
      await summary.focus();
      await page.keyboard.press('End');
      await expect.poll(() => summary.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(summary).toContainText('Penerimaan terverifikasi di Accurate.');
      await page.screenshot({ path: 'tmp/receipt-summary-short-screen.png' });
    }
  });
