import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'test-results', 'playwright-report', '.auth-test-dist', '.guest-test-dist', '.pwa-test-dist', 'auth-test-results', 'playwright-auth-report', 'pwa-test-results', 'playwright-pwa-report']),
  {
    files: ['**/*.{js,jsx,mjs}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.test.js', 'e2e/**/*.{js,mjs}', 'playwright*.config.js', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
])
