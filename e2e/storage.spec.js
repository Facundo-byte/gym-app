import { readFile } from 'node:fs/promises'
import { test, expect, activate, createRoutine, uploadExerciseImage, expectNoOverflow } from './helpers.js'
import { createEmptyDocument, STORAGE_KEY } from '../src/services/storage.js'
import { createStarterDocument } from '../src/services/starterExercises.js'

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

test('empty-library routine creation retains drafts after quota failure and blocks nonexistent routine days', async ({ page }) => {
  await page.goto('/exercises')
  await expect(page.locator('.exercise-card')).toHaveCount(9)
  await page.evaluate(({ key, document }) => localStorage.setItem(key, JSON.stringify(document)), { key: STORAGE_KEY, document: createEmptyDocument() })
  await page.reload()
  const routinePath = await createRoutine(page, 'Empty library plan', [1])
  const assignmentPath = `${routinePath}/days/1/assignments/new`
  await page.goto(assignmentPath)
  await expect(page.getByText('Your exercise library is empty', { exact: true })).toBeVisible()
  await page.getByLabel('Sets', { exact: true }).fill('3')
  await page.getByLabel('Reps', { exact: true }).fill('10')
  await page.getByLabel('Target weight (kg)', { exact: true }).fill('0')
  const original = await raw(page)
  await activate(page, page.getByRole('link', { name: 'Create exercise', exact: true }))
  await page.getByLabel('Exercise name', { exact: true }).fill('Quota row')
  await page.getByLabel('Target muscle', { exact: true }).selectOption('Back')
  await uploadExerciseImage(page)
  await failWrites(page, true)
  await activate(page, page.getByRole('button', { name: 'Create exercise', exact: true }))
  await expect(page.locator('.exercise-form [role=alert]')).toContainText('Browser storage is full')
  await expect(page).toHaveURL(`${assignmentPath}/exercises/new`)
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Quota row')
  expect(await raw(page)).toBe(original)
  await activate(page, page.getByRole('link', { name: 'Back to Add exercise', exact: true }))
  await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(page.getByLabel('Sets', { exact: true })).toHaveValue('3')
  expect(await raw(page)).toBe(original)
  await activate(page, page.getByRole('link', { name: 'Create exercise', exact: true }))
  await page.getByLabel('Exercise name', { exact: true }).fill('Saved row')
  await page.getByLabel('Target muscle', { exact: true }).selectOption('Back')
  await failWrites(page, false)
  await activate(page, page.getByRole('button', { name: 'Create exercise', exact: true }))
  await expect(page.getByRole('radio', { name: 'Saved row Back', exact: true })).toBeChecked()
  await expect(page.getByLabel('Target weight (kg)', { exact: true })).toHaveValue('0')
  await activate(page, page.getByRole('button', { name: 'Add to training day', exact: true }))
  await expect(page.locator('.assignment-row')).toContainText('Saved row')
  await page.reload()
  await expect(page.locator('.assignment-row')).toContainText('Saved row')
  for (const path of [`${routinePath}/days/5/assignments/new/exercises/new`, '/routines/missing/days/1/assignments/new/exercises/new']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Training day or assignment not found', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create exercise', exact: true })).toHaveCount(0)
    await expectNoOverflow(page)
  }
})

test('bundled starter images preserve legacy storage and personal uploads can return to defaults', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Edit Bench Press', exact: true })).toBeVisible()
  // Simulate an already-saved pre-illustration library; rendering must not migrate its bytes.
  const original = JSON.stringify(createStarterDocument('2026-10-01T15:00:00.000Z'))
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), { key: STORAGE_KEY, original })
  await page.reload()
  const cards = page.locator('.exercise-card')
  await expect(cards).toHaveCount(9)
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('img')).toHaveAttribute('src', /^\/images\/exercises\/.+\.webp$/)
    await expect.poll(() => card.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)
    expect(await card.locator('img').evaluate((image) => {
      const frame = image.parentElement.getBoundingClientRect()
      const rendered = image.getBoundingClientRect()
      return getComputedStyle(image).objectFit === 'contain' && rendered.height <= frame.height + 1 && rendered.width <= frame.width + 1
    }), 'The complete illustration fits inside its card without clipping').toBe(true)
  }
  expect(await raw(page)).toBe(original)
  await page.evaluate(() => window.scrollTo(0, 0))
  const shot = testInfo.outputPath('starter-library.png')
  await page.screenshot({ path: shot, fullPage: true })
  await testInfo.attach('starter-library', { path: shot, contentType: 'image/png' })
  await expectNoOverflow(page)

  await activate(page, page.getByRole('link', { name: 'Edit Bench Press', exact: true }))
  const preview = page.getByAltText('Exercise preview')
  await expect(preview).toHaveAttribute('src', '/images/exercises/bench-press.webp')
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') })
  await expect(page.getByRole('button', { name: 'Keep current image', exact: true })).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Keep current image', exact: true }))
  await expect(preview).toHaveAttribute('src', '/images/exercises/bench-press.webp')
  expect(await raw(page)).toBe(original)
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 4; canvas.height = 4
    canvas.getContext('2d').fillRect(0, 0, 4, 4)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.locator('input[type=file]').setInputFiles({ name: 'personal.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/)
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await page.reload()
  const bench = page.getByRole('link', { name: 'Edit Bench Press', exact: true })
  await expect(bench.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/)
  const saved = JSON.parse(await raw(page))
  expect(saved.exercises.filter((exercise) => exercise.id !== 'exercise-bench-press').every((exercise) => exercise.image === null)).toBe(true)

  await activate(page, bench)
  await activate(page, page.getByRole('button', { name: 'Use default image', exact: true }))
  await expect(preview).toHaveAttribute('src', '/images/exercises/bench-press.webp')
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await page.reload()
  await expect(bench.locator('img')).toHaveAttribute('src', '/images/exercises/bench-press.webp')
  expect(JSON.parse(await raw(page)).exercises.every((exercise) => exercise.image === null)).toBe(true)
  await activate(page, bench)
  await page.getByLabel('Exercise name', { exact: true }).fill('Different movement')
  await expect(preview).toHaveCount(0)
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  await expect(page.getByRole('link', { name: 'Edit Different movement', exact: true }).locator('img')).toHaveCount(0)

  await page.route('**/images/exercises/squat.webp', (route) => route.fulfill({ status: 404 }))
  await page.reload()
  const squat = page.getByRole('link', { name: 'Edit Squat', exact: true })
  await squat.scrollIntoViewIfNeeded()
  await expect(squat.locator('.exercise-card__image > span')).toBeVisible()
  await expectNoOverflow(page)
})

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
