import test from 'node:test'
import assert from 'node:assert/strict'
import { workoutHistory } from './testHelpers/workoutHistory.js'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { countExerciseAssignments, normalizeExerciseInput, removeExerciseAssignments, searchExercises, validateExerciseInput, MAX_IMAGE_BYTES } from '../domain/exercises.js'
import { encodeImage, fitImageDimensions, validateImageFile } from './exerciseImages.js'

function setup(initial = null) {
  const values = new Map(initial === null ? [] : [[STORAGE_KEY, JSON.stringify(initial)]])
  let writes = 0
  let sequence = 0
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes += 1; values.set(key, value) },
    removeItem: (key) => values.delete(key),
  }
  const makeService = () => createGymService(createStorageAdapter({ getStorage: () => storage }), {
    now: () => '2026-10-07T13:00:00.000Z', createId: () => `custom-${++sequence}`,
  })
  return { storage, makeService, service: makeService(), writes: () => writes }
}

test('first installation seeds nine exercises once, including overlapping loads, without routines/history', async () => {
  const { service, storage, makeService, writes } = setup()
  const results = await Promise.all([service.loadAppData(), service.loadAppData()])
  assert.equal(results[0].exercises.length, 9)
  assert.equal(new Set(results[0].exercises.map((exercise) => exercise.id)).size, 9)
  assert.deepEqual(results[0].routines, [])
  assert.deepEqual(results[0].weeklySchedules, [])
  assert.deepEqual(results[0].workoutLogs, [])
  assert.equal(results[0].trackingStartedOn, null)
  assert.equal(writes(), 1)
  assert.deepEqual(await makeService().loadAppData(), results[0])
  assert.equal(writes(), 1)
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).exercises.length, 9)
})

test('CRUD trims input, preserves edit identity/timestamps and persists through a replacement service', async () => {
  const { service, makeService } = setup(createEmptyDocument())
  const created = await service.createExercise({ name: '  Cable fly  ', muscle: ' Chest ' })
  assert.deepEqual(created.exercises[0], { id: 'custom-1', name: 'Cable fly', muscle: 'Chest', image: null, createdAt: '2026-10-07T13:00:00.000Z', updatedAt: '2026-10-07T13:00:00.000Z' })
  const edited = await service.updateExercise('custom-1', { name: 'Standing cable fly', muscle: 'Chest' })
  assert.equal(edited.exercises[0].id, created.exercises[0].id)
  assert.equal(edited.exercises[0].createdAt, created.exercises[0].createdAt)
  assert.equal((await makeService().getExercises())[0].name, 'Standing cable fly')
  edited.exercises[0].name = 'Unsaved external change'
  assert.equal((await service.getExercises())[0].name, 'Standing cable fly')
  await service.deleteExercise('custom-1')
  assert.deepEqual(await makeService().getExercises(), [])
})

test('deleting every starter leaves a saved empty library that never reseeds', async () => {
  const { service, makeService, writes } = setup()
  const data = await service.loadAppData()
  for (const exercise of data.exercises) await service.deleteExercise(exercise.id)
  assert.deepEqual((await makeService().loadAppData()).exercises, [])
  assert.equal(writes(), 10)
})

test('required fields and invalid image payloads reject saves without changing data', async () => {
  const { service, storage, writes } = setup(createEmptyDocument())
  await service.loadAppData()
  const before = storage.getItem(STORAGE_KEY)
  for (const input of [null, {}, { name: '   ', muscle: 'Back' }, { name: 'Row', muscle: '\t' }, { name: 'Row', muscle: 'Back', image: 'data:image/svg+xml;base64,PHN2Zz4=' }, { name: 'Row', muscle: 'Back', image: 'data:image/png;base64,' + 'a'.repeat(MAX_IMAGE_BYTES) }]) {
    await assert.rejects(service.createExercise(input), { name: 'ValidationError' })
  }
  assert.equal(storage.getItem(STORAGE_KEY), before)
  assert.equal(writes(), 0)
  assert.deepEqual(validateExerciseInput({ name: ' ', muscle: '' }), { name: 'Enter an exercise name.', muscle: 'Select a target muscle.' })
  assert.deepEqual(normalizeExerciseInput({ name: ' Row ', muscle: ' Back ' }), { name: 'Row', muscle: 'Back', image: null })
})

test('search ignores case and surrounding whitespace, with separate empty and no-match results', () => {
  const exercises = [{ name: 'Bench Press' }, { name: 'Incline Dumbbell Press' }, { name: 'Cable Row' }]
  assert.equal(searchExercises(exercises, '  PrEsS  ').length, 2)
  assert.deepEqual(searchExercises(exercises, '   '), exercises)
  assert.deepEqual(searchExercises(exercises, 'nothing'), [])
  assert.deepEqual(searchExercises([], ''), [])
})

test('failed writes retain the saved image and service state, and a retry can succeed', async () => {
  const original = { id: 'one', name: 'Press', muscle: 'Chest', image: 'data:image/png;base64,aGVsbG8=' }
  const { service, storage } = setup({ ...createEmptyDocument(), exercises: [original] })
  await service.loadAppData()
  const before = storage.getItem(STORAGE_KEY)
  const write = storage.setItem
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.updateExercise('one', { name: 'New name', muscle: 'Chest', image: null }), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), before)
  assert.deepEqual(await service.getExercises(), [original])
  storage.setItem = write
  assert.equal((await service.updateExercise('one', { name: 'New name', muscle: 'Chest', image: null })).exercises[0].name, 'New name')
})

test('failed initial seeding does not claim persistent data or damage existing storage', async () => {
  const { service, storage } = setup()
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.loadAppData(), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), null)
  await assert.rejects(service.getExercises(), { code: 'quota' })
})

test('overlapping creates are serialized without losing an exercise', async () => {
  const { service, makeService } = setup(createEmptyDocument())
  await Promise.all([
    service.createExercise({ name: 'A', muscle: 'Back' }),
    service.createExercise({ name: 'B', muscle: 'Legs' }),
    service.createExercise({ name: 'C', muscle: 'Chest' }),
  ])
  assert.deepEqual((await makeService().getExercises()).map((exercise) => exercise.name), ['A', 'B', 'C'])
})

test('deleting a referenced exercise uses one write, retains other assignment order, and preserves snapshots', async () => {
  const fixture = {
    ...createEmptyDocument(),
    exercises: [{ id: 'one', name: 'Press', muscle: 'Chest' }, { id: 'two', name: 'Row', muscle: 'Back' }],
    routines: [{ id: 'routine', name: 'Fixture routine', createdOn: '2026-10-05', createdAt: '2026-10-05T12:00:00.000Z', updatedAt: '2026-10-05T12:00:00.000Z', days: [
      { dayOfWeek: 1, assignments: [{ id: 'a', exerciseId: 'one', sets: 4, reps: 8, targetWeight: 70 }, { id: 'b', exerciseId: 'two', sets: 3, reps: 10, targetWeight: 20 }, { id: 'c', exerciseId: 'one', sets: 3, reps: 8, targetWeight: 60 }, { id: 'd', exerciseId: 'two', sets: 2, reps: 10, targetWeight: 0 }] },
      { dayOfWeek: 5, assignments: [{ id: 'e', exerciseId: 'one', sets: 3, reps: 10, targetWeight: 60 }] },
    ] }],
    ...workoutHistory({ exerciseId: 'one', name: 'Press' }),
  }
  const { service, writes, makeService } = setup(fixture)
  assert.equal(countExerciseAssignments(fixture.routines, 'one'), 3)
  const deleted = await service.deleteExercise('one')
  assert.equal(writes(), 1)
  assert.deepEqual(deleted.routines[0].days.map((day) => day.assignments.map((assignment) => assignment.id)), [['b', 'd'], []])
  assert.deepEqual(deleted.workoutLogs, fixture.workoutLogs)
  assert.deepEqual(deleted.weeklySchedules.filter((week) => week.weekStart < '2026-10-05'), fixture.weeklySchedules)
  assert.deepEqual(await makeService().loadAppData(), deleted)
})

test('missing exercise mutations, duplicate IDs, and corrupt entities are preserved without overwrite', async () => {
  const { service, storage } = setup(createEmptyDocument())
  await assert.rejects(service.updateExercise('missing', { name: 'Row', muscle: 'Back' }), { code: 'missing' })
  await assert.rejects(service.deleteExercise('missing'), { code: 'missing' })
  for (const exercises of [[{ id: 'same', name: 'A', muscle: 'Back' }, { id: 'same', name: 'B', muscle: 'Legs' }], [{ id: 'bad', name: '   ', muscle: 'Chest' }]]) {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...createEmptyDocument(), exercises }))
    const raw = storage.getItem(STORAGE_KEY)
    await assert.rejects(service.loadAppData(), { code: 'invalid' })
    await assert.rejects(service.createExercise({ name: 'New', muscle: 'Chest' }), { code: 'invalid' })
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('another tab update cannot be overwritten by a cached service mutation', async () => {
  const { service, storage, makeService } = setup(createEmptyDocument())
  await service.loadAppData()
  await makeService().createExercise({ name: 'Other tab', muscle: 'Back' })
  const raw = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.createExercise({ name: 'This tab', muscle: 'Chest' }), { code: 'stale' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('reference helpers tolerate missing or malformed future day lists without discarding independent data', () => {
  const routines = [{ id: 'a', days: {} }, { id: 'b', days: [null, { assignments: [{ exerciseId: 'one' }, null, { exerciseId: 'missing' }] }] }]
  assert.equal(countExerciseAssignments(routines, 'one'), 1)
  const next = removeExerciseAssignments(routines, 'one', '2026-10-07T13:00:00.000Z')
  assert.deepEqual(next[0], routines[0])
  assert.deepEqual(next[1].days, [null, { assignments: [null, { exerciseId: 'missing' }] }])
})

test('image validation rejects unsupported, oversized, empty, and disguised files', () => {
  for (const file of [{ type: 'image/gif', size: 20 }, { type: 'image/png', size: 5 * 1024 * 1024 + 1 }, { type: 'image/jpeg', size: 0 }]) assert.throws(() => validateImageFile(file))
  assert.throws(() => validateImageFile({ type: 'image/png', size: 20 }, new Uint8Array([255, 216, 255])), /valid PNG or JPG/)
  assert.doesNotThrow(() => validateImageFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 }, new Uint8Array([255, 216, 255])))
})

test('image dimensions fit within 640 px without enlarging small images', () => {
  assert.deepEqual(fitImageDimensions(1920, 1080), { width: 640, height: 360 })
  assert.deepEqual(fitImageDimensions(1080, 1920), { width: 360, height: 640 })
  assert.deepEqual(fitImageDimensions(50, 100), { width: 50, height: 100 })
})

test('image compression falls back to JPEG or rejects over-budget output', () => {
  const large = 'data:image/png;base64,' + 'A'.repeat(MAX_IMAGE_BYTES)
  const smaller = 'data:image/jpeg;base64,aGVsbG8='
  assert.equal(encodeImage({ toDataURL: (type, quality) => type === 'image/jpeg' && quality <= 0.55 ? smaller : large }), smaller)
  assert.throws(() => encodeImage({ toDataURL: () => large }), /256 KiB/)
})
