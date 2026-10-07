import { test, expect, activate, expectNoOverflow, captureReview } from './helpers.js'
import { LANGUAGE_KEY, STORAGE_KEY } from '../src/services/storage.js'

async function stored(context, key) {
  const state = await context.storageState()
  return state.origins.find(origin => origin.origin === 'http://127.0.0.1:4175')?.localStorage.find(item => item.name === key)?.value
}

test('language switches preserve drafts and stored plans, localize search and validation, and persist across refresh', async ({ page, context }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Edit Bench Press', exact: true })).toBeVisible()
  const original = await stored(context, STORAGE_KEY)
  await activate(page, page.getByRole('button', { name: 'Switch to Spanish', exact: true }))
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page).toHaveTitle('Biblioteca de ejercicios | FORGE')
  await expect(page.getByRole('link', { name: 'Editar Press de banca', exact: true })).toBeVisible()
  expect(await stored(context, STORAGE_KEY)).toBe(original)
  await page.getByRole('searchbox', { name: 'Buscar ejercicios', exact: true }).fill('jalon')
  await expect(page.locator('.exercise-card')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Editar Jalón al pecho', exact: true })).toBeVisible()
  await page.getByRole('searchbox').fill('Lat Pulldown')
  await expect(page.locator('.exercise-card')).toHaveCount(1)
  await page.getByRole('searchbox').fill('')
  await expectNoOverflow(page)
  await captureReview(page, testInfo, 'spanish-library')

  await page.goto('/exercises/new')
  await page.getByLabel('Nombre del ejercicio', { exact: true }).fill('My personal movement')
  await activate(page, page.getByRole('button', { name: 'Crear ejercicio', exact: true }))
  await expect(page.getByText('Elegí un músculo principal.', { exact: true })).toBeVisible()
  await activate(page, page.getByRole('button', { name: 'Cambiar a inglés', exact: true }))
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('My personal movement')
  await expect(page.getByText('Select a target muscle.', { exact: true })).toBeVisible()
  expect(await stored(context, STORAGE_KEY)).toBe(original)
  await activate(page, page.getByRole('button', { name: 'Switch to Spanish', exact: true }))
  await page.getByLabel('Músculo principal', { exact: true }).selectOption('Chest')
  await activate(page, page.getByRole('button', { name: 'Crear ejercicio', exact: true }))
  await expect(page.getByRole('link', { name: 'Editar My personal movement', exact: true })).toContainText('Pecho')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Biblioteca de ejercicios', exact: true })).toBeVisible()
  expect(await stored(context, LANGUAGE_KEY)).toBe('es')
  expect(JSON.parse(await stored(context, STORAGE_KEY)).exercises.at(-1)).toMatchObject({ name: 'My personal movement', muscle: 'Chest' })

  await activate(page, page.getByRole('link', { name: 'Editar Press de banca', exact: true }))
  await expect(page.getByLabel('Nombre del ejercicio', { exact: true })).toHaveValue('Press de banca')
  await activate(page, page.getByRole('button', { name: 'Guardar cambios', exact: true }))
  await expect(page.getByRole('link', { name: 'Editar Press de banca', exact: true }).locator('img')).toHaveAttribute('src', '/images/exercises/bench-press.webp')
  expect(JSON.parse(await stored(context, STORAGE_KEY)).exercises.find(exercise => exercise.id === 'exercise-bench-press')).toMatchObject({ name: 'Bench Press', muscle: 'Chest', image: null })

  await page.goto('/routines/new')
  await page.getByLabel('Nombre de la rutina', { exact: true }).fill('My weekly plan')
  await page.getByRole('checkbox', { name: 'Miércoles', exact: true }).check()
  await activate(page, page.getByRole('button', { name: 'Crear rutina', exact: true }))
  await expect(page.getByRole('region', { name: 'Miércoles', exact: true })).toBeVisible()
  await expect(page.getByText('Todavía no hay ejercicios para Miércoles', { exact: true })).toBeVisible()
  const routinePath = new URL(page.url()).pathname
  await page.goto(`${routinePath}/days/3/assignments/new`)
  await page.getByLabel('Buscar en la biblioteca de ejercicios', { exact: true }).fill('banca')
  await page.getByRole('radio').check()
  for (const [label, value] of Object.entries({ Series: '4', Repeticiones: '8', 'Peso objetivo (kg)': '70.5' })) await page.getByLabel(label, { exact: true }).fill(value)
  await activate(page, page.getByRole('button', { name: 'Agregar al día de entrenamiento', exact: true }))
  await expect(page.locator('.assignment-row')).toContainText('70,5 kg')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Progreso semanal', exact: true })).toBeVisible()
  await expect(page.locator('.today-workouts__date')).toContainText('octubre')
  await expect(page.locator('.weekday-strip > li').nth(2)).toHaveAccessibleName(/Miércoles, .*hoy: Pendiente/)
  await expectNoOverflow(page)
  await captureReview(page, testInfo, 'spanish-home')
  await activate(page, page.getByRole('button', { name: 'Finalizar entrenamiento: My weekly plan', exact: true }))
  await expect(page.getByText('Entrenamiento completado y guardado.', { exact: true })).toBeVisible()
  await expect(page.locator('.weekly-progress__summary')).toContainText('1 de 1')
  await activate(page, page.getByRole('button', { name: 'Cambiar a inglés', exact: true }))
  await expect(page.getByRole('heading', { name: 'Your training, organized', exact: true })).toBeVisible()
  await expect(page.getByText('Workout completed and saved.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expectNoOverflow(page)
})

test('language toggle remains usable when saving only the language preference fails', async ({ page }) => {
  await page.goto('/exercises')
  await expect(page.locator('.exercise-card')).toHaveCount(9)
  // Focused preference-adapter failure fixture in a disposable browser context.
  await page.evaluate(key => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Denied', 'SecurityError')
      return original.call(this, name, value)
    }
  }, LANGUAGE_KEY)
  await activate(page, page.getByRole('button', { name: 'Switch to Spanish', exact: true }))
  await expect(page.getByRole('heading', { name: 'Biblioteca de ejercicios', exact: true })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'no se pudo guardar la preferencia' })).toBeVisible()
  await expectNoOverflow(page)
})
