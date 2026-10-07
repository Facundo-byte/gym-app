import test from 'node:test'
import assert from 'node:assert/strict'
import { workoutHistory } from './testHelpers/workoutHistory.js'
import { execFileSync } from 'node:child_process'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { countMissingExercises, countRoutineAssignments, countRoutineExercises, normalizeRoutineInput, validateRoutineInput } from '../domain/routines.js'
import { formatLocalDate, isCalendarDate } from '../domain/dates.js'

const timestamp = '2026-10-07T13:00:00.000Z'
function fixtureRoutine(id = 'routine') {
  return {
    id, name: 'Push A', createdOn: '2026-10-05', createdAt: '2026-10-05T12:00:00.000Z', updatedAt: '2026-10-05T12:00:00.000Z',
    days: [
      { dayOfWeek: 1, assignments: [{ id: `${id}-a`, exerciseId: 'press', sets: 4, reps: 8, targetWeight: 70 }, { id: `${id}-b`, exerciseId: 'row', sets: 3, reps: 10, targetWeight: 20 }] },
      { dayOfWeek: 5, assignments: [{ id: `${id}-c`, exerciseId: 'press', sets: 3, reps: 10, targetWeight: 60 }] },
    ],
  }
}

function setup(initial = createEmptyDocument(), options = {}) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(initial)]])
  let writes = 0
  let sequence = 0
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes += 1; values.set(key, value) },
    removeItem: (key) => values.delete(key),
  }
  const makeService = () => createGymService(createStorageAdapter({ getStorage: () => storage }), { now: () => timestamp, createId: () => `routine-${++sequence}`, ...options })
  return { storage, makeService, service: makeService(), writes: () => writes }
}

test('routine creation persists a trimmed name and independent empty weekdays in calendar order', async () => {
  const { service, makeService } = setup()
  const input = { name: '  Push A  ', weekdays: [5, 1] }
  const created = (await service.createRoutine(input)).routines[0]
  assert.equal(created.id, 'routine-1')
  assert.equal(created.name, 'Push A')
  assert.equal(created.createdAt, timestamp)
  assert.equal(created.updatedAt, timestamp)
  assert.equal(created.createdOn, formatLocalDate(new Date(timestamp)))
  assert.deepEqual(created.days, [{ dayOfWeek: 1, assignments: [] }, { dayOfWeek: 5, assignments: [] }])
  assert.notEqual(created.days[0].assignments, created.days[1].assignments)
  assert.deepEqual(input, { name: '  Push A  ', weekdays: [5, 1] })
  assert.deepEqual((await makeService().getRoutines())[0], created)
})

test('name and distinct weekday validation prevents invalid service saves', async () => {
  const { service, storage, writes } = setup()
  const raw = storage.getItem(STORAGE_KEY)
  for (const input of [null, {}, { name: ' ', weekdays: [1] }, { name: 'Plan', weekdays: [] }, { name: 'Plan', weekdays: [1, 1] }, { name: 'Plan', weekdays: [0] }, { name: 'Plan', weekdays: [8] }, { name: 'Plan', weekdays: ['1'] }, { name: 'Plan', weekdays: [1.5] }, { name: 'Plan', weekdays: [NaN] }]) {
    await assert.rejects(service.createRoutine(input), { name: 'ValidationError' })
  }
  assert.equal(writes(), 0)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  assert.deepEqual(validateRoutineInput({ name: '', weekdays: [] }), { name: 'Enter a routine name.', weekdays: 'Select at least one training day.' })
  assert.deepEqual(normalizeRoutineInput({ name: '  Every day  ', weekdays: [7, 6, 5, 4, 3, 2, 1] }), { name: 'Every day', weekdays: [1, 2, 3, 4, 5, 6, 7] })
})

test('renaming and adding weekdays preserve identity, creation date, and existing assignment values/order', async () => {
  const original = fixtureRoutine()
  const { service, makeService } = setup({ ...createEmptyDocument(), routines: [original] })
  const edited = (await service.updateRoutine(original.id, { name: '  Updated plan  ', weekdays: [1, 3, 5] })).routines[0]
  assert.equal(edited.id, original.id)
  assert.equal(edited.createdAt, original.createdAt)
  assert.equal(edited.createdOn, original.createdOn)
  assert.equal(edited.updatedAt, timestamp)
  assert.equal(edited.name, 'Updated plan')
  assert.deepEqual(edited.days[0], original.days[0])
  assert.deepEqual(edited.days[2], original.days[1])
  assert.deepEqual(edited.days[1], { dayOfWeek: 3, assignments: [] })
  assert.deepEqual((await makeService().getRoutines())[0], edited)
})

test('removing populated days requires explicit service confirmation and changes only those days in one write', async () => {
  const original = fixtureRoutine()
  const { service, storage, writes } = setup({ ...createEmptyDocument(), routines: [original] })
  const input = { name: 'Push A', weekdays: [1, 7] }
  const raw = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.updateRoutine(original.id, input), (error) => error.code === 'confirmation' && error.removedDays[0].dayOfWeek === 5)
  assert.equal(writes(), 0)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  assert.deepEqual((await service.getRoutines())[0], original)
  const confirmed = (await service.updateRoutine(original.id, input, { confirmRemovedDays: true })).routines[0]
  assert.equal(writes(), 1)
  assert.deepEqual(confirmed.days, [original.days[0], { dayOfWeek: 7, assignments: [] }])
})

test('an empty day can be removed without confirmation, and re-adding it creates a fresh empty list', async () => {
  const { service } = setup()
  const routine = (await service.createRoutine({ name: 'Plan', weekdays: [1, 5] })).routines[0]
  assert.deepEqual((await service.updateRoutine(routine.id, { name: 'Plan', weekdays: [5] })).routines[0].days, [{ dayOfWeek: 5, assignments: [] }])
  assert.deepEqual((await service.updateRoutine(routine.id, { name: 'Plan', weekdays: [1, 5] })).routines[0].days, routine.days)
})

test('overlapping Monday routines coexist, and concurrent creation loses neither plan', async () => {
  const { service, makeService } = setup()
  await Promise.all([service.createRoutine({ name: 'A', weekdays: [1] }), service.createRoutine({ name: 'B', weekdays: [1, 5] })])
  const routines = await makeService().getRoutines()
  assert.equal(routines.length, 2)
  assert.notEqual(routines[0].id, routines[1].id)
  assert.deepEqual(routines.map((routine) => routine.days[0].dayOfWeek), [1, 1])
  routines[0].days[0].assignments.push({ exerciseId: 'unsaved' })
  assert.deepEqual((await service.getRoutines())[0].days[0].assignments, [])
})

test('routine deletion retains exercises, other plans, completions, and all saved schedule snapshots', async () => {
  const original = {
    ...createEmptyDocument(), exercises: [{ id: 'press', name: 'Press', muscle: 'Chest' }],
    routines: [fixtureRoutine(), fixtureRoutine('keep')],
    ...workoutHistory({ routineId: 'routine', exerciseId: 'press', name: 'Press' }),
  }
  const { service, makeService, writes } = setup(original)
  const deleted = await service.deleteRoutine('routine')
  assert.equal(writes(), 1)
  assert.deepEqual(deleted.routines, [original.routines[1]])
  assert.deepEqual(deleted.exercises, original.exercises)
  assert.deepEqual(deleted.workoutLogs, original.workoutLogs)
  assert.deepEqual(deleted.weeklySchedules.filter((week) => week.weekStart < '2026-10-05'), original.weeklySchedules)
  assert.deepEqual(await makeService().loadAppData(), deleted)
})

test('confirmed populated-day removal preserves existing historical snapshots', async () => {
  const original = { ...createEmptyDocument(), routines: [fixtureRoutine()], ...workoutHistory({ routineId: 'routine', exerciseId: 'press', name: 'Press' }) }
  const { service } = setup(original)
  const updated = await service.updateRoutine('routine', { name: 'Updated', weekdays: [1] }, { confirmRemovedDays: true })
  assert.deepEqual(updated.workoutLogs, original.workoutLogs)
  assert.deepEqual(updated.weeklySchedules.filter((week) => week.weekStart < '2026-10-05'), original.weeklySchedules)
})

test('failed routine edits and deletes preserve saved data and cache until a successful retry', async () => {
  const original = { ...createEmptyDocument(), routines: [fixtureRoutine()] }
  const { service, storage } = setup(original)
  await service.loadAppData()
  const raw = storage.getItem(STORAGE_KEY)
  const write = storage.setItem
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.updateRoutine('routine', { name: 'Unsaved', weekdays: [1, 5] }), { code: 'quota' })
  await assert.rejects(service.deleteRoutine('routine'), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  assert.deepEqual(await service.getRoutines(), original.routines)
  storage.setItem = write
  assert.equal((await service.updateRoutine('routine', { name: 'Saved retry', weekdays: [1, 5] })).routines[0].name, 'Saved retry')
})

test('missing IDs cannot edit or delete another routine', async () => {
  const { service, storage, writes } = setup({ ...createEmptyDocument(), routines: [fixtureRoutine()] })
  const raw = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.updateRoutine('missing', { name: 'Plan', weekdays: [1] }), { code: 'missing' })
  await assert.rejects(service.deleteRoutine('missing'), { code: 'missing' })
  assert.equal(writes(), 0)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('invalid routine structures and duplicate IDs are preserved rather than reseeded or overwritten', async () => {
  for (const routines of [[fixtureRoutine(), fixtureRoutine()], [{ ...fixtureRoutine(), days: [] }], [{ ...fixtureRoutine(), createdOn: '2026-02-30' }], [{ ...fixtureRoutine(), createdAt: 'invalid' }], [{ ...fixtureRoutine(), days: [{ dayOfWeek: 1, assignments: null }] }], [{ ...fixtureRoutine(), days: [{ dayOfWeek: 1, assignments: [] }, { dayOfWeek: 1, assignments: [] }] }]]) {
    const { service, storage, writes } = setup({ ...createEmptyDocument(), routines })
    const raw = storage.getItem(STORAGE_KEY)
    await assert.rejects(service.loadAppData(), { code: 'invalid' })
    await assert.rejects(service.createRoutine({ name: 'New', weekdays: [1] }), { code: 'invalid' })
    assert.equal(writes(), 0)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('a routine ID collision cannot overwrite an existing plan', async () => {
  const { service, writes } = setup({ ...createEmptyDocument(), routines: [fixtureRoutine()] }, { createId: () => 'routine' })
  await assert.rejects(service.createRoutine({ name: 'New', weekdays: [1] }), { code: 'invalid' })
  assert.equal(writes(), 0)
})

test('routine mutation detects a newer write in another tab', async () => {
  const { service, storage, makeService } = setup({ ...createEmptyDocument(), routines: [fixtureRoutine()] })
  await service.loadAppData()
  await makeService().updateRoutine('routine', { name: 'Other tab', weekdays: [1, 5] })
  const raw = storage.getItem(STORAGE_KEY)
  await assert.rejects(service.updateRoutine('routine', { name: 'Stale tab', weekdays: [1, 5] }), { code: 'stale' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('routine summaries count distinct existing exercises and expose missing references without changing them', () => {
  const routine = fixtureRoutine()
  routine.days[1].assignments.push({ id: 'missing', exerciseId: 'gone' })
  assert.equal(countRoutineExercises(routine, [{ id: 'press' }, { id: 'row' }]), 2)
  assert.equal(countRoutineAssignments(routine), 4)
  assert.equal(countMissingExercises(routine.days[1], [{ id: 'press' }, { id: 'row' }]), 1)
  assert.equal(routine.days[1].assignments.at(-1).exerciseId, 'gone')
})

test('calendar date validation rejects impossible dates and accepts leap/year boundaries', () => {
  assert.equal(isCalendarDate('2024-02-29'), true)
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-1', null]) assert.equal(isCalendarDate(date), false)
  assert.equal(formatLocalDate(new Date(2026, 11, 31, 23, 30)), '2026-12-31')
  assert.equal(formatLocalDate(new Date(2027, 0, 1, 0, 30)), '2027-01-01')
})

test('routine creation uses the local calendar date across Sunday/Monday and year boundaries', () => {
  const serviceUrl = new URL('./gymService.js', import.meta.url).href
  const storageUrl = new URL('./storage.js', import.meta.url).href
  for (const { zone, instant, expected } of [
    { zone: 'America/Buenos_Aires', instant: '2026-10-05T01:30:00.000Z', expected: '2026-10-04' },
    { zone: 'America/Buenos_Aires', instant: '2026-01-01T01:30:00.000Z', expected: '2025-12-31' },
    { zone: 'Pacific/Auckland', instant: '2026-12-31T12:30:00.000Z', expected: '2027-01-01' },
  ]) {
    const script = `import {createGymService} from ${JSON.stringify(serviceUrl)}; import {createEmptyDocument} from ${JSON.stringify(storageUrl)}; const service=createGymService({load:async()=>createEmptyDocument(),save:async(data)=>data},{now:()=>${JSON.stringify(instant)},createId:()=>"fixture"}); const data=await service.createRoutine({name:"Plan",weekdays:[1]}); process.stdout.write(data.routines[0].createdOn);`
    assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' }), expected)
  }
})
