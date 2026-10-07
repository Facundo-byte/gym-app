import { createEmptyDocument } from './storage.js'
import { DEFAULT_EXERCISES } from '../config/defaultExercises.js'

export function createStarterDocument(timestamp) {
  return {
    ...createEmptyDocument(),
    exercises: Object.entries(DEFAULT_EXERCISES).map(([id, { name, muscle }]) => ({ id, name, muscle, image: null, createdAt: timestamp, updatedAt: timestamp })),
  }
}
