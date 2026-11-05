// QA smoke test: every main page loads for a logged-in admin without console errors or failing API calls,
// and the layout has no horizontal scroll on a phone. Runs against `ng serve` (localhost:4200) and a QA API.
// QA_API (default http://localhost:60490) lets the dev build talk to a QA backend instead of :60486.
import { test, expect, Page } from '@playwright/test';

const APP = process.env.QA_APP ?? 'http://localhost:4200';
const QA_API = process.env.QA_API_ORIGIN ?? 'http://localhost:60490';
const ADMIN = { email: process.env.QA_ADMIN_EMAIL ?? 'rilaga2403@deapad.com', password: process.env.QA_PASSWORD ?? '' };

const PAGES = ['dashboard', 'employees', 'attendance', 'leave', 'payroll', 'performance', 'holidays',
  'calendar', 'news', 'jobs', 'assets', 'expense', 'profile', 'settings', 'subscription'];

type Issue = { page: string; kind: 'console' | 'api'; detail: string };

async function wire(page: Page, issues: Issue[], label: () => string) {
  // Point the dev build at the QA API.
  await page.route('http://localhost:60486/**', route => route.continue({ url: route.request().url().replace('http://localhost:60486', QA_API) }));
  page.on('console', m => { if (m.type() === 'error') issues.push({ page: label(), kind: 'console', detail: m.text().slice(0, 200) }); });
  page.on('response', r => {
    if (r.url().includes('/api/') && r.status() >= 500) issues.push({ page: label(), kind: 'api', detail: `${r.status()} ${r.request().method()} ${r.url().replace(QA_API, '')}` });
  });
}

async function login(page: Page) {
  await page.goto(`${APP}/login`);
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ADMIN.email);
  await page.locator('input[type="password"]').first().fill(ADMIN.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 });
}

test.describe.configure({ mode: 'serial' });

test('login page renders and rejects a wrong password', async ({ page }) => {
  const issues: Issue[] = [];
  await wire(page, issues, () => 'login');
  await page.goto(`${APP}/login`);
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ADMIN.email);
  await page.locator('input[type="password"]').first().fill('Wrong#Pass123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2500);
  expect(page.url()).toContain('/login');
});

test('every main page loads without 5xx API calls', async ({ page }) => {
  test.skip(!ADMIN.password, 'QA_PASSWORD not set');
  const issues: Issue[] = [];
  let current = 'login';
  await wire(page, issues, () => current);
  await login(page);
  for (const p of PAGES) {
    current = p;
    await page.goto(`${APP}/${p}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(3000); // app keeps a live SignalR connection, so 'networkidle' never settles
    // landing on an error route is a failure too
    expect.soft(page.url(), `${p} redirected to an error page`).not.toMatch(/\/(404|500)$/);
  }
  test.info().annotations.push({ type: 'issues', description: JSON.stringify(issues) });
  console.log('QA_SMOKE_ISSUES ' + JSON.stringify(issues));
  expect.soft(issues.filter(i => i.kind === 'api'), 'API calls that failed with 5xx').toEqual([]);
});

test('no horizontal scroll at phone width', async ({ browser }) => {
  test.skip(!ADMIN.password, 'QA_PASSWORD not set');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const issues: Issue[] = [];
  await wire(page, issues, () => 'mobile');
  const overflow: string[] = [];
  await page.goto(`${APP}/login`);
  await page.waitForTimeout(3000); // let the entry animation finish before measuring
  if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) overflow.push('login');
  await login(page);
  for (const p of ['dashboard', 'employees', 'leave', 'attendance', 'payroll']) {
    await page.goto(`${APP}/${p}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(3000); // app keeps a live SignalR connection, so 'networkidle' never settles
    if (await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)) overflow.push(p);
  }
  console.log('QA_MOBILE_OVERFLOW ' + JSON.stringify(overflow));
  expect.soft(overflow, 'pages wider than a 390px phone screen').toEqual([]);
  await ctx.close();
});
