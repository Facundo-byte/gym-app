import { defineConfig } from '@playwright/test'
import base from './playwright.config.js'

const baseURL = 'http://127.0.0.1:4177'
export default defineConfig({
  ...base,
  testDir: './e2e/pwa', testIgnore: [], outputDir: 'pwa-test-results',
  workers: 1, fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-pwa-report' }]],
  use: { ...base.use, baseURL, serviceWorkers: 'allow' },
  projects: base.projects.slice(0, 2),
  webServer: {
    command: 'npm run build -- --outDir .pwa-test-dist && node e2e/pwa/server.mjs',
    url: `${baseURL}/`, reuseExistingServer: false, timeout: 40_000,
    env: { VITE_SUPABASE_URL: 'https://account-fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture' },
  },
})
