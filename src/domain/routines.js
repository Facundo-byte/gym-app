import { ValidationError } from './exercises.js'
import { isCalendarDate } from './dates.js'

export const WEEKDAYS = [
  { value: 1, name: 'Monday', short: 'Mon' },
  { value: 2, name: 'Tuesday', short: 'Tue' },
  { value: 3, name: 'Wednesday', short: 'Wed' },
  { value: 4, name: 'Thursday', short: 'Thu' },
  { value: 5, name: 'Friday', short: 'Fri' },
  { value: 6, name: 'Saturday', short: 'Sat' },
  { value: 7, name: 'Sunday', short: 'Sun' },
]

export function weekdayName(value) {
  return WEEKDAYS.find((day) => day.value === value)?.name ?? 'Unknown day'
}

export function validateRoutineInput(input = {}) {
  const errors = {}
  if (typeof input?.name !== 'string' || !input.name.trim()) errors.name = 'Enter a routine name.'
  if (!Array.isArray(input?.weekdays) || !input.weekdays.length) errors.weekdays = 'Select at least one training day.'
  else if (input.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7) || new Set(input.weekdays).size !== input.weekdays.length) errors.weekdays = 'Choose distinct days from Monday through Sunday.'
  return errors
}

export function normalizeRoutineInput(input) {
  const errors = validateRoutineInput(input)
  if (Object.keys(errors).length) throw new ValidationError(errors)
  return { name: input.name.trim(), weekdays: [...input.weekdays].sort((a, b) => a - b) }
}

export function isRoutineRecordValid(routine) {
  if (!routine || typeof routine.id !== 'string' || !routine.id.trim() || !Array.isArray(routine.days)) return false
  if (Object.keys(validateRoutineInput({ name: routine.name, weekdays: routine.days.map((day) => day?.dayOfWeek) })).length) return false
  if (!isCalendarDate(routine.createdOn)) return false
  if (['createdAt', 'updatedAt'].some((field) => typeof routine[field] !== 'string' || !Number.isFinite(Date.parse(routine[field])))) return false
  return routine.days.every((day) => Array.isArray(day.assignments) && day.assignments.every((assignment) => assignment && typeof assignment === 'object' && !Array.isArray(assignment) && typeof assignment.exerciseId === 'string' && assignment.exerciseId.trim()))
}

export function getRemovedPopulatedDays(routine, weekdays) {
  return routine.days.filter((day) => !weekdays.includes(day.dayOfWeek) && day.assignments.length > 0)
}

export function updateRoutineDays(routine, weekdays) {
  return weekdays.map((dayOfWeek) => routine.days.find((day) => day.dayOfWeek === dayOfWeek) ?? { dayOfWeek, assignments: [] })
}

export function countRoutineExercises(routine, exercises) {
  const existing = new Set(exercises.map((exercise) => exercise.id))
  return new Set(routine.days.flatMap((day) => day.assignments.map((assignment) => assignment.exerciseId)).filter((id) => existing.has(id))).size
}

export function countRoutineAssignments(routine) {
  return routine.days.reduce((count, day) => count + day.assignments.length, 0)
}

export function countMissingExercises(day, exercises) {
  const existing = new Set(exercises.map((exercise) => exercise.id))
  return day.assignments.filter((assignment) => !existing.has(assignment.exerciseId)).length
}
