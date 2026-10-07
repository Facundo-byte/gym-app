import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'
import { weekDates } from '../domain/dates.js'
import { selectWeeklyProgress } from '../domain/weeklyProgress.js'

function plan(id = 'plan', weekdays = [1, 2, 3, 5], empty = false) {
  return { id, name: id, createdOn: '2026-09-28', createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', days: weekdays.map((dayOfWeek) => ({ dayOfWeek, assignments: empty ? [] : [{ id: `${id}-${dayOfWeek}`, exerciseId: 'bench', sets: 4, reps: 8, targetWeight: 70 }] })) }
}
function fixture() {
  return { ...createEmptyDocument(), exercises: [{ id: 'bench', name: 'Bench Press', muscle: 'Chest' }], routines: [plan()] }
}
function snapshot(id, date) {
  return { routineId: id, date, routineName: id, exercises: [{ assignmentId: `${id}-exercise`, exerciseId: 'bench', name: 'Bench Press', muscle: 'Chest', sets: 4, reps: 8, targetWeight: 70 }] }
}
function log(id, date, suffix = '') {
  return { id: `${id}-${date}${suffix}`, routineId: id, date, status: 'completed', completedAt: new Date(`${date}T12:00:00`).toISOString(), snapshot: snapshot(id, date) }
}
function weekDocument(occurrences, logs = [], trackingStartedOn = '2026-10-05') {
  return { ...fixture(), trackingStartedOn, weeklySchedules: [{ weekStart: '2026-10-05', days: weekDates('2026-10-05').map((date) => ({ date, occurrences: (occurrences[date] ?? []).map((id) => snapshot(id, date)) })) }], workoutLogs: logs }
}
function setup(initial = fixture(), time = '2026-10-05T12:00:00') {
  let instant = new Date(time).toISOString()
  let writes = 0
  let sequence = 0
  const values = new Map([[STORAGE_KEY, JSON.stringify(initial)]])
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { writes++; values.set(key, value) }, removeItem: (key) => values.delete(key) }
  const makeService = () => createGymService(createStorageAdapter({ getStorage: () => storage }), { now: () => instant, createId: () => `new-${++sequence}` })
  return { service: makeService(), makeService, storage, writes: () => writes, advance: (time) => { instant = new Date(time).toISOString() } }
}

test('a mixed tracked week distinguishes completed, missed, partial today, rest, and future states', () => {
  const data = weekDocument({ '2026-10-05': ['a'], '2026-10-06': ['b'], '2026-10-07': ['c', 'd'], '2026-10-09': ['e'] }, [log('a', '2026-10-05'), log('c', '2026-10-07')])
  const progress = selectWeeklyProgress(data, '2026-10-07')
  assert.deepEqual(progress.days.map((day) => day.state), ['completed', 'missed', 'pending', 'rest', 'future', 'rest', 'rest'])
  assert.equal(progress.days[2].completed, 1)
  assert.equal(progress.days[2].scheduled, 2)
  assert.equal(progress.days[2].isToday, true)
  assert.equal(progress.completed, 2)
  assert.equal(progress.scheduled, 5)
  assert.equal(progress.consistency, 40)
  assert.equal(selectWeeklyProgress(data, '2026-10-08').days[2].state, 'missed')
  data.workoutLogs.push(log('d', '2026-10-07'))
  assert.equal(selectWeeklyProgress(data, '2026-10-07').days[2].state, 'completed')
})

test('three of four completed sessions produce 75 percent including the future session', () => {
  const data = weekDocument({ '2026-10-05': ['plan'], '2026-10-06': ['plan'], '2026-10-07': ['plan'], '2026-10-09': ['plan'] }, [log('plan', '2026-10-05'), log('plan', '2026-10-06'), log('plan', '2026-10-07')])
  const progress = selectWeeklyProgress(data, '2026-10-07')
  assert.equal(progress.completed, 3)
  assert.equal(progress.scheduled, 4)
  assert.equal(progress.consistency, 75)
  assert.equal(progress.days[4].state, 'future')
})

test('zero scheduled sessions have no percentage and never produce missed or completed rest days', async () => {
  const { service } = setup({ ...fixture(), routines: [plan('draft', [1, 3, 5], true)] })
  const progress = await service.getWeeklyProgress()
  assert.equal(progress.completed, 0)
  assert.equal(progress.scheduled, 0)
  assert.equal(progress.consistency, null)
  assert.equal(progress.days.every((day) => day.state === 'rest'), true)
})

test('pre-tracking dates do not receive badges or totals; current/future dates are never missed', () => {
  const data = weekDocument({ '2026-10-05': ['old'], '2026-10-06': ['old'], '2026-10-07': ['today'], '2026-10-09': ['future'] }, [log('old', '2026-10-05')], '2026-10-07')
  const progress = selectWeeklyProgress(data, '2026-10-07')
  assert.deepEqual(progress.days.slice(0, 3).map((day) => day.state), ['untracked', 'untracked', 'pending'])
  assert.equal(progress.completed, 0)
  assert.equal(progress.scheduled, 2)
  assert.equal(progress.consistency, 0)
  assert.equal(progress.days.slice(2).some((day) => day.state === 'missed'), false)
  assert.equal(selectWeeklyProgress(createEmptyDocument(), '2026-10-07').days.every((day) => day.state === 'untracked'), true)
})

test('duplicate completion pairs, unrelated logs, and another week cannot inflate totals', () => {
  const data = weekDocument({ '2026-10-05': ['a'], '2026-10-07': ['b'], '2026-10-09': ['c'] }, [log('a', '2026-10-05'), log('a', '2026-10-05', '-duplicate'), log('unplanned', '2026-10-06'), log('b', '2026-09-30')])
  const raw = JSON.stringify(data)
  const progress = selectWeeklyProgress(data, '2026-10-07')
  assert.equal(progress.completed, 1)
  assert.equal(progress.scheduled, 3)
  assert.equal(progress.consistency, 33)
  assert.equal(JSON.stringify(data), raw)
})

test('snapshot authority survives deleted sources and counts sessions rather than assigned exercises', () => {
  const data = weekDocument({ '2026-10-05': ['removed'], '2026-10-07': ['today'] }, [log('removed', '2026-10-05')])
  data.exercises = []; data.routines = []
  data.weeklySchedules[0].days[0].occurrences[0].exercises.push({ ...data.weeklySchedules[0].days[0].occurrences[0].exercises[0], assignmentId: 'another-occurrence' })
  const progress = selectWeeklyProgress(data, '2026-10-07')
  assert.equal(progress.completed, 1)
  assert.equal(progress.scheduled, 2)
  assert.equal(progress.consistency, 50)
  assert.equal(progress.days[0].state, 'completed')
  assert.equal(progress.days[2].state, 'pending')
})

test('service progress updates after each independent finish and survives reload without redundant writes', async () => {
  const initial = fixture()
  initial.routines = [plan('first', [1]), plan('second', [1])]
  const { service, makeService, writes, storage } = setup(initial)
  const before = await service.getWeeklyProgress('2026-10-05')
  assert.equal(before.scheduled, 2)
  assert.equal(before.days[0].state, 'pending')
  await service.completeWorkout('first', '2026-10-05')
  const partial = await service.getWeeklyProgress()
  assert.equal(partial.completed, 1)
  assert.equal(partial.consistency, 50)
  assert.equal(partial.days[0].state, 'pending')
  await service.completeWorkout('second', '2026-10-05')
  const complete = await service.getWeeklyProgress()
  assert.equal(complete.consistency, 100)
  assert.equal(complete.days[0].state, 'completed')
  assert.deepEqual(await makeService().getWeeklyProgress(), complete)
  assert.equal(writes(), 3)
  assert.equal('consistency' in JSON.parse(storage.getItem(STORAGE_KEY)), false)
})

test('failed initial preparation or finish cannot publish falsely saved progress and supports retry', async () => {
  const { service, storage } = setup()
  const write = storage.setItem
  const raw = storage.getItem(STORAGE_KEY)
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.getWeeklyProgress(), { code: 'quota' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
  storage.setItem = write
  const original = await service.getWeeklyProgress()
  storage.setItem = () => { throw new DOMException('Full', 'QuotaExceededError') }
  await assert.rejects(service.completeWorkout('plan', '2026-10-05'), { code: 'quota' })
  assert.deepEqual(await service.getWeeklyProgress(), original)
  storage.setItem = write
  await service.completeWorkout('plan', '2026-10-05')
  assert.equal((await service.getWeeklyProgress()).consistency, 25)
})

test('midweek plan creation does not invent missed earlier days or include its empty new days', async () => {
  const { service, advance } = setup({ ...fixture(), routines: [] })
  await service.getWeeklyProgress()
  advance('2026-10-09T12:00:00')
  const created = await service.createRoutine({ name: 'Added Friday', weekdays: [1, 5] })
  const id = created.routines[0].id
  await service.addAssignment(id, 1, { exerciseId: 'bench', sets: 4, reps: 8, targetWeight: 70 })
  assert.equal((await service.getWeeklyProgress()).scheduled, 0)
  await service.addAssignment(id, 5, { exerciseId: 'bench', sets: 3, reps: 10, targetWeight: 60 })
  const progress = await service.getWeeklyProgress()
  assert.equal(progress.scheduled, 1)
  assert.equal(progress.days[0].state, 'rest')
  assert.equal(progress.days[4].state, 'pending')
})

test('midweek deletion keeps missed/completed past sessions but removes pending future sessions', async () => {
  const { service, advance } = setup()
  await service.completeWorkout('plan', '2026-10-05')
  advance('2026-10-07T12:00:00')
  const before = await service.getWeeklyProgress()
  assert.equal(before.scheduled, 4)
  await service.deleteRoutine('plan')
  const after = await service.getWeeklyProgress()
  assert.equal(after.scheduled, 2)
  assert.equal(after.completed, 1)
  assert.equal(after.consistency, 50)
  assert.equal(after.days[0].state, 'completed')
  assert.equal(after.days[1].state, 'missed')
  assert.equal(after.days[2].state, 'rest')
  assert.equal(after.days[4].state, 'rest')
})

test('known passed dates retain states after assignment, weekday, and source-exercise changes', async () => {
  const { service, advance } = setup()
  await service.getWeeklyProgress()
  advance('2026-10-07T12:00:00')
  const before = await service.getWeeklyProgress()
  await service.removeAssignment('plan', 3, 'plan-3')
  await service.updateRoutine('plan', { name: 'Edited', weekdays: [1, 5] }, { confirmRemovedDays: true })
  await service.deleteExercise('bench')
  const after = await service.getWeeklyProgress()
  assert.deepEqual(after.days.slice(0, 2), before.days.slice(0, 2))
  assert.equal(after.scheduled, 2)
  assert.equal(after.consistency, 0)
  assert.equal(after.days[2].state, 'rest')
})

test('reopening after a gap initializes the current week without reconstructing skipped weeks', async () => {
  const { service, advance, makeService } = setup()
  await service.completeWorkout('plan', '2026-10-05')
  advance('2026-10-21T12:00:00')
  const progress = await makeService().getWeeklyProgress()
  assert.equal(progress.weekStart, '2026-10-19')
  assert.equal(progress.completed, 0)
  assert.equal(progress.scheduled, 4)
  assert.deepEqual(progress.days.slice(0, 3).map((day) => day.state), ['missed', 'missed', 'pending'])
  const data = await makeService().loadAppData()
  assert.deepEqual(data.weeklySchedules.map((week) => week.weekStart), ['2026-10-05', '2026-10-19'])
  assert.equal(data.workoutLogs[0].date, '2026-10-05')
})

test('Sunday/Monday at a year boundary resets only current-week metrics and retains history', async () => {
  const initial = fixture(); initial.routines = [plan('plan', [1, 7])]
  const { service, advance } = setup(initial, '2027-01-03T23:59:59')
  await service.completeWorkout('plan', '2027-01-03')
  const sunday = await service.getWeeklyProgress()
  assert.equal(sunday.weekStart, '2026-12-28')
  assert.equal(sunday.weekEnd, '2027-01-03')
  assert.equal(sunday.consistency, 100)
  advance('2027-01-04T00:00:01')
  const monday = await service.getWeeklyProgress()
  assert.equal(monday.weekStart, '2027-01-04')
  assert.equal(monday.weekEnd, '2027-01-10')
  assert.equal(monday.consistency, 0)
  assert.equal(monday.scheduled, 2)
  assert.equal(monday.days[0].state, 'pending')
  assert.equal(monday.days[6].state, 'future')
  await assert.rejects(service.getWeeklyProgress('2027-01-03'), { code: 'date' })
  assert.equal((await service.loadAppData()).workoutLogs.length, 1)
})

test('local timezone, rather than UTC date, selects the progress week and current indicator', () => {
  const code = `
    import { createGymService } from './src/services/gymService.js';
    import { createEmptyDocument } from './src/services/storage.js';
    let data = {...createEmptyDocument(),trackingStartedOn:'2026-01-01',exercises:[{id:'bench',name:'Bench',muscle:'Chest'}],routines:[{id:'plan',name:'Plan',createdOn:'2026-01-01',createdAt:'2026-01-01T12:00:00Z',updatedAt:'2026-01-01T12:00:00Z',days:[1,7].map(dayOfWeek=>({dayOfWeek,assignments:[{id:'a-'+dayOfWeek,exerciseId:'bench',sets:4,reps:8,targetWeight:70}]}))}]};
    const service=createGymService({load:async()=>structuredClone(data),save:async(next)=>{data=structuredClone(next);return next}},{now:()=>process.env.TEST_INSTANT});
    const progress=await service.getWeeklyProgress();
    console.log(JSON.stringify({start:progress.weekStart,end:progress.weekEnd,today:progress.days.find(day=>day.isToday),scheduled:progress.scheduled}));
  `
  for (const [zone, instant, start, end, weekday] of [
    ['America/Argentina/Buenos_Aires', '2027-01-04T01:00:00Z', '2026-12-28', '2027-01-03', 7],
    ['Pacific/Auckland', '2027-01-03T12:00:00Z', '2027-01-04', '2027-01-10', 1],
    ['America/New_York', '2026-03-08T07:30:00Z', '2026-03-02', '2026-03-08', 7],
  ]) {
    const result = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: process.cwd(), env: { ...process.env, TZ: zone, TEST_INSTANT: instant }, encoding: 'utf8' }))
    assert.equal(result.start, start)
    assert.equal(result.end, end)
    assert.equal(result.today.dayOfWeek, weekday)
    assert.equal(result.today.state, 'pending')
    assert.equal(result.scheduled, 2)
  }
})
