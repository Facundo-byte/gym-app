import { createEmptyDocument } from './storage.js'

const starters = [
  ['bench-press', 'Bench Press', 'Chest'],
  ['lat-pulldown', 'Lat Pulldown', 'Back'],
  ['squat', 'Squat', 'Legs'],
  ['lateral-raise', 'Lateral Raise', 'Shoulders'],
  ['biceps-curl', 'Biceps Curl', 'Biceps'],
  ['triceps-pushdown', 'Triceps Pushdown', 'Triceps'],
  ['incline-dumbbell-press', 'Incline Dumbbell Press', 'Chest'],
  ['romanian-deadlift', 'Romanian Deadlift', 'Legs'],
  ['cable-row', 'Cable Row', 'Back'],
]

export function createStarterDocument(timestamp) {
  return {
    ...createEmptyDocument(),
    exercises: starters.map(([id, name, muscle]) => ({ id: `exercise-${id}`, name, muscle, image: null, createdAt: timestamp, updatedAt: timestamp })),
  }
}
