// "Create News" must only be offered to roles that the API allows to create news
// (Create_News_Button). Runs like qa-smoke.spec.ts: `ng serve` on :4200 and a QA API (never production).
import { test, expect, Page } from '@playwright/test';

const APP = process.env.QA_APP ?? 'http://localhost:4200';
const QA_API = process.env.QA_API_ORIGIN ?? 'http://localhost:60490';
const PASSWORD = process.env.QA_PASSWORD ?? '';
const ADMIN = process.env.QA_ADMIN_EMAIL ?? 'rilaga2403@deapad.com';
const EMPLOYEE = process.env.QA_EMPLOYEE_EMAIL ?? 'lacreirahouffeu-5280@yopmail.com';

async function loginAs(page: Page, email: string) {
  await page.route('http://localhost:60486/**', r => r.continue({ url: r.request().url().replace('http://localhost:60486', QA_API) }));
  await page.goto(`${APP}/login`);
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(2500);
}

test.beforeEach(() => {
  test.skip(!PASSWORD, 'QA_PASSWORD not set');
});

test('employee without Create_News_Button gets no Create News link and is sent to 403', async ({ page }) => {
  await loginAs(page, EMPLOYEE);
  await expect(page.locator('.nav-sub-item', { hasText: 'Create News' })).toHaveCount(0);
  await page.goto(`${APP}/news/create-news`);
  await page.waitForURL(/\/403$/, { timeout: 15000 });
});

test('admin still sees Create News and can open the page', async ({ page }) => {
  await loginAs(page, ADMIN);
  await page.locator('.nav-group-header', { hasText: 'News' }).click();
  await expect(page.locator('.nav-sub-item', { hasText: 'Create News' })).toBeVisible();
  await page.goto(`${APP}/news/create-news`);
  await page.waitForTimeout(3000);
  expect(page.url()).toContain('/news/create-news');
});
