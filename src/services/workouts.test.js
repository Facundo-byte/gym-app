import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { addCalendarDays, isoWeekday, weekDates } from '../domain/dates.js'
import { selectTodayWorkouts } from '../domain/workouts.js'

function routine(id, weekdays, empty = false) {
  return { id, name: id === 'push' ? 'Push A' : id, createdOn: '2026-09-28', createdAt: '2026-09-28T12:00:00.000Z', updatedAt: '2026-09-28T12:00:00.000Z', days: weekdays.map((dayOfWeek) => ({ dayOfWeek, assignments: empty ? [] : [{ id: `${id}-${dayOfWeek}`, exerciseId: 'bench', sets: dayOfWeek === 1 ? 4 : 3, reps: dayOfWeek === 1 ? 8 : 10, targetWeight: dayOfWeek === 1 ? 70 : 60 }] })) }
}
function fixture() {
  return { ...createEmptyDocument(), exercises: [{ id: 'bench', name: 'Bench Press', muscle: 'Chest', image: 'data:image/png;base64,aGVsbG8=' }], routines: [routine('push', [1, 3, 5]), routine('second', [1]), routine('draft', [1], true)] }
}
function setup(initial = fixture(), localTime = '2026-10-05T12:00:00', options = {}) {
  let instant = new Date(localTime).toISOString()
  let writes = 0
  let sequence = 0
  const values = new Map([[STORAGE_KEY, JSON.stringify(initial)]])
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value) }, removeItem: (key) => values.delete(key) }
  const makeService = () => createGymService(createStorageAdapter({ getStorage: () => storage }), { now: () => instant, createId: () => `new-${++sequence}`, ...options })
  return { service: makeService(), makeService, storage, writes: () => writes, advance: (time) => { instant = new Date(time).toISOString() } }
}
function day(data, date) { return data.weeklySchedules.find((week) => week.days.some((item) => item.date === date)).days.find((item) => item.date === date) }

test('tracking initializes once with seven dates, valid ordered targets, and no copied images', async () => {
  const { service, writes, makeService } = setup()
  const data = await service.prepareTodayWorkouts('2026-10-05')
  assert.equal(data.trackingStartedOn, '2026-10-05')
  assert.equal(data.weeklySchedules.length, 1)
  assert.deepEqual(data.weeklySchedules[0].days.map((item) => item.date), weekDates('2026-10-05'))
  const view = await service.getTodayWorkouts('2026-10-05')
  assert.deepEqual(view.workouts.map((workout) => workout.routineId), ['push', 'second'])
  assert.deepEqual(view.drafts, [{ routineId: 'draft', routineName: 'draft' }])
  assert.equal(view.workouts[0].exercises[0].targetWeight, 70)
  assert.equal('image' in view.workouts[0].exercises[0], false)
  assert.equal(day(data, '2026-10-09').occurrences[0].exercises[0].targetWeight, 60)
  assert.equal(writes(), 1)
  assert.deepEqual(await makeService().loadAppData(), data)
})

test('midweek initialization excludes passed untracked dates and routines created later', async () => {
  const initial = fixture()
  initial.routines.push({ ...routine('later', [5]), createdOn: '2026-10-10' })
  const { service } = setup(initial, '2026-10-07T12:00:00')
  const data = await service.prepareTodayWorkouts()
  assert.equal(data.trackingStartedOn, '2026-10-07')
  assert.deepEqual(day(data, '2026-10-05').occurrences, [])
  assert.deepEqual(day(data, '2026-10-06').occurrences, [])
  assert.deepEqual(day(data, '2026-10-09').occurrences.map((item) => item.routineId), ['push'])
})

test('completion is atomic and idempotent under concurrent requests and after reload', async () => {
  const { service, makeService, writes } = setup()
  await service.prepareTodayWorkouts()
  const results = await Promise.all([service.completeWorkout('push', '2026-10-05'), service.completeWorkout('push', '2026-10-05'), service.completeWorkout('push', '2026-10-05')])
  for (const data of results) assert.equal(data.workoutLogs.length, 1)
  assert.equal(writes(), 2)
  const log = results[0].workoutLogs[0]
  assert.equal(log.status, 'completed')
  assert.equal(log.date, '2026-10-05')
  assert.equal(log.snapshot.routineName, 'Push A')
  assert.deepEqual(log.snapshot.exercises, day(results[0], log.date).occurrences[0].exercises)
  const reloaded = makeService()
  assert.deepEqual((await reloaded.completeWorkout('push', '2026-10-05')).workoutLogs, [log])
  const view = await reloaded.getTodayWorkouts()
  assert.equal(view.workouts[0].completed, true)
  assert.equal(view.workouts[1].completed, false)
  assert.equal(writes(), 2)
})

test('two workouts on one date finish independently and preserve separate snapshots', async () => {
  const { service } = setup()
  await service.completeWorkout('push', '2026-10-05')
  const data = await service.completeWorkout('second', '2026-10-05')
  assert.equal(data.workoutLogs.length, 2)
  assert.notEqual(data.workoutLogs[0].id, data.workoutLogs[1].id)
  assert.equal((await service.getTodayWorkouts()).workouts.every((workout) => workout.completed), true)
})

test('only today’s configured workouts can finish; rest/draft/missing and other dates do not write', async () => {
  const { service, storage, writes } = setup()
  const raw = storage.getItem(STORAGE_KEY)
  for (const id of ['draft', 'missing']) await assert.rejects(service.completeWorkout(id, '2026-10-05'), { code: 'unconfigured' })
  for (const date of ['2026-10-04', '2026-10-06', '', 'bad']) await assert.rejects(service.completeWorkout('push', date), { code: 'date' })
  assert.equal(writes(), 0)
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  const rest = setup(fixture(), '2026-10-06T12:00:00')
  assert.deepEqual((await rest.service.getTodayWorkouts()).workouts, [])
  await assert.rejects(rest.service.completeWorkout('push', '2026-10-06'), { code: 'unconfigured' })
})

test('failed initialization and completion preserve the raw data and allow safe retry', async () => {
  const { service, storage, writes } = setup()
  const write = storage.setItem
  const raw = storage.getItem(STORAGE_KEY)
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.prepareTodayWorkouts(), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  assert.equal((await service.loadAppData()).trackingStartedOn, null)
  storage.setItem = write
  const initialized = await service.prepareTodayWorkouts()
  const beforeFinish = storage.getItem(STORAGE_KEY)
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.completeWorkout('push', '2026-10-05'), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), beforeFinish)
  assert.deepEqual((await service.loadAppData()).workoutLogs, [])
  assert.equal(selectTodayWorkouts(initialized, '2026-10-05').workouts[0].completed, false)
  storage.setItem = write
  assert.equal((await service.completeWorkout('push', '2026-10-05')).workoutLogs.length, 1)
  assert.equal(writes(), 2)
})

test('editing and deleting completed source data cannot relabel, erase, or refinish today’s snapshot', async () => {
  const { service, makeService } = setup()
  const completed = await service.completeWorkout('push', '2026-10-05')
  const snapshot = completed.workoutLogs[0].snapshot
  await service.updateExercise('bench', { name: 'Renamed exercise', muscle: 'Shoulders' })
  await service.updateAssignment('push', 1, 'push-1', { exerciseId: 'bench', sets: 8, reps: 2, targetWeight: 100 })
  await service.updateRoutine('push', { name: 'Renamed plan', weekdays: [3, 5] }, { confirmRemovedDays: true })
  await service.deleteRoutine('push')
  await service.deleteExercise('bench')
  const data = await service.completeWorkout('push', '2026-10-05')
  assert.deepEqual(data.workoutLogs, completed.workoutLogs)
  assert.deepEqual(day(data, '2026-10-05').occurrences[0], snapshot)
  const workout = (await makeService().getTodayWorkouts()).workouts[0]
  assert.equal(workout.routineName, 'Push A')
  assert.equal(workout.exercises[0].name, 'Bench Press')
  assert.equal(workout.exercises[0].targetWeight, 70)
  assert.equal(workout.completed, true)
  assert.equal(workout.routineAvailable, false)
})

test('routine/exercise mutations reconcile pending today and future occurrences while passed days stay frozen', async () => {
  const { service, advance } = setup()
  const first = await service.prepareTodayWorkouts()
  const monday = day(first, '2026-10-05')
  advance('2026-10-07T12:00:00')
  await service.updateExercise('bench', { name: 'Updated Bench', muscle: 'Chest' })
  const renamed = await service.updateRoutine('push', { name: 'New plan', weekdays: [1, 3, 5] })
  assert.deepEqual(day(renamed, '2026-10-05'), monday)
  assert.equal(day(renamed, '2026-10-07').occurrences[0].routineName, 'New plan')
  assert.equal(day(renamed, '2026-10-09').occurrences[0].exercises[0].name, 'Updated Bench')
  const deleted = await service.deleteExercise('bench')
  assert.deepEqual(day(deleted, '2026-10-05'), monday)
  assert.deepEqual(day(deleted, '2026-10-07').occurrences, [])
  assert.deepEqual(day(deleted, '2026-10-09').occurrences, [])
})

test('known empty passed dates stay empty after a later plan edit', async () => {
  const { service, advance } = setup()
  await service.prepareTodayWorkouts()
  advance('2026-10-09T12:00:00')
  const data = await service.updateRoutine('push', { name: 'Every weekday', weekdays: [1, 2, 3, 4, 5] })
  assert.deepEqual(day(data, '2026-10-06').occurrences, [])
  assert.deepEqual(day(data, '2026-10-08').occurrences, [])
})

test('reopening after a gap materializes just the current week and freezes it before an edit', async () => {
  const { service, advance } = setup()
  const first = await service.prepareTodayWorkouts()
  advance('2026-10-21T12:00:00')
  const data = await service.updateRoutine('push', { name: 'New name today', weekdays: [1, 3, 5] })
  assert.deepEqual(data.weeklySchedules.map((week) => week.weekStart), ['2026-10-05', '2026-10-19'])
  assert.deepEqual(data.weeklySchedules[0], first.weeklySchedules[0])
  assert.equal(day(data, '2026-10-19').occurrences[0].routineName, 'Push A')
  assert.equal(day(data, '2026-10-21').occurrences[0].routineName, 'New name today')
})

test('Sunday/Monday rollover keeps prior completion and selects the new local-day targets', async () => {
  const initial = fixture()
  initial.routines = [routine('push', [1, 7])]
  const { service, advance } = setup(initial, '2026-12-27T23:59:59')
  const sunday = await service.completeWorkout('push', '2026-12-27')
  advance('2026-12-28T00:00:01')
  await assert.rejects(service.completeWorkout('push', '2026-12-27'), { code: 'date' })
  const monday = await service.prepareTodayWorkouts('2026-12-28')
  assert.equal(monday.weeklySchedules.length, 2)
  assert.deepEqual(monday.workoutLogs, sunday.workoutLogs)
  assert.equal((await service.getTodayWorkouts()).workouts[0].exercises[0].targetWeight, 70)
  assert.equal((await service.getTodayWorkouts()).workouts[0].completed, false)
})

test('dangling assignments remain recoverable and only available exercises enter workout snapshots', async () => {
  const initial = fixture()
  initial.routines[0].days[0].assignments.push({ id: 'dangling', exerciseId: 'gone', sets: 2, reps: 5, targetWeight: 0 })
  initial.routines[1].days[0].assignments[0].exerciseId = 'gone'
  const { service } = setup(initial)
  const view = await service.getTodayWorkouts()
  assert.equal(view.workouts.length, 1)
  assert.equal(view.workouts[0].missingCount, 1)
  assert.equal(view.workouts[0].exercises.length, 1)
  assert.equal(view.drafts.length, 2)
  const completed = await service.completeWorkout('push', '2026-10-05')
  assert.equal(completed.routines[0].days[0].assignments.length, 2)
  assert.equal(completed.workoutLogs[0].snapshot.exercises.length, 1)
})

test('legacy completion duplicates resolve to earliest timestamp with stable ID tie-break, without silent deletion', async () => {
  const { service, makeService, storage } = setup()
  const completed = await service.completeWorkout('push', '2026-10-05')
  const original = completed.workoutLogs[0]
  completed.workoutLogs.push({ ...original, id: 'z-earlier', completedAt: new Date('2026-10-05T10:00:00').toISOString(), snapshot: { ...original.snapshot, routineName: 'Earlier snapshot' } })
  completed.workoutLogs.push({ ...original, id: 'a-earlier', completedAt: completed.workoutLogs[1].completedAt, snapshot: { ...original.snapshot, routineName: 'Deterministic snapshot' } })
  storage.setItem(STORAGE_KEY, JSON.stringify(completed))
  const reloaded = makeService()
  assert.equal((await reloaded.getTodayWorkouts()).workouts[0].routineName, 'Deterministic snapshot')
  const repeated = await reloaded.completeWorkout('push', '2026-10-05')
  assert.deepEqual(repeated.workoutLogs, completed.workoutLogs)
})

test('invalid schedules/completion records block saving and preserve the raw document', async () => {
  const { service } = setup()
  const valid = await service.completeWorkout('push', '2026-10-05')
  const badCases = [
    (data) => { data.trackingStartedOn = '2026-02-30' },
    (data) => { data.weeklySchedules[0].days.pop() },
    (data) => { data.weeklySchedules[0].days[0].date = '2026-10-06' },
    (data) => { data.workoutLogs[0].snapshot.exercises[0].sets = 0 },
    (data) => { data.workoutLogs[0].completedAt = 'invalid' },
    (data) => { data.workoutLogs[0].date = '2026-10-06' },
    (data) => { data.workoutLogs.push(structuredClone(data.workoutLogs[0])) },
  ]
  for (const corrupt of badCases) {
    const data = structuredClone(valid); corrupt(data)
    const { service: broken, storage, writes } = setup(data)
    const raw = storage.getItem(STORAGE_KEY)
    await assert.rejects(broken.loadAppData(), { code: 'invalid' })
    await assert.rejects(broken.completeWorkout('push', '2026-10-05'), { code: 'invalid' })
    assert.equal(writes(), 0)
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('stale-tab writes and completion ID collisions cannot overwrite or falsely complete a session', async () => {
  const state = setup()
  await state.service.prepareTodayWorkouts()
  const newer = JSON.parse(state.storage.getItem(STORAGE_KEY))
  newer.routines[0].name = 'Saved in another tab'
  state.storage.setItem(STORAGE_KEY, JSON.stringify(newer))
  await assert.rejects(state.service.completeWorkout('push', '2026-10-05'), { code: 'stale' })
  assert.equal(JSON.parse(state.storage.getItem(STORAGE_KEY)).workoutLogs.length, 0)
  const collision = setup(fixture(), '2026-10-05T12:00:00', { createId: () => 'same' })
  await collision.service.completeWorkout('push', '2026-10-05')
  await assert.rejects(collision.service.completeWorkout('second', '2026-10-05'), { code: 'invalid' })
  assert.equal((await collision.service.getTodayWorkouts()).workouts[1].completed, false)
})

test('calendar helpers use Monday–Sunday weeks across year/leap boundaries', () => {
  assert.equal(isoWeekday('2027-01-03'), 7)
  assert.equal(isoWeekday('2027-01-04'), 1)
  assert.deepEqual(weekDates('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29')
  assert.equal(addCalendarDays('2028-02-29', 1), '2028-03-01')
})

test('service dates use the local weekday at UTC boundaries, and calendar arithmetic survives DST', () => {
  const code = `
    import { createGymService } from './src/services/gymService.js';
    import { createEmptyDocument } from './src/services/storage.js';
    import { addCalendarDays, formatLocalDate, weekDates } from './src/domain/dates.js';
    let stored = createEmptyDocument();
    stored.exercises = [{id:'bench',name:'Bench',muscle:'Chest'}];
    stored.routines = [{id:'plan',name:'Plan',createdOn:'2026-12-01',createdAt:'2026-12-01T12:00:00Z',updatedAt:'2026-12-01T12:00:00Z',days:[{dayOfWeek:7,assignments:[{id:'sun',exerciseId:'bench',sets:3,reps:10,targetWeight:60}]},{dayOfWeek:1,assignments:[{id:'mon',exerciseId:'bench',sets:4,reps:8,targetWeight:70}]}]}];
    const service = createGymService({load:async()=>structuredClone(stored),save:async(data)=>{stored=structuredClone(data);return data}}, {now:()=>process.env.TEST_INSTANT,createId:()=> 'log'});
    const view = await service.getTodayWorkouts();
    await service.completeWorkout('plan',view.date);
    console.log(JSON.stringify({date:view.date,weight:view.workouts[0].exercises[0].targetWeight,logDate:stored.workoutLogs[0].date,week:weekDates(view.date),dst:addCalendarDays('2026-03-08',1),local:formatLocalDate(new Date(process.env.TEST_INSTANT))}));
  `
  for (const [zone, instant, date, weight] of [
    ['America/Argentina/Buenos_Aires', '2027-01-04T01:00:00Z', '2027-01-03', 60],
    ['Pacific/Auckland', '2027-01-03T12:00:00Z', '2027-01-04', 70],
    ['America/New_York', '2027-01-04T01:00:00Z', '2027-01-03', 60],
  ]) {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: process.cwd(), env: { ...process.env, TZ: zone, TEST_INSTANT: instant }, encoding: 'utf8' }))
    assert.equal(result.date, date)
    assert.equal(result.logDate, date)
    assert.equal(result.local, date)
    assert.equal(result.weight, weight)
    assert.equal(result.dst, '2026-03-09')
  }
})
