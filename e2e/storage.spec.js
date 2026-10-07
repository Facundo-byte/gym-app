import { readFile } from 'node:fs/promises'
import { test, expect, activate, expectNoOverflow } from './helpers.js'
import { createEmptyDocument, STORAGE_KEY } from '../src/services/storage.js'

// These adapter-focused browser fixtures run only in Playwright's disposable storage contexts.
async function raw(page) {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
}

async function failWrites(page, fail) {
  await page.evaluate(({ key, fail }) => {
    if (!window.originalFixtureWrite) {
      window.originalFixtureWrite = Storage.prototype.setItem
      Storage.prototype.setItem = function (name, value) {
        if (name === key && window.fixtureWriteFailure) throw new DOMException('Full', 'QuotaExceededError')
        return window.originalFixtureWrite.call(this, name, value)
      }
    }
    window.fixtureWriteFailure = fail
  }, { key: STORAGE_KEY, fail })
}

test('recovery preview, original download, cancel, failed repair and retained draft across approved recovery', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Edit Bench Press', exact: true })).toBeVisible()
  const original = JSON.stringify({ ...createEmptyDocument(), exercises: [{ id: 'valid', name: 'Recovery Press', muscle: 'Chest' }, null] })
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: STORAGE_KEY, original })
  await page.goto('/exercises/valid/edit')
  await expect(page.getByRole('heading', { name: 'Review local data recovery', exact: true })).toBeVisible()
  await page.getByLabel('Exercise name', { exact: true }).fill('Recovery draft')
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(page.getByRole('alert').filter({ hasText: 'Review the local data recovery notice before saving' })).toBeVisible()
  expect(await raw(page)).toBe(original)

  const downloaded = page.waitForEvent('download')
  await activate(page, page.getByRole('button', { name: 'Download saved data', exact: true }))
  const file = await downloaded
  expect(await readFile(await file.path(), 'utf8')).toBe(original)
  const opener = page.getByRole('button', { name: 'Review recovery', exact: true })
  await activate(page, opener)
  const dialog = page.getByRole('dialog', { name: 'Apply local data recovery?', exact: true })
  const keep = dialog.getByRole('button', { name: 'Keep original data', exact: true })
  const apply = dialog.getByRole('button', { name: 'Apply recovery', exact: true })
  await expect(keep).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(apply).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(keep).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(opener).toBeFocused()
  expect(await raw(page)).toBe(original)

  await failWrites(page, true)
  await activate(page, opener)
  await activate(page, apply)
  await expect(dialog.getByRole('alert')).toContainText('Browser storage is full')
  expect(await raw(page)).toBe(original)
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Recovery draft')
  await failWrites(page, false)
  await activate(page, apply)
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Recovery saved.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Recovery draft')
  expect(JSON.parse(await raw(page)).exercises).toEqual([{ id: 'valid', name: 'Recovery Press', muscle: 'Chest' }])

  await failWrites(page, true)
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(page.getByRole('alert').filter({ hasText: 'Browser storage is full' })).toBeVisible()
  expect(JSON.parse(await raw(page)).exercises[0].name).toBe('Recovery Press')
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Recovery draft')
  await failWrites(page, false)
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(page.getByRole('link', { name: 'Edit Recovery draft', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Edit Recovery draft', exact: true })).toBeVisible()
  expect(JSON.parse(await raw(page)).exercises).toHaveLength(1)
  await expectNoOverflow(page)
})

test('another tab update blocks a stale save without discarding its draft and reload reads the current data', async ({ page, context }) => {
  await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
  await page.goto('/exercises')
  const path = await page.getByRole('link', { name: 'Edit Bench Press', exact: true }).getAttribute('href')
  await page.goto(path)
  await page.getByLabel('Exercise name', { exact: true }).fill('First tab draft')
  const other = await context.newPage()
  const otherErrors = []
  other.on('pageerror', (error) => otherErrors.push(error.message))
  await other.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
  await other.goto(path)
  await other.getByLabel('Exercise name', { exact: true }).fill('Second tab saved')
  await activate(other, other.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(other.getByRole('link', { name: 'Edit Second tab saved', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload page', exact: true })).toBeVisible()
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('First tab draft')
  const newer = await raw(page)
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(page.locator('.exercise-form [role=alert]')).toContainText('Reload before saving more changes')
  expect(await raw(page)).toBe(newer)
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('First tab draft')
  await activate(page, page.getByRole('button', { name: 'Reload page', exact: true }))
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Second tab saved')
  await expect(page.getByRole('button', { name: 'Reload page', exact: true })).toHaveCount(0)
  expect(await raw(page)).toBe(newer)
  expect(otherErrors).toEqual([])
  await other.close()
  await expectNoOverflow(page)
})
