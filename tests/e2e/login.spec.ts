import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('logo and copy enter from the left once and settle without replaying', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const story = page.getByRole('region', { name: 'Tentang intgrte' });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = 350;
    }
  });
  await page.screenshot({
    path: '../../docs/screenshots/login-animation-background.png',
    animations: 'allow',
  });
  const motion = await story.evaluate((element) => {
    const targets = [
      element.querySelector('a')!,
      element.querySelector('[data-slot="login-copy"]')!,
    ];
    return {
      background: getComputedStyle(element.parentElement!).backgroundImage,
      storyBackground: getComputedStyle(element).backgroundColor,
      stationary:
        element.getAnimations().length === 0 &&
        element.lastElementChild!.getAnimations().length === 0,
      frames: targets.map((target) => {
        const animation = target.getAnimations()[0];
        if (!animation) throw new Error('Brand content animation was not found');
        const duration = Number(animation.effect!.getTiming().duration);
        animation.currentTime = 0;
        const start = new DOMMatrix(getComputedStyle(target).transform).m41;
        animation.currentTime = duration / 2;
        const middle = new DOMMatrix(getComputedStyle(target).transform).m41;
        animation.finish();
        return {
          duration,
          start,
          middle,
          end: new DOMMatrix(getComputedStyle(target).transform).m41,
        };
      }),
    };
  });
  expect(motion.background).not.toBe('none');
  expect(motion.storyBackground).toBe('rgba(0, 0, 0, 0)');
  expect(motion.stationary).toBe(true);
  for (const frame of motion.frames) {
    expect(frame.duration).toBe(1200);
    expect(frame.start).toBeLessThan(0);
    expect(frame.middle).toBeGreaterThan(frame.start);
    expect(frame.middle).toBeLessThanOrEqual(0);
    expect(frame.end).toBe(0);
  }
  await page.getByLabel('Email', { exact: true }).fill('motion-ui@example.test');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  expect(await story.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  );
});

test('login panel slides in once without page overflow or replaying on form changes', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Selamat datang!' });
  await expect(panel).toBeVisible();
  const frames = await panel.evaluate((element) => {
    const animation = element
      .getAnimations()
      .find((value) => value.effect instanceof KeyframeEffect && value.effect.target === element);
    if (!animation) throw new Error('Login entrance animation was not found');
    const duration = Number(animation.effect!.getTiming().duration);
    animation.pause();
    animation.currentTime = 0;
    const start = new DOMMatrix(getComputedStyle(element).transform).m41;
    const fits = document.documentElement.scrollWidth <= innerWidth;
    animation.currentTime = duration / 2;
    const middle = new DOMMatrix(getComputedStyle(element).transform).m41;
    animation.finish();
    return {
      duration,
      start,
      middle,
      fits,
      end: new DOMMatrix(getComputedStyle(element).transform).m41,
    };
  });
  expect(frames.duration).toBe(1200);
  expect(frames.start).toBeGreaterThan(0);
  expect(frames.middle).toBeGreaterThanOrEqual(0);
  expect(frames.middle).toBeLessThan(frames.start);
  expect(frames.end).toBe(0);
  expect(frames.fits).toBe(true);
  await page.getByLabel('Email', { exact: true }).fill('animation-ui@example.test');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await page.getByText('Connecting What Matters.', { exact: true }).click();
  expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test('keyboard focus settles the login panel without replaying after blur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Selamat datang!' });
  await panel.evaluate((element) => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error('Login animation was not found');
    animation.pause();
    animation.currentTime = 100;
  });
  await page.getByLabel('Email', { exact: true }).focus();
  expect(await panel.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await page.getByText('Connecting What Matters.', { exact: true }).click();
  expect(await panel.evaluate((element) => element.getAnimations().length)).toBe(0);
});

test('reduced motion shows the login panel immediately on mobile', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Selamat datang!' });
  await expect(panel).toBeVisible();
  for (const region of [panel, page.getByRole('region', { name: 'Tentang intgrte' })]) {
    const state = await region.evaluate((element) => ({
      animations: element.getAnimations({ subtree: true }).length,
      opacity: getComputedStyle(element).opacity,
      transform: getComputedStyle(element).transform,
      fits: document.documentElement.scrollWidth <= innerWidth,
    }));
    expect(state).toEqual({ animations: 0, opacity: '1', transform: 'none', fits: true });
  }
});

test('intgrte login explains the platform and fits desktop, tablet and mobile', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('intgrte — Connecting What Matters.');
  const story = page.getByRole('region', { name: 'Tentang intgrte' });
  await expect(story.getByRole('img', { name: 'intgrte', exact: true })).toBeVisible();
  await expect(story.locator('image')).toHaveAttribute('href', '/branding/intgrte-white.png');
  await expect(story).toContainText(
    'Internal Network for Transactions, Governance, Reporting, Tracking & Efficiency.',
  );
  await expect(page.getByRole('form', { name: 'Masuk ke intgrte' })).toBeVisible();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const email = await page.getByLabel('Email', { exact: true }).boundingBox();
    const storyBox = await story.boundingBox();
    expect(email).toBeTruthy();
    expect(storyBox).toBeTruthy();
    if (width > 760) expect(email!.x).toBeGreaterThan(storyBox!.x + storyBox!.width);
    else expect(email!.y).toBeGreaterThan(storyBox!.y + storyBox!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `../../docs/screenshots/login-intgrte-${width === 1440 ? 'desktop' : 'mobile'}.png`,
        fullPage: true,
      });
  }
});

test('login retains password reveal, pending state and accessible error feedback', async ({
  page,
}) => {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  let release: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  await page.route(`${api}/api/auth/sign-in/email`, async (route) => {
    attempts++;
    await waiting;
    await route.fulfill({
      status: 401,
      json: { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid credentials' },
    });
  });
  await page.goto('/');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  const value = randomUUID();
  await email.fill('login-ui@example.test');
  await password.fill(value);
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue(value);
  await page.getByRole('button', { name: 'Sembunyikan password' }).click();
  await password.press('Enter');
  await expect(page.getByRole('button', { name: 'Sedang masuk...' })).toBeDisabled();
  await expect(email).toBeDisabled();
  await expect(password).toBeDisabled();
  release();
  await expect(
    page.getByRole('form', { name: 'Masuk ke intgrte' }).getByRole('alert'),
  ).toContainText('Email atau password tidak sesuai');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-describedby', 'login-error');
  await expect(password).toHaveValue(value);
  await expect(page.getByRole('button', { name: 'Masuk', exact: true })).toBeEnabled();
  expect(attempts).toBe(1);
});
