import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  workers: 1,
  use: {
    actionTimeout: 15_000,
    baseURL: 'http://127.0.0.1:4173/chiken-simulator/',
    viewport: { width: 844, height: 390 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4173',
    url: 'http://127.0.0.1:4173/chiken-simulator/',
    reuseExistingServer: !process.env.CI,
  },
});
