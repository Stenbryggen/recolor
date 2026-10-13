import { defineConfig } from '@playwright/test';

// Starts the API and the web app (unless they already run) and drives the app in a real browser.
// CHROMIUM_PATH can point to an installed Chromium instead of the one Playwright downloads.
export default defineConfig({
  testDir: './tests',
  // The tests share one API whose data is in memory, so they run one after another.
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  webServer: [
    {
      command: 'npm run start -w backend',
      url: 'http://127.0.0.1:3000/api/v1/health',
      cwd: '..',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -w frontend -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      cwd: '..',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
