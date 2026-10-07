import { defineConfig } from '@playwright/test'
import base from './playwright.config.js'

const baseURL = 'http://127.0.0.1:4176'
export default defineConfig({
  ...base,
  testDir: './e2e/auth', testIgnore: [], outputDir: 'auth-test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-auth-report' }]],
  use: { ...base.use, baseURL },
  projects: base.projects.slice(0, 2),
  webServer: {
    command: 'npm run build -- --outDir .auth-test-dist && npm run preview -- --outDir .auth-test-dist --host 127.0.0.1 --port 4176 --strictPort',
    url: `${baseURL}/login`, reuseExistingServer: false, timeout: 30_000,
    env: { VITE_SUPABASE_URL: 'https://account-fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture' },
  },
})
