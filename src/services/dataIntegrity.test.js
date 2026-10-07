import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { inspectAppData } from './dataIntegrity.js'
import { selectWeeklyProgress } from '../domain/weeklyProgress.js'
import { workoutHistory } from './testHelpers/workoutHistory.js'

function fixture() {
  return {
    ...createEmptyDocument(),
    exercises: [{ id: 'bench', name: 'Bench Press', muscle: 'Chest', image: null }],
    routines: [{ id: 'push', name: 'Push A', createdOn: '2026-10-05', createdAt: '2026-10-05T13:00:00.000Z', updatedAt: '2026-10-05T13:00:00.000Z', days: [{ dayOfWeek: 3, assignments: [{ id: 'a', exerciseId: 'bench', sets: 4, reps: 8, targetWeight: 70 }] }] }],
    ...workoutHistory(),
  }
}

function setup(initial = fixture()) {
  let raw = JSON.stringify(initial)
  let writes = 0
  const storage = { getItem: () => raw, setItem: (key, value) => { writes++; raw = value }, removeItem: () => { raw = null } }
  const adapter = createStorageAdapter({ getStorage: () => storage, eventTarget: null })
  const makeService = () => createGymService(adapter, { now: () => '2026-10-07T13:00:00.000Z', createId: () => 'new-id' })
  return { storage, adapter, service: makeService(), raw: () => raw, writes: () => writes }
}

test('supported isolated invalid records have a disclosed read-only recovery preview without overwriting the original', async () => {
  const initial = fixture()
  initial.exercises.push(null, { id: 'bad-image', name: 'Row', muscle: 'Back', image: 'https://example.com/image.png' }, { id: 'bad-name', name: '  ', muscle: 'Back' })
  initial.routines.push(null)
  initial.routines[0].days[0].assignments.push({ id: 'missing', exerciseId: 'bad-name', sets: 2, reps: 10, targetWeight: 0 }, { id: 'invalid', exerciseId: 'bench', sets: 0, reps: 8, targetWeight: 10 }, null)
  const { service, raw, writes } = setup(initial)
  const original = raw()
  const preview = await service.inspectAppData()
  assert.deepEqual(preview.data.exercises.map((exercise) => exercise.id), ['bench', 'bad-image'])
  assert.equal(preview.data.exercises[1].image, null)
  assert.deepEqual(preview.recovery.counts, { exercises: 2, images: 1, routines: 1, assignments: 2, completions: 0 })
  assert.deepEqual(preview.dangling, [{ routineId: 'push', routineName: 'Push A', dayOfWeek: 3, count: 1 }])
  assert.deepEqual(preview.data.weeklySchedules, initial.weeklySchedules)
  assert.deepEqual(preview.data.workoutLogs, initial.workoutLogs)
  for (const operation of [() => service.prepareTodayWorkouts(), () => service.createExercise({ name: 'New', muscle: 'Chest' }), () => service.deleteRoutine('push'), () => service.completeWorkout('push')]) {
    await assert.rejects(operation(), { code: 'repair-required' })
  }
  assert.equal(raw(), original)
  assert.equal(writes(), 0)
  // Consumer changes cannot alter the pending proposal or its disclosure.
  preview.data.exercises[0].name = 'External edit'
  preview.recovery.changes.length = 0
  assert.equal((await service.getExercises())[0].name, 'Bench Press')
})

test('confirmed recovery saves one validated document and keeps independent records, dangling targets and past history', async () => {
  const initial = fixture()
  initial.exercises.push({ id: 'gone', name: '', muscle: 'Back' })
  initial.routines[0].days[0].assignments.push({ id: 'missing', exerciseId: 'gone', sets: 3, reps: 12, targetWeight: 0 })
  const { service, raw, writes } = setup(initial)
  await service.inspectAppData()
  await assert.rejects(service.applyRecovery(), { code: 'confirmation' })
  assert.equal(writes(), 0)
  const saved = await service.applyRecovery({ confirmed: true })
  assert.equal(writes(), 1)
  assert.deepEqual(JSON.parse(raw()), saved)
  assert.deepEqual(saved.weeklySchedules, initial.weeklySchedules)
  assert.deepEqual(saved.workoutLogs, initial.workoutLogs)
  assert.deepEqual(saved.routines, initial.routines)
  const reloaded = await service.inspectAppData()
  assert.equal(reloaded.recovery, null)
  assert.equal(reloaded.dangling[0].count, 1)
  const fixed = await service.updateAssignment('push', 3, 'missing', { exerciseId: 'bench', sets: 3, reps: 12, targetWeight: 0 })
  assert.equal(inspectAppData(fixed).dangling.length, 0)
})

test('a recovery quota or write failure retains original bytes, pending proposal and a safe retry', async () => {
  for (const failure of [new DOMException('Full', 'QuotaExceededError'), new Error('Blocked')]) {
    const initial = fixture()
    initial.exercises[0].image = 'invalid'
    const { service, raw, storage, writes } = setup(initial)
    const original = raw()
    await service.inspectAppData()
    const write = storage.setItem
    storage.setItem = () => { throw failure }
    await assert.rejects(service.applyRecovery({ confirmed: true }), { code: failure.name === 'QuotaExceededError' ? 'quota' : 'unavailable' })
    assert.equal(raw(), original)
    assert.equal(writes(), 0)
    await assert.rejects(service.createExercise({ name: 'Draft', muscle: 'Chest' }), { code: 'repair-required' })
    storage.setItem = write
    assert.equal((await service.applyRecovery({ confirmed: true })).exercises[0].image, null)
    assert.equal(writes(), 1)
  }
})

test('ambiguous exercise, routine, assignment IDs or training days block arbitrary recovery', async () => {
  const cases = [
    (data) => data.exercises.push({ ...data.exercises[0], name: 'Other' }),
    (data) => data.routines.push({ ...data.routines[0], days: [] }),
    (data) => data.routines[0].days[0].assignments.push({ ...data.routines[0].days[0].assignments[0], sets: 0 }),
    (data) => data.routines[0].days.push({ dayOfWeek: 3, assignments: [] }),
  ]
  for (const corrupt of cases) {
    const initial = fixture()
    corrupt(initial)
    const { service, raw, writes } = setup(initial)
    const original = raw()
    await assert.rejects(service.inspectAppData(), { code: 'ambiguous' })
    await assert.rejects(service.applyRecovery({ confirmed: true }), { code: 'missing' })
    assert.equal(await service.exportSavedData(), original)
    assert.equal(raw(), original)
    assert.equal(writes(), 0)
  }
})

test('unreadable historical context and duplicate log IDs remain intact instead of reconstructing the past', async () => {
  for (const corrupt of [
    (data) => data.weeklySchedules.push(null),
    (data) => data.weeklySchedules[0].days[0] = null,
    (data) => data.workoutLogs.push(null),
    (data) => data.workoutLogs.push({ ...data.workoutLogs[0], completedAt: '2026-10-01T14:00:00.000Z' }),
    (data) => data.workoutLogs[0].snapshot.exercises[0].sets = -1,
    (data) => data.trackingStartedOn = '2026-02-30',
  ]) {
    const initial = fixture()
    corrupt(initial)
    const { service, raw, writes } = setup(initial)
    const original = raw()
    await assert.rejects(service.inspectAppData(), { code: 'invalid' })
    assert.equal(raw(), original)
    assert.equal(writes(), 0)
  }
})

test('duplicate completion pairs have explicit deterministic recovery and never inflate weekly progress', async () => {
  const initial = fixture()
  initial.workoutLogs.push({ ...structuredClone(initial.workoutLogs[0]), id: 'z-later', completedAt: '2026-10-01T14:00:00.000Z' }, { ...structuredClone(initial.workoutLogs[0]), id: 'a-earliest' })
  initial.workoutLogs[2].snapshot.routineName = 'Earliest tie winner'
  const { service, raw, writes } = setup(initial)
  const original = raw()
  const inspected = await service.inspectAppData()
  assert.equal(inspected.recovery.counts.completions, 2)
  assert.equal(inspected.data.workoutLogs[0].id, 'a-earliest')
  assert.equal(inspected.data.workoutLogs[0].snapshot.routineName, 'Earliest tie winner')
  assert.equal(selectWeeklyProgress(inspected.data, '2026-10-01').completed, selectWeeklyProgress(initial, '2026-10-01').completed)
  assert.equal(selectWeeklyProgress(inspected.data, '2026-10-01').completed, 1)
  assert.equal(selectWeeklyProgress(inspected.data, '2026-10-01').scheduled, 1)
  assert.equal(raw(), original)
  assert.equal(writes(), 0)
  assert.equal((await service.applyRecovery({ confirmed: true })).workoutLogs.length, 1)
  assert.equal(writes(), 1)
})

test('stale no-op preparation, idempotent finish, reads and reviewed recovery cannot claim a current result', async () => {
  const { service, storage, raw } = setup()
  await service.prepareTodayWorkouts()
  await service.completeWorkout('push', '2026-10-07')
  const newer = JSON.stringify({ ...JSON.parse(raw()), exercises: [] })
  storage.setItem(STORAGE_KEY, newer)
  for (const operation of [() => service.prepareTodayWorkouts(), () => service.completeWorkout('push', '2026-10-07'), () => service.getExercises(), () => service.getRoutines()]) await assert.rejects(operation(), { code: 'stale' })
  assert.equal(raw(), newer)
  const invalid = fixture()
  invalid.exercises.push(null)
  const recovering = setup(invalid)
  await recovering.service.inspectAppData()
  recovering.storage.setItem(STORAGE_KEY, newer)
  await assert.rejects(recovering.service.applyRecovery({ confirmed: true }), { code: 'stale' })
  assert.equal(recovering.raw(), newer)
})

test('completion recovery keeps distinct routine/date pairs and preserves their saved snapshots and order', () => {
  const initial = fixture()
  const first = initial.workoutLogs[0]
  const nextDate = { ...structuredClone(first), id: 'next-date', date: '2026-10-02' }
  nextDate.snapshot.date = nextDate.date
  const nextRoutine = { ...structuredClone(first), id: 'next-routine', routineId: 'different-routine' }
  nextRoutine.snapshot.routineId = nextRoutine.routineId
  initial.workoutLogs.push(nextDate, nextRoutine, { ...structuredClone(first), id: 'duplicate', completedAt: '2026-10-01T14:00:00.000Z' })
  const inspected = inspectAppData(initial)
  assert.equal(inspected.recovery.counts.completions, 1)
  assert.deepEqual(inspected.data.workoutLogs, [first, nextDate, nextRoutine])
  assert.deepEqual(inspected.data.weeklySchedules, initial.weeklySchedules)
})

test('valid dangling assignments and intentionally empty data require no automatic cleanup or reseeding', async () => {
  const initial = fixture()
  initial.routines[0].days[0].assignments[0].exerciseId = 'unavailable'
  const { service, raw, writes } = setup(initial)
  const original = raw()
  const inspected = await service.inspectAppData()
  assert.equal(inspected.recovery, null)
  assert.equal(inspected.dangling[0].count, 1)
  assert.deepEqual(inspected.data, initial)
  assert.equal(raw(), original)
  assert.equal(writes(), 0)
  const empty = setup(createEmptyDocument())
  assert.deepEqual((await empty.service.inspectAppData()).data, createEmptyDocument())
  assert.equal(empty.writes(), 0)
})
