import test from 'node:test'
import assert from 'node:assert/strict'
import { translate, localizedExerciseName, searchLocalizedExercises } from './translate.js'
import { createLanguagePreference, LANGUAGE_KEY, STORAGE_KEY } from '../services/storage.js'
import { DEFAULT_EXERCISES } from '../config/defaultExercises.js'

test('English fallback and Spanish placeholders preserve user values literally', () => {
  assert.equal(translate('Home', 'es'), 'Inicio')
  assert.equal(translate('Your routines', 'en'), 'Your routines')
  assert.equal(translate('New untranslated copy', 'es'), 'New untranslated copy')
  assert.equal(translate(undefined, 'es'), '')
  assert.equal(translate('Edit {name}', 'es', { name: 'My {count} <plan>' }), 'Editar My {count} <plan>')
  assert.equal(translate('{completed} of {scheduled}', 'es', { completed: 1, scheduled: 2 }), '1 de 2')
})

test('only unchanged starters receive translated names, including saved snapshots', () => {
  const exercise = { id: 'exercise-bench-press', ...DEFAULT_EXERCISES['exercise-bench-press'] }
  assert.equal(localizedExerciseName(exercise, 'es'), 'Press de banca')
  assert.equal(localizedExerciseName(exercise, 'en'), 'Bench Press')
  assert.equal(localizedExerciseName({ ...exercise, id: 'custom' }, 'es'), 'Bench Press')
  assert.equal(localizedExerciseName({ ...exercise, name: 'My Bench' }, 'es'), 'My Bench')
  assert.equal(localizedExerciseName({ exerciseId: exercise.id, name: exercise.name, muscle: exercise.muscle }, 'es'), 'Press de banca')
  assert.equal(localizedExerciseName(undefined, 'es'), 'Ejercicio no disponible')
})

test('search accepts localized and original names without requiring accents', () => {
  const exercises = Object.entries(DEFAULT_EXERCISES).map(([id, exercise]) => ({ id, ...exercise }))
  assert.equal(searchLocalizedExercises(exercises, ' BICEPS ', 'es')[0].name, 'Biceps Curl')
  assert.equal(searchLocalizedExercises(exercises, 'jalon', 'es')[0].name, 'Lat Pulldown')
  assert.equal(searchLocalizedExercises(exercises, 'lat pulldown', 'es')[0].name, 'Lat Pulldown')
  assert.equal(searchLocalizedExercises(exercises, 'unknown', 'es').length, 0)
})

test('dynamic recovery, weekday success and provider errors are localized', () => {
  assert.equal(translate('Exercise added to Wednesday.', 'es'), 'Ejercicio agregado al miércoles.')
  assert.equal(translate('Exercise moved up.', 'es'), 'Ejercicio movido hacia arriba.')
  assert.match(translate('Exclude 2 invalid exercise records. Valid assignments referencing them stay visible as missing exercises.', 'es'), /^Excluir 2 registros de ejercicios inválidos\./)
  assert.match(translate('Password should be at least 8 characters.', 'es'), /al menos 8 caracteres/)
  assert.equal(translate('Invalid login credentials', 'es'), 'El correo o la contraseña son incorrectos.')
})

test('language preference preserves guest data, rejects invalid values and survives unavailable storage', () => {
  const entries = new Map([[STORAGE_KEY, 'exact saved guest bytes'], [LANGUAGE_KEY, 'fr']])
  const adapter = createLanguagePreference({ getStorage: () => ({ getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) }) })
  assert.equal(adapter.load(), 'en')
  assert.equal(adapter.save('es'), true)
  assert.equal(adapter.load(), 'es')
  assert.equal(adapter.save('fr'), false)
  assert.equal(entries.get(STORAGE_KEY), 'exact saved guest bytes')
  const blocked = createLanguagePreference({ getStorage: () => { throw new Error('blocked') } })
  assert.equal(blocked.load(), 'en')
  assert.equal(blocked.save('es'), false)
})
