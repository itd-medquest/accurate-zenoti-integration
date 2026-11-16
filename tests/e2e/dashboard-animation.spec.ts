import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const env = Object.fromEntries(
  readFileSync(resolve('../backend/.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
async function login(page: Page) {
  await page.addInitScript(() => {
    const events: string[] = [];
    (window as typeof window & { dashboardAnimationEvents: string[] }).dashboardAnimationEvents =
      events;
    document.addEventListener('animationstart', (event) => {
      if (event.animationName.startsWith('dashboard-')) events.push(event.animationName);
    });
  });
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(env.SEED_ADMIN_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(env.SEED_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Masuk', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Aktivitas sinkronisasi', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.trend-chart .recharts-area')).toHaveCount(2);
}
const events = (page: Page) =>
  page.evaluate(
    () =>
      (window as typeof window & { dashboardAnimationEvents: string[] }).dashboardAnimationEvents,
  );
test('dashboard charts animate once and remain still across automatic data refresh', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page);
  await expect.poll(async () => await events(page)).toContain('dashboard-ring-reveal');
  await expect
    .poll(
      async () => (await events(page)).filter((name) => name === 'dashboard-chart-reveal').length,
    )
    .toBe(2);
  await expect
    .poll(() =>
      page
        .locator('.dashboard-main-grid')
        .evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter((animation) =>
                (animation.effect as KeyframeEffect)?.target?.matches(
                  '.recharts-area,.health-ring-arc',
                ),
              ).length,
        ),
    )
    .toBe(0);
  const before = await events(page);
  await page.waitForResponse(
    (response) => response.url().includes('/api/dashboard?') && response.status() === 200,
    { timeout: 12000 },
  );
  await expect(page.locator('.health-ring-arc')).toBeVisible();
  expect(await events(page)).toEqual(before);
  await page.screenshot({ path: '../../docs/screenshots/dashboard-chart-animation.png' });
});
test('reduced motion shows completed charts without entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  expect(await events(page)).toEqual([]);
  await expect(page.locator('.health-ring-arc')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.trend-chart .recharts-area').first()).toHaveCSS(
    'animation-name',
    'none',
  );
  const final = await page.locator('.health-ring-arc').evaluate((element) => ({
    displayed: parseFloat(getComputedStyle(element).strokeDashoffset),
    expected: Number(element.getAttribute('stroke-dashoffset')),
  }));
  expect(final.displayed).toBeCloseTo(final.expected, 5);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
