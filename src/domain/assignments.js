import { ValidationError } from './exercises.js'

function numericValue(value) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim()) return Number(value)
  return NaN
}

export function validateAssignmentInput(input, exercises) {
  const errors = {}
  if (typeof input?.exerciseId !== 'string' || !input.exerciseId.trim() || (exercises && !exercises.some((exercise) => exercise.id === input.exerciseId))) errors.exerciseId = 'Choose an exercise from your library.'
  for (const field of ['sets', 'reps']) {
    const value = numericValue(input?.[field])
    if (!Number.isSafeInteger(value) || value <= 0) errors[field] = 'Enter a positive whole number.'
  }
  const weight = numericValue(input?.targetWeight)
  if (!Number.isFinite(weight) || weight < 0) errors.targetWeight = 'Enter a weight of 0 kg or more.'
  return errors
}

export function normalizeAssignmentInput(input, exercises) {
  const errors = validateAssignmentInput(input, exercises)
  if (Object.keys(errors).length) throw new ValidationError(errors)
  return { exerciseId: input.exerciseId, sets: numericValue(input.sets), reps: numericValue(input.reps), targetWeight: numericValue(input.targetWeight) }
}

export function isAssignmentRecordValid(assignment) {
  return typeof assignment?.id === 'string' && Boolean(assignment.id.trim()) && Object.keys(validateAssignmentInput(assignment)).length === 0 && ['sets', 'reps', 'targetWeight'].every((field) => typeof assignment[field] === 'number')
}

export function reorderDayAssignments(assignments, orderedIds) {
  if (!Array.isArray(orderedIds) || orderedIds.length !== assignments.length || new Set(orderedIds).size !== assignments.length || orderedIds.some((id) => !assignments.some((assignment) => assignment.id === id))) {
    throw new Error('The exercise order has changed. Reload this day before reordering.')
  }
  const byId = new Map(assignments.map((assignment) => [assignment.id, assignment]))
  return orderedIds.map((id) => byId.get(id))
}
