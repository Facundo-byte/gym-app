import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4175'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    timezoneId: 'America/Argentina/Buenos_Aires',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'tablet', testMatch: 'journey.spec.js', use: { viewport: { width: 768, height: 900 } } },
    { name: 'compact-desktop', testMatch: 'journey.spec.js', use: { viewport: { width: 1024, height: 900 } } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4175 --strictPort',
    url: `${baseURL}/exercises`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
