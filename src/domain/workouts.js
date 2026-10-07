import { isCalendarDate, isoWeekday, weekDates } from './dates.js'
import { isAssignmentRecordValid } from './assignments.js'

export function findCompletion(logs, routineId, date) {
  // Legacy duplicates remain intact for explicit recovery, but resolve to one deterministic completion.
  return logs.filter((log) => log.routineId === routineId && log.date === date)
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id))[0]
}

function snapshotRoutine(routine, date, exercises) {
  const day = routine.days.find((item) => item.dayOfWeek === isoWeekday(date))
  if (!day || routine.createdOn > date) return null
  const snapshots = day.assignments.flatMap((assignment) => {
    const exercise = exercises.find((item) => item.id === assignment.exerciseId)
    return exercise ? [{ assignmentId: assignment.id, exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle, sets: assignment.sets, reps: assignment.reps, targetWeight: assignment.targetWeight }] : []
  })
  return snapshots.length ? { routineId: routine.id, date, routineName: routine.name, exercises: snapshots } : null
}

function reconcileDate(data, date, previous) {
  const byRoutine = new Map(data.routines.map((routine) => snapshotRoutine(routine, date, data.exercises)).filter(Boolean).map((snapshot) => [snapshot.routineId, snapshot]))
  const completedIds = new Set(data.workoutLogs.filter((log) => log.date === date).map((log) => log.routineId))
  for (const id of completedIds) byRoutine.set(id, findCompletion(data.workoutLogs, id, date).snapshot)
  const ordered = []
  for (const snapshot of previous?.occurrences ?? []) {
    if (byRoutine.has(snapshot.routineId)) {
      ordered.push(byRoutine.get(snapshot.routineId))
      byRoutine.delete(snapshot.routineId)
    }
  }
  return { date, occurrences: [...ordered, ...byRoutine.values()] }
}

export function reconcileWorkouts(data, today, initialize = false) {
  if (data.trackingStartedOn === null && !initialize) return data
  const trackingStartedOn = data.trackingStartedOn ?? today
  const dates = weekDates(today)
  const existing = data.weeklySchedules.find((week) => week.weekStart === dates[0])
  const days = dates.map((date) => {
    const previous = existing?.days.find((day) => day.date === date)
    if (previous && (date < today || date < trackingStartedOn)) return previous
    if (date < trackingStartedOn) return { date, occurrences: [] }
    return reconcileDate(data, date, previous)
  })
  const week = { weekStart: dates[0], days }
  const knownWeeks = data.weeklySchedules.map((item) => item.weekStart === week.weekStart ? week : { ...item, days: item.days.map((day) => day.date >= today && day.date >= trackingStartedOn ? reconcileDate(data, day.date, day) : day) })
  const weeklySchedules = existing ? knownWeeks : [...knownWeeks, week]
  return { ...data, trackingStartedOn, weeklySchedules }
}

export function selectTodayWorkouts(data, date) {
  const week = data.weeklySchedules.find((item) => item.weekStart === weekDates(date)[0])
  const occurrences = week?.days.find((day) => day.date === date)?.occurrences ?? []
  const workouts = occurrences.map((occurrence) => {
    const completion = findCompletion(data.workoutLogs, occurrence.routineId, date)
    const routine = data.routines.find((item) => item.id === occurrence.routineId)
    const day = routine?.days.find((item) => item.dayOfWeek === isoWeekday(date))
    const missingCount = completion ? 0 : day?.assignments.filter((assignment) => !data.exercises.some((exercise) => exercise.id === assignment.exerciseId)).length ?? 0
    return { ...(completion?.snapshot ?? occurrence), completed: Boolean(completion), completedAt: completion?.completedAt, routineAvailable: Boolean(routine), missingCount }
  })
  const drafts = data.routines.filter((routine) => routine.createdOn <= date && routine.days.some((day) => day.dayOfWeek === isoWeekday(date)) && !workouts.some((workout) => workout.routineId === routine.id))
    .map((routine) => ({ routineId: routine.id, routineName: routine.name }))
  return { date, workouts, drafts }
}

function isSnapshotValid(snapshot) {
  if (!snapshot || typeof snapshot.routineId !== 'string' || !snapshot.routineId.trim() || !isCalendarDate(snapshot.date) || typeof snapshot.routineName !== 'string' || !snapshot.routineName.trim() || !Array.isArray(snapshot.exercises) || !snapshot.exercises.length) return false
  const ids = new Set()
  return snapshot.exercises.every((exercise) => {
    if (!exercise || !isAssignmentRecordValid({ ...exercise, id: exercise.assignmentId }) || ids.has(exercise.assignmentId) || typeof exercise.name !== 'string' || !exercise.name.trim() || typeof exercise.muscle !== 'string' || !exercise.muscle.trim() || 'image' in exercise) return false
    ids.add(exercise.assignmentId)
    return true
  })
}

export function isWorkoutDataValid(data) {
  if (!Array.isArray(data.weeklySchedules) || !Array.isArray(data.workoutLogs)) return false
  if (data.trackingStartedOn !== null && !isCalendarDate(data.trackingStartedOn)) return false
  if (data.trackingStartedOn === null) return data.weeklySchedules.length === 0 && data.workoutLogs.length === 0
  const weeks = new Set()
  for (const week of data.weeklySchedules) {
    if (!week || typeof week !== 'object' || Array.isArray(week) || !isCalendarDate(week.weekStart) || isoWeekday(week.weekStart) !== 1 || weeks.has(week.weekStart) || !Array.isArray(week.days) || week.days.length !== 7) return false
    weeks.add(week.weekStart)
    const dates = weekDates(week.weekStart)
    for (const [index, day] of week.days.entries()) {
      if (day?.date !== dates[index] || !Array.isArray(day.occurrences) || (day.date < data.trackingStartedOn && day.occurrences.length)) return false
      const ids = new Set()
      for (const occurrence of day.occurrences) {
        if (!isSnapshotValid(occurrence) || occurrence.date !== day.date || ids.has(occurrence.routineId)) return false
        ids.add(occurrence.routineId)
      }
    }
  }
  const logIds = new Set()
  return data.workoutLogs.every((log) => {
    if (!log || typeof log !== 'object' || Array.isArray(log) || typeof log.id !== 'string' || !log.id.trim() || logIds.has(log.id) || log.status !== 'completed' || typeof log.completedAt !== 'string' || !Number.isFinite(Date.parse(log.completedAt)) || !isSnapshotValid(log.snapshot) || log.routineId !== log.snapshot.routineId || log.date !== log.snapshot.date || log.date < data.trackingStartedOn) return false
    logIds.add(log.id)
    return true
  })
}
