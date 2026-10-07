import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { normalizeAssignmentInput, validateAssignmentInput } from '../domain/assignments.js'
import { countExerciseAssignments } from '../domain/exercises.js'
import { countRoutineExercises } from '../domain/routines.js'
import { workoutHistory } from './testHelpers/workoutHistory.js'

function fixture() {
  return {
    ...createEmptyDocument(),
    exercises: [{ id: 'bench', name: 'Bench Press', muscle: 'Chest' }, { id: 'row', name: 'Cable Row', muscle: 'Back' }],
    routines: [{ id: 'plan', name: 'Push A', createdOn: '2026-10-05', createdAt: '2026-10-05T12:00:00.000Z', updatedAt: '2026-10-05T12:00:00.000Z', days: [{ dayOfWeek: 1, assignments: [] }, { dayOfWeek: 5, assignments: [] }] }],
  }
}

function setup(initial = fixture(), options = {}) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(initial)]])
  let writes = 0
  let sequence = 0
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes += 1; values.set(key, value) },
    removeItem: (key) => values.delete(key),
  }
  const makeService = () => createGymService(createStorageAdapter({ getStorage: () => storage }), { now: () => '2026-10-07T13:00:00.000Z', createId: () => `assignment-${++sequence}`, ...options })
  return { storage, service: makeService(), makeService, writes: () => writes }
}

const target = { exerciseId: 'bench', sets: 4, reps: 8, targetWeight: 70 }

test('the same exercise owns independent Monday/Friday targets, and edits retain the assignment ID', async () => {
  const { service, makeService } = setup()
  await service.addAssignment('plan', 1, target)
  const added = await service.addAssignment('plan', 5, { ...target, sets: 3, reps: 10, targetWeight: 60 })
  const monday = added.routines[0].days[0].assignments[0]
  const friday = added.routines[0].days[1].assignments[0]
  assert.notEqual(monday.id, friday.id)
  const edited = await service.updateAssignment('plan', 1, monday.id, { ...target, sets: '5', reps: ' 6 ', targetWeight: '72.25' })
  assert.deepEqual(edited.routines[0].days[0].assignments[0], { id: monday.id, exerciseId: 'bench', sets: 5, reps: 6, targetWeight: 72.25 })
  assert.deepEqual(edited.routines[0].days[1].assignments[0], friday)
  assert.deepEqual(await makeService().loadAppData(), edited)
})

test('repeated appearances in one day have independent IDs and survive concurrent adds', async () => {
  const { service, makeService } = setup()
  await Promise.all([service.addAssignment('plan', 1, target), service.addAssignment('plan', 1, { ...target, targetWeight: 0 })])
  const assignments = (await makeService().getRoutines())[0].days[0].assignments
  assert.equal(assignments.length, 2)
  assert.notEqual(assignments[0].id, assignments[1].id)
  assert.deepEqual(assignments.map((assignment) => assignment.targetWeight), [70, 0])
})

test('blank, nonfinite, fractional, nonnumeric, and negative targets reject saves without a write', async () => {
  const { service, storage, writes } = setup()
  const original = storage.getItem(STORAGE_KEY)
  const cases = [null, {}, { ...target, exerciseId: '' }, { ...target, exerciseId: 'missing' }]
  for (const field of ['sets', 'reps']) for (const value of ['', ' ', null, false, [], {}, 0, -1, 1.5, NaN, Infinity, 'bad', '2.5']) cases.push({ ...target, [field]: value })
  for (const value of ['', ' ', null, false, [], {}, -1, NaN, Infinity, 'Infinity', 'bad']) cases.push({ ...target, targetWeight: value })
  for (const input of cases) await assert.rejects(service.addAssignment('plan', 1, input), { name: 'ValidationError' })
  assert.equal(writes(), 0)
  assert.equal(storage.getItem(STORAGE_KEY), original)
  assert.equal(validateAssignmentInput({ ...target, targetWeight: '0' }).targetWeight, undefined)
  assert.deepEqual(normalizeAssignmentInput({ ...target, targetWeight: '0.25' }), { ...target, targetWeight: 0.25 })
})

test('reordering changes only the selected day and preserves all IDs and targets after refresh', async () => {
  const { service, makeService } = setup()
  await service.addAssignment('plan', 1, target)
  await service.addAssignment('plan', 1, { ...target, exerciseId: 'row', targetWeight: 20 })
  const original = await service.addAssignment('plan', 5, { ...target, targetWeight: 60 })
  const [first, second] = original.routines[0].days[0].assignments
  const reordered = await service.reorderAssignments('plan', 1, [second.id, first.id])
  assert.deepEqual(reordered.routines[0].days[0].assignments, [second, first])
  assert.deepEqual(reordered.routines[0].days[1], original.routines[0].days[1])
  assert.deepEqual(await makeService().loadAppData(), reordered)
})

test('reordering rejects incomplete, repeated, unknown, and cross-day IDs without altering data', async () => {
  const { service, storage, writes } = setup()
  await service.addAssignment('plan', 1, target)
  const original = await service.addAssignment('plan', 5, target)
  const mondayId = original.routines[0].days[0].assignments[0].id
  const fridayId = original.routines[0].days[1].assignments[0].id
  const raw = storage.getItem(STORAGE_KEY)
  for (const ids of [null, [], [mondayId, mondayId], [fridayId], ['unknown']]) await assert.rejects(service.reorderAssignments('plan', 1, ids), /order has changed/)
  assert.equal(writes(), 2)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('removal affects only one occurrence and leaves other days and history intact', async () => {
  const initial = { ...fixture(), ...workoutHistory() }
  const { service, makeService } = setup(initial)
  await service.addAssignment('plan', 1, target)
  await service.addAssignment('plan', 1, { ...target, targetWeight: 50 })
  const original = await service.addAssignment('plan', 5, target)
  const removed = await service.removeAssignment('plan', 1, original.routines[0].days[0].assignments[0].id)
  assert.deepEqual(removed.routines[0].days[0].assignments, [original.routines[0].days[0].assignments[1]])
  assert.deepEqual(removed.routines[0].days[1], original.routines[0].days[1])
  assert.deepEqual(removed.exercises, initial.exercises)
  assert.deepEqual(removed.workoutLogs, initial.workoutLogs)
  assert.deepEqual(removed.weeklySchedules.filter((week) => week.weekStart < '2026-10-05'), initial.weeklySchedules)
  assert.deepEqual(await makeService().loadAppData(), removed)
})

test('missing routine/day/assignment mutations cannot modify a different record', async () => {
  const { service, storage, writes } = setup()
  await service.addAssignment('plan', 1, target)
  const raw = storage.getItem(STORAGE_KEY)
  for (const [routineId, day] of [['gone', 1], ['plan', 2], ['plan', '1']]) await assert.rejects(service.addAssignment(routineId, day, target), { code: 'missing' })
  await assert.rejects(service.updateAssignment('plan', 1, 'gone', target), { code: 'missing' })
  await assert.rejects(service.removeAssignment('plan', 1, 'gone'), { code: 'missing' })
  await assert.rejects(service.removeAssignment('plan', 5, 'assignment-1'), { code: 'missing' })
  assert.equal(writes(), 1)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('quota failure during add/edit/reorder/remove preserves both storage and the service cache', async () => {
  const { service, storage } = setup()
  await service.addAssignment('plan', 1, target)
  const original = await service.addAssignment('plan', 1, { ...target, exerciseId: 'row' })
  const [first, second] = original.routines[0].days[0].assignments
  const raw = storage.getItem(STORAGE_KEY)
  const write = storage.setItem
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  for (const operation of [() => service.addAssignment('plan', 1, target), () => service.updateAssignment('plan', 1, first.id, { ...target, sets: 5 }), () => service.reorderAssignments('plan', 1, [second.id, first.id]), () => service.removeAssignment('plan', 1, first.id)]) await assert.rejects(operation(), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  assert.deepEqual(await service.getRoutines(), original.routines)
  storage.setItem = write
  assert.equal((await service.updateAssignment('plan', 1, first.id, { ...target, sets: 5 })).routines[0].days[0].assignments[0].sets, 5)
})

test('duplicate assignment IDs or malformed saved targets block mutation while preserving raw data', async () => {
  for (const assignments of [[{ id: 'same', ...target }, { id: 'same', ...target }], [{ id: 'bad', ...target, sets: 0 }], [{ id: 'bad', ...target, targetWeight: null }], [{ id: 'bad', ...target, reps: '8' }]]) {
    const initial = fixture()
    initial.routines[0].days[0].assignments = assignments
    const { service, storage, writes } = setup(initial)
    const raw = storage.getItem(STORAGE_KEY)
    await assert.rejects(service.loadAppData(), { code: 'invalid' })
    await assert.rejects(service.addAssignment('plan', 1, target), { code: 'invalid' })
    assert.equal(writes(), 0)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('an assignment ID collision anywhere in live routines cannot overwrite an occurrence', async () => {
  const initial = fixture()
  initial.routines[0].days[1].assignments = [{ id: 'taken', ...target }]
  const { service, writes } = setup(initial, { createId: () => 'taken' })
  await assert.rejects(service.addAssignment('plan', 1, target), { code: 'invalid' })
  assert.equal(writes(), 0)
})

test('dangling references are retained for explicit repair, but new or edited assignments must reference a library exercise', async () => {
  const initial = fixture()
  initial.routines[0].days[0].assignments = [{ id: 'dangling', ...target, exerciseId: 'gone' }]
  const { service, storage } = setup(initial)
  const raw = storage.getItem(STORAGE_KEY)
  await service.loadAppData()
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  await assert.rejects(service.updateAssignment('plan', 1, 'dangling', { ...target, exerciseId: 'gone' }), { name: 'ValidationError' })
  const repaired = await service.updateAssignment('plan', 1, 'dangling', target)
  assert.deepEqual(repaired.routines[0].days[0].assignments, [{ id: 'dangling', ...target }])
})

test('exercise deletion removes all live uses atomically, keeps remaining order, and preserves snapshots', async () => {
  const initial = { ...fixture(), ...workoutHistory() }
  const { service, writes } = setup(initial)
  await service.addAssignment('plan', 1, target)
  await service.addAssignment('plan', 1, { ...target, exerciseId: 'row' })
  await service.addAssignment('plan', 1, target)
  const original = await service.addAssignment('plan', 5, target)
  assert.equal(countExerciseAssignments(original.routines, 'bench'), 3)
  assert.equal(countRoutineExercises(original.routines[0], original.exercises), 2)
  const deleted = await service.deleteExercise('bench')
  assert.equal(writes(), 5)
  assert.deepEqual(deleted.routines[0].days[0].assignments, [original.routines[0].days[0].assignments[1]])
  assert.deepEqual(deleted.routines[0].days[1].assignments, [])
  assert.deepEqual(deleted.workoutLogs, initial.workoutLogs)
})

test('assignments resolve exercise identity without duplicating image payloads or changing targets', async () => {
  const { service } = setup()
  await service.updateExercise('bench', { name: 'Bench Press', muscle: 'Chest', image: 'data:image/png;base64,aGVsbG8=' })
  const added = await service.addAssignment('plan', 1, target)
  assert.deepEqual(Object.keys(added.routines[0].days[0].assignments[0]).sort(), ['exerciseId', 'id', 'reps', 'sets', 'targetWeight'])
  const renamed = await service.updateExercise('bench', { name: 'Renamed press', muscle: 'Chest', image: null })
  assert.deepEqual(renamed.routines[0].days[0].assignments, added.routines[0].days[0].assignments)
})

test('another tab update blocks a stale assignment save without losing the newer data', async () => {
  const { service, makeService, storage } = setup()
  await service.loadAppData()
  await makeService().addAssignment('plan', 1, target)
  const raw = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.addAssignment('plan', 5, target), { code: 'stale' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})
