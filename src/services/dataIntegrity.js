import { validateExerciseInput } from '../domain/exercises.js'
import { isRoutineRecordValid } from '../domain/routines.js'
import { isAssignmentRecordValid } from '../domain/assignments.js'
import { findCompletion, isWorkoutDataValid } from '../domain/workouts.js'
import { StorageError } from './storage.js'

function validId(record) {
  return typeof record?.id === 'string' && Boolean(record.id.trim())
}

function countLabel(count, label) {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

export function validateAppData(data) {
  const exerciseIds = new Set()
  if (!Array.isArray(data?.exercises)) throw new StorageError('invalid', 'The exercise library is not readable. Your saved data has been preserved.')
  for (const exercise of data.exercises) {
    if (!validId(exercise) || exerciseIds.has(exercise.id) || Object.keys(validateExerciseInput(exercise)).length) {
      throw new StorageError('invalid', 'The saved library contains invalid exercises or duplicate IDs. Your original data has been preserved.')
    }
    exerciseIds.add(exercise.id)
  }
  const routineIds = new Set()
  const assignmentIds = new Set()
  if (!Array.isArray(data.routines)) throw new StorageError('invalid', 'Your routine collection is not readable. Your saved data has been preserved.')
  for (const routine of data.routines) {
    if (!isRoutineRecordValid(routine) || routineIds.has(routine.id)) throw new StorageError('invalid', 'The saved data contains invalid routines or duplicate routine IDs. Your original data has been preserved.')
    routineIds.add(routine.id)
    for (const day of routine.days) {
      for (const assignment of day.assignments) {
        if (!isAssignmentRecordValid(assignment) || assignmentIds.has(assignment.id)) throw new StorageError('invalid', 'Saved routines contain invalid exercise targets or duplicate assignment IDs. Your original data has been preserved.')
        assignmentIds.add(assignment.id)
      }
    }
  }
  if (!isWorkoutDataValid(data)) throw new StorageError('invalid', 'Saved workout history or schedules are invalid. Your original data has been preserved.')
  return data
}

function rejectAmbiguousIds(records, label) {
  const ids = new Set()
  for (const record of records) {
    if (!validId(record)) continue
    if (ids.has(record.id)) throw new StorageError('ambiguous', `Saved ${label} have duplicate IDs. FORGE cannot safely choose which record to keep. Download your saved data for recovery; nothing has been changed.`)
    ids.add(record.id)
  }
}

export function findDanglingAssignments(data) {
  const ids = new Set(data.exercises.map((exercise) => exercise.id))
  return data.routines.flatMap((routine) => routine.days.flatMap((day) => {
    const count = day.assignments.filter((assignment) => !ids.has(assignment.exerciseId)).length
    return count ? [{ routineId: routine.id, routineName: routine.name, dayOfWeek: day.dayOfWeek, count }] : []
  }))
}

// Inspection builds a proposal only. The original document stays untouched until explicit confirmation.
export function inspectAppData(data) {
  rejectAmbiguousIds(data.exercises, 'exercises')
  rejectAmbiguousIds(data.routines, 'routines')
  rejectAmbiguousIds(data.routines.flatMap((routine) => Array.isArray(routine?.days) ? routine.days.flatMap((day) => Array.isArray(day?.assignments) ? day.assignments : []) : []), 'assignments')
  for (const routine of data.routines) {
    if (!Array.isArray(routine?.days)) continue
    const weekdays = routine.days.map((day) => day?.dayOfWeek).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    if (new Set(weekdays).size !== weekdays.length) throw new StorageError('ambiguous', 'A saved routine has repeated training days. FORGE cannot safely merge their assignments. Download your saved data for recovery; nothing has been changed.')
  }
  // Historical dates and snapshots cannot be reconstructed from today's live plan.
  if (!isWorkoutDataValid(data)) throw new StorageError('invalid', 'Saved workout history or schedules are invalid. Automatic repair cannot safely reconstruct past training. Download your saved data for recovery; the original has been preserved.')

  const candidate = structuredClone(data)
  const counts = { exercises: 0, images: 0, routines: 0, assignments: 0, completions: 0 }
  candidate.exercises = candidate.exercises.flatMap((exercise) => {
    const errors = validateExerciseInput(exercise)
    if (!validId(exercise) || errors.name || errors.muscle) { counts.exercises++; return [] }
    if (errors.image) { counts.images++; return [{ ...exercise, image: null }] }
    return [exercise]
  })
  candidate.routines = candidate.routines.flatMap((routine) => {
    const header = { ...routine, days: Array.isArray(routine?.days) ? routine.days.map((day) => ({ ...day, assignments: [] })) : routine?.days }
    if (!isRoutineRecordValid(header) || !routine.days.every((day) => Array.isArray(day.assignments))) {
      counts.routines++
      counts.assignments += Array.isArray(routine?.days) ? routine.days.reduce((total, day) => total + (Array.isArray(day?.assignments) ? day.assignments.length : 0), 0) : 0
      return []
    }
    return [{ ...routine, days: routine.days.map((day) => ({ ...day, assignments: day.assignments.filter((assignment) => {
      if (isAssignmentRecordValid(assignment)) return true
      counts.assignments++
      return false
    }) })) }]
  })
  const completionGroups = new Map()
  for (const log of data.workoutLogs) {
    const key = JSON.stringify([log.routineId, log.date])
    if (!completionGroups.has(key)) completionGroups.set(key, [])
    completionGroups.get(key).push(log)
  }
  const retainedIds = new Set([...completionGroups.values()].map((logs) => findCompletion(logs, logs[0].routineId, logs[0].date).id))
  candidate.workoutLogs = candidate.workoutLogs.filter((log) => retainedIds.has(log.id))
  counts.completions = data.workoutLogs.length - candidate.workoutLogs.length
  validateAppData(candidate)
  const changes = []
  if (counts.exercises) changes.push(`Exclude ${countLabel(counts.exercises, 'invalid exercise record')}. Valid assignments referencing them stay visible as missing exercises.`)
  if (counts.images) changes.push(`Remove ${countLabel(counts.images, 'invalid image')}, keeping the exercise names and muscles.`)
  if (counts.routines) changes.push(`Exclude ${countLabel(counts.routines, 'invalid routine record')}.`)
  if (counts.assignments) changes.push(`Exclude ${countLabel(counts.assignments, 'invalid or dependent assignment record')}.`)
  if (counts.completions) changes.push(`Remove ${countLabel(counts.completions, 'duplicate completion record')}. Keep the earliest valid completion for each routine/date, breaking timestamp ties by ID.`)
  return { data: candidate, recovery: changes.length ? { changes, counts } : null, dangling: findDanglingAssignments(candidate) }
}
