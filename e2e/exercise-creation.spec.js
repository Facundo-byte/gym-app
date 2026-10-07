import { test, expect, activate, createRoutine, uploadExerciseImage, expectNoOverflow, captureReview } from './helpers.js'
import { STORAGE_KEY } from '../src/services/storage.js'

async function savedDocument(context) {
  const state = await context.storageState()
  return JSON.parse(state.origins.find(origin => origin.origin === 'http://127.0.0.1:4175').localStorage.find(item => item.name === STORAGE_KEY).value)
}

const labels = {
  en: { add: 'Add exercise', create: 'Create exercise', back: 'Back to Add exercise', cancel: 'Cancel', search: 'Search exercise library', bench: 'Bench Press', name: 'Exercise name', muscle: 'Target muscle', sets: 'Sets', reps: 'Reps', weight: 'Target weight (kg)', confirm: 'Add to training day', edit: 'Edit', selected: 'Selected: Personal cable row', friday: 'Friday' },
  es: { add: 'Agregar ejercicio', create: 'Crear ejercicio', back: 'Volver a Agregar ejercicio', cancel: 'Cancelar', search: 'Buscar en la biblioteca de ejercicios', bench: 'Press de banca', name: 'Nombre del ejercicio', muscle: 'Músculo principal', sets: 'Series', reps: 'Repeticiones', weight: 'Peso objetivo (kg)', confirm: 'Agregar al día de entrenamiento', edit: 'Editar', selected: 'Seleccionado: Personal cable row', friday: 'Viernes' },
}

for (const language of ['en', 'es']) {
  test(`${language}: create inside a routine, cancel without writes, preserve targets and select the saved image exercise`, async ({ page, context }, testInfo) => {
    await page.clock.setFixedTime(new Date('2026-10-07T15:00:00Z'))
    const routinePath = await createRoutine(page, 'Two day plan', [1, 5])
    const assignmentPath = `${routinePath}/days/1/assignments/new`
    await page.goto(assignmentPath)
    if (language === 'es') await activate(page, page.getByRole('button', { name: 'Switch to Spanish', exact: true }))
    const copy = labels[language]
    await page.getByLabel(copy.search, { exact: true }).fill(copy.bench)
    await page.getByRole('radio').check()
    for (const [label, value] of [[copy.sets, '4'], [copy.reps, '8'], [copy.weight, '70.5']]) await page.getByLabel(label, { exact: true }).fill(value)
    const original = await savedDocument(context)
    const create = page.getByRole('link', { name: copy.create, exact: true })
    expect(await create.evaluate(element => element.getBoundingClientRect().bottom <= document.querySelector('.exercise-picker__results').getBoundingClientRect().top)).toBe(true)
    await captureReview(page, testInfo, `${language}-add-exercise`)
    await activate(page, create)
    await expect(page).toHaveURL(`${assignmentPath}/exercises/new`)
    await page.getByLabel(copy.name, { exact: true }).fill('Discard this movement')
    await page.getByLabel(copy.muscle, { exact: true }).selectOption('Back')
    await uploadExerciseImage(page)
    await expectNoOverflow(page)
    await captureReview(page, testInfo, `${language}-create-exercise`)
    await activate(page, page.getByRole('link', { name: copy.back, exact: true }))
    await expect(page).toHaveURL(assignmentPath)
    await expect(page.getByLabel(copy.search, { exact: true })).toHaveValue(copy.bench)
    await expect(page.getByRole('radio')).toBeChecked()
    expect(await savedDocument(context)).toEqual(original)

    // Browser Back and the form's Cancel use the same parent draft.
    await activate(page, page.getByRole('link', { name: copy.create, exact: true }))
    await page.goBack()
    await expect(page.getByRole('radio')).toBeChecked()
    await activate(page, page.getByRole('link', { name: copy.create, exact: true }))
    await page.getByLabel(copy.name, { exact: true }).fill('Another discarded draft')
    await activate(page, page.getByRole('link', { name: copy.cancel, exact: true }))
    expect(await savedDocument(context)).toEqual(original)

    await activate(page, page.getByRole('link', { name: copy.create, exact: true }))
    await activate(page, page.getByRole('button', { name: copy.create, exact: true }))
    await expect(page.getByLabel(copy.name, { exact: true })).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByLabel(copy.name, { exact: true })).toBeFocused()
    await page.getByLabel(copy.name, { exact: true }).fill('Personal cable row')
    await page.getByLabel(copy.muscle, { exact: true }).selectOption('Back')
    await uploadExerciseImage(page)
    await activate(page, page.getByRole('button', { name: copy.create, exact: true }))
    await expect(page).toHaveURL(assignmentPath)
    const selected = page.getByRole('radio', { name: 'Personal cable row', exact: false })
    await expect(selected).toBeChecked()
    await expect(selected).toBeFocused()
    await expect(page.getByLabel(copy.search, { exact: true })).toHaveValue('')
    await expect(page.getByRole('status').filter({ hasText: copy.selected })).toBeVisible()
    for (const [label, value] of [[copy.sets, '4'], [copy.reps, '8'], [copy.weight, '70.5']]) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value)
    const created = await savedDocument(context)
    const exercise = created.exercises.at(-1)
    expect(exercise).toMatchObject({ name: 'Personal cable row', muscle: 'Back', image: expect.stringMatching(/^data:image\//) })
    expect(created.exercises).toHaveLength(original.exercises.length + 1)
    expect(created.routines).toEqual(original.routines)
    await expectNoOverflow(page)
    await captureReview(page, testInfo, `${language}-created-exercise-selected`)
    await activate(page, page.getByRole('button', { name: copy.confirm, exact: true }))
    await expect(page.locator('.assignment-row')).toContainText('Personal cable row')
    const assigned = await savedDocument(context)
    expect(assigned.routines[0].days.find(day => day.dayOfWeek === 1).assignments).toEqual([expect.objectContaining({ exerciseId: exercise.id, sets: 4, reps: 8, targetWeight: 70.5 })])
    expect(assigned.routines[0].days.find(day => day.dayOfWeek === 5).assignments).toEqual([])
    await page.reload()
    await expect(page.locator('.assignment-row')).toContainText('Personal cable row')
    await page.goto('/exercises')
    const card = page.getByRole('link', { name: `${copy.edit} Personal cable row`, exact: true })
    await expect(card).toBeVisible()
    await expect.poll(() => card.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
    await expectNoOverflow(page)
  })
}
