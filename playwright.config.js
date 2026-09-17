import { defineConfig, devices } from '@playwright/test';

/**
 * Verification harness.
 *
 *   npm run verify            — run every check, headless
 *   npm run verify -- --ui    — interactive runner
 *   npm run shot -- /schedule — screenshot one route into .screenshots/
 *
 * Playwright starts the app itself (API + Vite) via `npm run dev`, so an
 * agent can go from "ticket done" to "proved it works in a browser" with
 * a single command and no manual setup.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  // On CI: inline annotations on the failing line, plus an HTML report the
  // workflow uploads so a red run can be read without reproducing it.
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 90_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
