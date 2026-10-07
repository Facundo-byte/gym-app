import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { readCloudConfig } from '../src/services/supabaseClient.js'

// Opt-in real-provider UI check. All sessions use disposable Chromium contexts.
// Run the API smoke first; writes below are restricted to its named test fixture.
const config = readCloudConfig(process.env)
const required = ['FORGE_SMOKE_EMAIL_A', 'FORGE_SMOKE_PASSWORD_A', 'FORGE_SMOKE_EMAIL_B', 'FORGE_SMOKE_PASSWORD_B']
if (!config.configured || required.some((key) => !process.env[key])) {
  process.stderr.write('Live browser check requires public configuration and disposable test credentials.\n')
  process.exit(1)
}
const origin = 'http://127.0.0.1:4173'
const api = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } })
let browser
let stage = 'fixture preflight'
try {
  const { data: session, error: loginError } = await api.auth.signInWithPassword({ email: process.env.FORGE_SMOKE_EMAIL_A, password: process.env.FORGE_SMOKE_PASSWORD_A })
  assert.ok(!loginError && session.user, 'Test account A must accept its credentials.')
  const { data: row, error } = await api.from('forge_documents').select('document').eq('owner_id', session.user.id).single()
  assert.ok(!error && row, 'Run the API smoke check first.')
  const document = row.document
  const exercise = document.exercises.find((item) => item.name === 'FORGE smoke device two')
  assert.ok(document.routines.length === 1 && document.routines[0].name === 'FORGE smoke workout'
    && document.workoutLogs.length === 1 && document.workoutLogs[0].snapshot.routineName === 'FORGE smoke workout'
    && exercise, 'Refusing to edit account data that does not match the API smoke fixture.')

  browser = await chromium.launch()
  const desktop = await browser.newContext({ baseURL: origin, viewport: { width: 1440, height: 900 }, timezoneId: 'America/Argentina/Buenos_Aires', reducedMotion: 'reduce' })
  const mobile = await browser.newContext({ baseURL: origin, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Argentina/Buenos_Aires', reducedMotion: 'reduce' })
  const pages = [await desktop.newPage(), await mobile.newPage()]
  const failures = []
  for (const page of pages) page.on('pageerror', () => failures.push('Uncaught application error'))
  const [first, second] = pages
  async function signIn(page, suffix) {
    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(process.env[`FORGE_SMOKE_EMAIL_${suffix}`])
    await page.getByLabel('Password', { exact: true }).fill(process.env[`FORGE_SMOKE_PASSWORD_${suffix}`])
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Account data', exact: true })).toBeVisible({ timeout: 20_000 })
  }
  async function checkLayout(page) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Account UI must not overflow the viewport.')
  }
  stage = 'desktop and mobile sign-in/history'
  for (const page of pages) {
    await signIn(page, 'A')
    await expect(page.getByText('Workout completed and saved.', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.weekly-progress__summary')).toContainText('1 of 1')
    await checkLayout(page)
  }
  process.stdout.write('PASS: real account login, completion and weekly history on desktop/mobile independent sessions.\n')

  stage = 'private image, browser save and stale draft'
  const path = `/exercises/${encodeURIComponent(exercise.id)}/edit`
  for (const page of pages) {
    await page.goto(path)
    await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('FORGE smoke device two', { timeout: 20_000 })
    await expect.poll(() => page.getByAltText('Exercise preview').evaluate((image) => image.naturalWidth), { timeout: 20_000 }).toBeGreaterThan(0)
    await checkLayout(page)
  }
  await first.getByLabel('Exercise name', { exact: true }).fill('FORGE smoke unsaved draft')
  await second.getByLabel('Exercise name', { exact: true }).fill('FORGE smoke mobile saved')
  await second.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(second.getByRole('link', { name: 'Edit FORGE smoke mobile saved', exact: true })).toBeVisible({ timeout: 20_000 })
  await first.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(first.locator('.exercise-form [role=alert]')).toContainText('changed on another device', { timeout: 20_000 })
  await expect(first.getByLabel('Exercise name', { exact: true })).toHaveValue('FORGE smoke unsaved draft')
  await first.getByRole('button', { name: 'Reload page', exact: true }).click()
  await expect(first.getByLabel('Exercise name', { exact: true })).toHaveValue('FORGE smoke mobile saved', { timeout: 20_000 })
  process.stdout.write('PASS: private images decode, mobile save reaches desktop on reload, conflict retains the stale draft.\n')

  stage = 'logout, guest continuation and account B isolation'
  await second.goto('/login')
  await second.locator('.account-panel').getByRole('button', { name: 'Log out', exact: true }).click()
  await expect(second.getByLabel('Email', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(second.getByRole('link', { name: 'Account data', exact: true })).toHaveCount(0)
  await second.getByRole('link', { name: 'Continue as guest', exact: true }).click()
  await expect(second.getByRole('heading', { name: 'Rest day', exact: true })).toBeVisible()
  await signIn(second, 'B')
  await expect(second.getByRole('heading', { name: 'Rest day', exact: true })).toBeVisible({ timeout: 20_000 })
  await second.goto('/exercises')
  await expect(second.getByRole('link', { name: 'Edit Bench Press', exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(second.getByRole('link', { name: 'Edit FORGE smoke mobile saved', exact: true })).toHaveCount(0)
  await checkLayout(second)
  assert.deepEqual(failures, [])

  // Images contain account email addresses; keep them local, ignored, and outside reports/traces.
  await mkdir('test-results/live', { recursive: true })
  await first.screenshot({ path: 'test-results/live/account-desktop.png', fullPage: true })
  await second.screenshot({ path: 'test-results/live/account-mobile.png', fullPage: true })
  for (const page of pages) {
    await page.goto('/login')
    await page.locator('.account-panel').getByRole('button', { name: 'Log out', exact: true }).click()
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible({ timeout: 20_000 })
  }
  process.stdout.write('PASS: real logout, guest continuation, separate account B, responsive layout and no uncaught errors.\nLive browser check passed. Named disposable fixture remains in account A; user browser data was not used.\n')
} catch {
  // Locator failures can include filled input values. Keep credentials out of error output.
  process.stderr.write(`Live browser check failed during ${stage}. No credentials or tokens are logged.\n`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  await api.auth.signOut({ scope: 'local' })
}
