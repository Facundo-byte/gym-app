import { test as base, expect } from '@playwright/test'
import { weekdayName } from '../src/domain/routines.js'

export const test = base.extend({
  page: async ({ page }, run) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await run(page)
    expect(errors, 'Uncaught application errors').toEqual([])
  },
})
export { expect }

export async function activate(page, control) {
  await expect(control).toBeVisible()
  await expect(control).toBeEnabled()
  await control.focus()
  await expect(control).toBeFocused()
  await page.keyboard.press('Enter')
}

export async function createRoutine(page, name, weekdays) {
  await page.goto('/routines/new')
  await page.getByLabel('Routine name', { exact: true }).fill(name)
  for (const day of weekdays) await page.getByRole('checkbox', { name: weekdayName(day), exact: true }).check()
  await activate(page, page.getByRole('button', { name: 'Create routine', exact: true }))
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
  return new URL(page.url()).pathname
}

export async function addAssignment(page, routinePath, day, exercise, targets) {
  await page.goto(`${routinePath}/days/${day}/assignments/new`)
  await page.getByLabel('Search exercise library', { exact: true }).fill(exercise)
  await page.getByRole('radio').check()
  for (const [label, value] of Object.entries(targets)) await page.getByLabel(label, { exact: true }).fill(String(value))
  await activate(page, page.getByRole('button', { name: 'Add to training day', exact: true }))
  await expect(page.getByRole('region', { name: weekdayName(day), exact: true })).toBeVisible()
}

export async function expectProgress(page, completed, scheduled, consistency) {
  // Assert the announced counts as well as the displayed consistency.
  const summary = page.locator('.weekly-progress__summary')
  await expect(summary).toContainText(`${completed} of ${scheduled}`)
  await expect(summary).toContainText(consistency === null ? 'No workouts scheduled' : `${consistency}% consistency`)
  await expect(page.locator('.weekday-strip > li')).toHaveCount(7)
  await expect(page.getByRole('heading', { name: 'Weekly progress', exact: true })).toBeVisible()
}

export async function expectNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
}

export async function captureReview(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  const path = testInfo.outputPath(`${name}.png`)
  await page.screenshot({ path, fullPage: true })
  await testInfo.attach(name, { path, contentType: 'image/png' })
}
