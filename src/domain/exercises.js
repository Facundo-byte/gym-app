export const MAX_IMAGE_BYTES = 256 * 1024
export const MAX_SOURCE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 640
export const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Glutes', 'Core', 'Full body', 'Other']

export class ValidationError extends Error {
  constructor(errors) {
    super('Check the highlighted fields before saving.')
    this.name = 'ValidationError'
    this.errors = errors
  }
}

export function isStoredImageValid(image) {
  return image == null || (typeof image === 'string' && image.length <= MAX_IMAGE_BYTES && /^data:image\/(png|jpeg);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/.test(image))
}

export function validateExerciseInput(input = {}) {
  input = input ?? {}
  const errors = {}
  if (typeof input.name !== 'string' || !input.name.trim()) errors.name = 'Enter an exercise name.'
  if (typeof input.muscle !== 'string' || !input.muscle.trim()) errors.muscle = 'Select a target muscle.'
  if (!isStoredImageValid(input.image)) errors.image = 'Use a processed PNG or JPG image under 256 KiB.'
  return errors
}

export function normalizeExerciseInput(input) {
  const errors = validateExerciseInput(input)
  if (Object.keys(errors).length) throw new ValidationError(errors)
  return { name: input.name.trim(), muscle: input.muscle.trim(), image: input.image ?? null }
}

export function searchExercises(exercises, query) {
  const term = query.trim().toLowerCase()
  return exercises.filter((exercise) => exercise.name.toLowerCase().includes(term))
}

export function countExerciseAssignments(routines, exerciseId) {
  return routines.reduce((count, routine) => count + (Array.isArray(routine.days) ? routine.days : []).reduce(
    (dayCount, day) => dayCount + (Array.isArray(day?.assignments) ? day.assignments : []).filter((assignment) => assignment?.exerciseId === exerciseId).length, 0,
  ), 0)
}

export function removeExerciseAssignments(routines, exerciseId, updatedAt) {
  return routines.map((routine) => {
    if (!countExerciseAssignments([routine], exerciseId)) return routine
    return {
      ...routine, updatedAt,
      days: routine.days.map((day) => Array.isArray(day?.assignments) ? { ...day, assignments: day.assignments.filter((assignment) => assignment?.exerciseId !== exerciseId) } : day),
    }
  })
}
