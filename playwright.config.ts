import { defineConfig, devices } from '@playwright/test';

// E2E tests expect `ng serve` on :4200 and a QA API (see e2e/qa-smoke.spec.ts). Never point them at production.
export default defineConfig({
  testDir: './e2e',
  timeout: 600_000,
  retries: 0,
  reporter: [['list']],
  use: { headless: true, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
});
