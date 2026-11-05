// UI shell regression test: sidebar navigation, collapsible rail + flyouts, Ctrl+K search,
// breadcrumbs, profile menu, dialogs and the mobile drawer.
// Runs like qa-smoke.spec.ts: `ng serve` on :4200 and a QA API (never production).
// Set SHOTS_DIR to also save screenshots of each step.
import { test, expect, Page } from '@playwright/test';

const APP = process.env.QA_APP ?? 'http://localhost:4200';
const QA_API = process.env.QA_API_ORIGIN ?? 'http://localhost:60490';
const ADMIN = { email: process.env.QA_ADMIN_EMAIL ?? 'rilaga2403@deapad.com', password: process.env.QA_PASSWORD ?? '' };
const OUT = process.env.SHOTS_DIR;

async function shot(page: Page, name: string) {
  if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` });
}

async function wire(page: Page) {
  await page.route('http://localhost:60486/**', r => r.continue({ url: r.request().url().replace('http://localhost:60486', QA_API) }));
}

async function login(page: Page) {
  await page.goto(`${APP}/login`);
  await page.waitForTimeout(1500);
  await shot(page, `i-login-${page.viewportSize()!.width}`);
  await page.locator('input[type="email"], input[formcontrolname="email"]').first().fill(ADMIN.email);
  await page.locator('input[type="password"]').first().fill(ADMIN.password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 });
}

test.beforeEach(() => {
  test.skip(!ADMIN.password, 'QA_PASSWORD not set');
});

test('desktop shell interactions', async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await wire(page);
  await login(page);

  await page.goto(`${APP}/attendance/team-attendance`);
  await page.waitForTimeout(3500);
  await shot(page, 'i-team-attendance');

  // Sub-item click navigates and stays highlighted
  await page.locator('.nav-sub-item', { hasText: 'Shifts' }).click();
  await page.waitForURL(/attendance\/shift/);
  await expect(page.locator('.nav-sub-item.active')).toContainText('Shifts');

  // Ctrl+K opens search, typing filters, Enter navigates
  await page.keyboard.press('Control+k');
  await page.locator('.search-input').fill('leave types');
  await page.waitForTimeout(300);
  await shot(page, 'i-search');
  await page.keyboard.press('Enter');
  await page.waitForURL(/leave\/types/);
  await expect(page.locator('.breadcrumbs .crumb.current')).toHaveText('Leave Types');

  // Profile menu
  await page.locator('.user-menu-button-pic').click();
  await page.waitForTimeout(400);
  await shot(page, 'i-user-menu');
  await page.keyboard.press('Escape');

  // Collapse to rail, open a flyout, navigate from it
  await page.locator('app-header .menu-button').click();
  await page.waitForTimeout(500);
  await page.locator('.rail-item[aria-label="Payroll"]').click();
  await page.waitForTimeout(400);
  await shot(page, 'i-rail-flyout');
  await page.locator('.rail-menu .mat-mdc-menu-item', { hasText: 'Loans' }).first().click();
  await page.waitForURL(/payroll\/loans/);
  await expect(page.locator('.rail-item.active[aria-label="Payroll"]')).toBeVisible();

  // Collapsed state survives a reload, then expand again
  await page.reload();
  await page.waitForTimeout(3000);
  await expect(page.locator('.nav-rail')).toBeVisible();
  await page.locator('app-header .menu-button').click();
  await expect(page.locator('.nav-section-label').first()).toBeVisible();

  await page.goto(`${APP}/profile`);
  await page.waitForTimeout(3000);
  await shot(page, 'i-profile');

  // Dialogs: open, screenshot, close without saving
  await page.goto(`${APP}/employees/departments`);
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Add Department/i }).first().click();
  await page.waitForTimeout(800);
  await shot(page, 'i-dialog-department');
  await page.locator('mat-dialog-container').getByRole('button', { name: /Cancel/i }).click();
  await expect(page.locator('mat-dialog-container')).toHaveCount(0);

  await page.goto(`${APP}/leave/dashboard`);
  await page.waitForTimeout(3000);
  await page.getByRole('button', { name: /Request Leave/i }).first().click();
  await page.waitForTimeout(800);
  await shot(page, 'i-dialog-leave');
  await page.locator('mat-dialog-container').getByRole('button', { name: /Cancel/i }).click();
  await expect(page.locator('mat-dialog-container')).toHaveCount(0);

  // Rail flyout near the bottom of the rail
  await page.locator('app-header .menu-button').click();
  await page.waitForTimeout(400);
  await page.locator('.rail-item[aria-label="Settings"]').click();
  await page.waitForTimeout(400);
  await shot(page, 'i-rail-flyout-bottom');
  await page.keyboard.press('Escape');
  await page.locator('app-header .menu-button').click();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('mobile drawer', async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await wire(page);
  await login(page);
  await page.goto(`${APP}/employees`);
  await page.waitForTimeout(3000);
  await page.locator('app-header .menu-button').click();
  await page.waitForTimeout(600);
  await shot(page, 'i-mobile-drawer');
  await page.locator('.nav-group-header', { hasText: 'Leave Management' }).click();
  await page.locator('.nav-sub-item', { hasText: 'My Leaves' }).click();
  await page.waitForURL(/leave\/dashboard/);
  await page.waitForTimeout(800);
  // Drawer closes after navigating
  await expect(page.locator('mat-sidenav.mat-drawer-opened')).toHaveCount(0);
});
