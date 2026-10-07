// Replace an image path here, or replace its file in public/images/exercises/.
// These are bundled display assets, never saved into guest/account documents.
export const DEFAULT_EXERCISES = {
  'exercise-bench-press': { name: 'Bench Press', muscle: 'Chest', image: '/images/exercises/bench-press.webp' },
  'exercise-lat-pulldown': { name: 'Lat Pulldown', muscle: 'Back', image: '/images/exercises/lat-pulldown.webp' },
  'exercise-squat': { name: 'Squat', muscle: 'Legs', image: '/images/exercises/squat.webp' },
  'exercise-lateral-raise': { name: 'Lateral Raise', muscle: 'Shoulders', image: '/images/exercises/lateral-raise.webp' },
  'exercise-biceps-curl': { name: 'Biceps Curl', muscle: 'Biceps', image: '/images/exercises/biceps-curl.webp' },
  'exercise-triceps-pushdown': { name: 'Triceps Pushdown', muscle: 'Triceps', image: '/images/exercises/triceps-pushdown.webp' },
  'exercise-incline-dumbbell-press': { name: 'Incline Dumbbell Press', muscle: 'Chest', image: '/images/exercises/incline-dumbbell-press.webp' },
  'exercise-romanian-deadlift': { name: 'Romanian Deadlift', muscle: 'Legs', image: '/images/exercises/romanian-deadlift.webp' },
  'exercise-cable-row': { name: 'Cable Row', muscle: 'Back', image: '/images/exercises/cable-row.webp' },
}

export function getDefaultExerciseImage(exercise) {
  const entry = DEFAULT_EXERCISES[exercise?.id]
  // A starter renamed to a different exercise must not show a misleading pose.
  return entry && exercise.name === entry.name && exercise.muscle === entry.muscle ? entry.image : null
}
