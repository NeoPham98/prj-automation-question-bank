import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.BASE_URL || 'https://playwright.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /tests[\\/]qb[\\/].*/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /tests[\\/]qb[\\/].*/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /tests[\\/]qb[\\/].*/,
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
      testIgnore: /tests[\\/]qb[\\/].*/,
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 14'] },
      testIgnore: /tests[\\/]qb[\\/].*/,
    },
    {
      name: 'qb-setup',
      testMatch: /tests[\\/]qb[\\/]global-setup\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.QB_BASE_URL || 'https://question-bank-dev.gkebooks.click',
        locale: 'vi-VN',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    },
    {
      name: 'qb',
      testMatch: /tests[\\/]qb[\\/]specs[\\/].*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.QB_BASE_URL || 'https://question-bank-dev.gkebooks.click',
        storageState: '.auth/admin.json',
        locale: 'vi-VN',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      dependencies: ['qb-setup'],
    },
  ],
  outputDir: 'test-results/',
});
