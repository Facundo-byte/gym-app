import { createStorageAdapter, StorageError } from './storage.js'
import { createStarterDocument } from './starterExercises.js'
import { normalizeExerciseInput, removeExerciseAssignments } from '../domain/exercises.js'
import { getRemovedPopulatedDays, normalizeRoutineInput, updateRoutineDays } from '../domain/routines.js'
import { formatLocalDate } from '../domain/dates.js'
import { normalizeAssignmentInput, reorderDayAssignments } from '../domain/assignments.js'
import { findCompletion, reconcileWorkouts, selectTodayWorkouts } from '../domain/workouts.js'
import { selectWeeklyProgress } from '../domain/weeklyProgress.js'
import { inspectAppData, validateAppData } from './dataIntegrity.js'

export function createGymService(adapter = createStorageAdapter(), { now = () => new Date().toISOString(), createId = () => crypto.randomUUID() } = {}) {
  let document
  let recovery
  let pending = Promise.resolve()
  let disposed = false

  function assertActive() {
    if (disposed) throw new StorageError('account-changed', 'The account changed. This operation was stopped; no data was saved to another account.')
  }

  // Serialize service operations so overlapping requests cannot lose a saved edit.
  function enqueue(operation) {
    const result = pending.then(() => { assertActive(); return operation() })
    pending = result.catch(() => {})
    return result
  }

  async function load() {
    document = undefined
    recovery = undefined
    const loaded = await adapter.load({ createInitialDocument: () => createStarterDocument(now()) })
    assertActive()
    document = validateAppData(loaded)
    return structuredClone(document)
  }

  async function inspect() {
    document = undefined
    recovery = undefined
    const loaded = await adapter.load({ createInitialDocument: () => createStarterDocument(now()), allowInvalidRecords: true })
    const inspected = inspectAppData(loaded)
    await adapter.assertCurrent?.()
    assertActive()
    document = inspected.data
    recovery = inspected.recovery
    return structuredClone(inspected)
  }

  async function mutate(transform, initializeTracking = false) {
    if (!document) await load()
    await adapter.assertCurrent?.()
    assertActive()
    if (recovery) throw new StorageError('repair-required', 'Review the local data recovery notice before saving. Your draft and original data have been kept.')
    const timestamp = now()
    const today = formatLocalDate(new Date(timestamp))
    // Materialize a newly visited week before applying edits, so passed dates use the saved plan.
    const baseline = reconcileWorkouts(structuredClone(document), today, initializeTracking)
    const transformed = validateAppData(transform(baseline, { timestamp, today }))
    const next = validateAppData(reconcileWorkouts(transformed, today, initializeTracking))
    if (JSON.stringify(next) === JSON.stringify(document)) return structuredClone(document)
    const saved = await adapter.save(next)
    assertActive()
    document = saved
    return structuredClone(saved)
  }

  function requireToday(date, today) {
    if (date !== undefined && date !== today) throw new StorageError('date', 'The workout date has changed. Reload Home to see today’s training.')
  }

  async function prepareToday(date) {
    return mutate((data, { today }) => { requireToday(date, today); return data }, true)
  }

  function changeDay(data, routineId, dayOfWeek, transform) {
    const routine = data.routines.find((item) => item.id === routineId)
    const day = routine?.days.find((item) => item.dayOfWeek === dayOfWeek)
    if (!routine || !day) throw new StorageError('missing', 'This routine or training day no longer exists. Return to your routines.')
    const assignments = transform(day.assignments)
    const updated = { ...routine, updatedAt: now(), days: routine.days.map((item) => item.dayOfWeek === dayOfWeek ? { ...item, assignments } : item) }
    return { ...data, routines: data.routines.map((item) => item.id === routineId ? updated : item) }
  }

  return {
    loadAppData: () => enqueue(load),
    inspectAppData: () => enqueue(inspect),
    subscribeToStorage: (onError) => adapter.subscribe?.(onError) ?? (() => {}),
    dispose: () => { disposed = true; document = undefined; recovery = undefined; adapter.dispose?.() },
    importGuestData: (proposal, { confirmed = false } = {}) => enqueue(async () => {
      if (!confirmed) throw new StorageError('confirmation', 'Confirm the guest import before saving.')
      if (!adapter.importDocument) throw new StorageError('configuration', 'Guest data can only be imported into an account.')
      await proposal.assertUnchanged()
      const saved = await adapter.importDocument(validateAppData(proposal.document), proposal.hash)
      assertActive()
      document = saved
      recovery = null
      return structuredClone(saved)
    }),
    exportSavedData: () => enqueue(() => adapter.exportRaw()),
    applyRecovery: ({ confirmed = false } = {}) => enqueue(async () => {
      if (!confirmed) throw new StorageError('confirmation', 'Confirm the listed recovery changes before saving.')
      if (!recovery || !document) throw new StorageError('missing', 'There is no pending recovery. Reload to inspect the saved data.')
      const saved = await adapter.save(validateAppData(document))
      assertActive()
      document = saved
      recovery = null
      return structuredClone(saved)
    }),
    prepareTodayWorkouts: (date) => enqueue(() => prepareToday(date)),
    getTodayWorkouts: (date) => enqueue(async () => {
      const today = date ?? formatLocalDate(new Date(now()))
      const data = await prepareToday(today)
      return selectTodayWorkouts(data, today)
    }),
    getWeeklyProgress: (date) => enqueue(async () => {
      const today = date ?? formatLocalDate(new Date(now()))
      const data = await prepareToday(today)
      return selectWeeklyProgress(data, today)
    }),
    completeWorkout: (routineId, date) => enqueue(() => mutate((data, { timestamp, today }) => {
      requireToday(date, today)
      if (findCompletion(data.workoutLogs, routineId, today)) return data
      const planned = reconcileWorkouts(data, today, true)
      const workout = selectTodayWorkouts(planned, today).workouts.find((item) => item.routineId === routineId)
      if (!workout) throw new StorageError('unconfigured', 'This routine has no configured workout for today. Open the routine to add exercises.')
      const id = createId()
      if (data.workoutLogs.some((log) => log.id === id)) throw new StorageError('invalid', 'A completion ID could not be created. Try again.')
      const { routineId: savedRoutineId, date: savedDate, routineName, exercises } = workout
      const log = { id, routineId, date: today, status: 'completed', completedAt: timestamp, snapshot: { routineId: savedRoutineId, date: savedDate, routineName, exercises } }
      return { ...planned, workoutLogs: [...planned.workoutLogs, log] }
    }, true)),
    getExercises: () => enqueue(async () => {
      if (!document) await load()
      await adapter.assertCurrent?.()
      assertActive()
      return structuredClone(document.exercises)
    }),
    getRoutines: () => enqueue(async () => {
      if (!document) await load()
      await adapter.assertCurrent?.()
      assertActive()
      return structuredClone(document.routines)
    }),
    saveAppData: (data) => enqueue(() => mutate(() => data)),
    resetLocalData: () => enqueue(async () => { await adapter.reset(); document = undefined; recovery = undefined }),
    createExercise: (input) => enqueue(() => mutate((data) => {
      const values = normalizeExerciseInput(input)
      const id = createId()
      if (data.exercises.some((exercise) => exercise.id === id)) throw new StorageError('invalid', 'An exercise ID could not be created. Try again.')
      const timestamp = now()
      return { ...data, exercises: [...data.exercises, { ...values, id, createdAt: timestamp, updatedAt: timestamp }] }
    })),
    updateExercise: (id, input) => enqueue(() => mutate((data) => {
      if (!data.exercises.some((exercise) => exercise.id === id)) throw new StorageError('missing', 'This exercise no longer exists. Return to the library.')
      const values = normalizeExerciseInput(input)
      return { ...data, exercises: data.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...values, updatedAt: now() } : exercise) }
    })),
    deleteExercise: (id) => enqueue(() => mutate((data) => {
      if (!data.exercises.some((exercise) => exercise.id === id)) throw new StorageError('missing', 'This exercise no longer exists. Return to the library.')
      return {
        ...data,
        exercises: data.exercises.filter((exercise) => exercise.id !== id),
        routines: removeExerciseAssignments(data.routines, id, now()),
      }
    })),
    createRoutine: (input) => enqueue(() => mutate((data) => {
      const { name, weekdays } = normalizeRoutineInput(input)
      const id = createId()
      if (data.routines.some((routine) => routine.id === id)) throw new StorageError('invalid', 'A routine ID could not be created. Try again.')
      const timestamp = now()
      const routine = {
        id, name, createdOn: formatLocalDate(new Date(timestamp)), createdAt: timestamp, updatedAt: timestamp,
        days: weekdays.map((dayOfWeek) => ({ dayOfWeek, assignments: [] })),
      }
      return { ...data, routines: [...data.routines, routine] }
    })),
    updateRoutine: (id, input, { confirmRemovedDays = false } = {}) => enqueue(() => mutate((data) => {
      const routine = data.routines.find((item) => item.id === id)
      if (!routine) throw new StorageError('missing', 'This routine no longer exists. Return to your routines.')
      const { name, weekdays } = normalizeRoutineInput(input)
      const removed = getRemovedPopulatedDays(routine, weekdays)
      if (removed.length && confirmRemovedDays !== true) {
        const error = new StorageError('confirmation', 'Removing populated training days requires confirmation before saving.')
        error.removedDays = removed
        throw error
      }
      const updated = { ...routine, name, days: updateRoutineDays(routine, weekdays), updatedAt: now() }
      return { ...data, routines: data.routines.map((item) => item.id === id ? updated : item) }
    })),
    deleteRoutine: (id) => enqueue(() => mutate((data) => {
      if (!data.routines.some((routine) => routine.id === id)) throw new StorageError('missing', 'This routine no longer exists. Return to your routines.')
      return { ...data, routines: data.routines.filter((routine) => routine.id !== id) }
    })),
    addAssignment: (routineId, dayOfWeek, input) => enqueue(() => mutate((data) => {
      const values = normalizeAssignmentInput(input, data.exercises)
      const id = createId()
      if (data.routines.some((routine) => routine.days.some((day) => day.assignments.some((assignment) => assignment.id === id)))) throw new StorageError('invalid', 'An assignment ID could not be created. Try again.')
      return changeDay(data, routineId, dayOfWeek, (assignments) => [...assignments, { id, ...values }])
    })),
    updateAssignment: (routineId, dayOfWeek, assignmentId, input) => enqueue(() => mutate((data) => {
      const values = normalizeAssignmentInput(input, data.exercises)
      return changeDay(data, routineId, dayOfWeek, (assignments) => {
        if (!assignments.some((assignment) => assignment.id === assignmentId)) throw new StorageError('missing', 'This exercise assignment no longer exists. Return to the training day.')
        return assignments.map((assignment) => assignment.id === assignmentId ? { id: assignment.id, ...values } : assignment)
      })
    })),
    removeAssignment: (routineId, dayOfWeek, assignmentId) => enqueue(() => mutate((data) => changeDay(data, routineId, dayOfWeek, (assignments) => {
      if (!assignments.some((assignment) => assignment.id === assignmentId)) throw new StorageError('missing', 'This exercise assignment no longer exists. Return to the training day.')
      return assignments.filter((assignment) => assignment.id !== assignmentId)
    }))),
    reorderAssignments: (routineId, dayOfWeek, orderedIds) => enqueue(() => mutate((data) => changeDay(data, routineId, dayOfWeek, (assignments) => reorderDayAssignments(assignments, orderedIds)))),
  }
}
