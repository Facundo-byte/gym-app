import { DEFAULT_EXERCISES } from '../config/defaultExercises.js'
import { spanish } from './es.js'
import { messagePatterns } from './messagePatterns.js'

export function translate(message, language, values = {}) {
  if (message == null) return ''
  let template = message
  if (language === 'es') {
    template = spanish[message]
    if (template === undefined) {
      for (const [pattern, replacement] of messagePatterns) {
        const match = message.match(pattern)
        if (match) { template = replacement(match); break }
      }
    }
    template ??= message
  }
  return template.replace(/\{(\w+)\}/g, (token, name) => Object.hasOwn(values, name) ? String(values[name]) : token)
}

export function localizedExerciseName(exercise, language) {
  if (!exercise) return translate('Missing exercise', language)
  const defaultExercise = DEFAULT_EXERCISES[exercise.id ?? exercise.exerciseId]
  return defaultExercise && exercise.name === defaultExercise.name && exercise.muscle === defaultExercise.muscle
    ? translate(exercise.name, language) : exercise.name
}

function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function searchLocalizedExercises(exercises, query, language) {
  const term = normalizeSearch(query)
  return exercises.filter(exercise => [exercise.name, localizedExerciseName(exercise, language)].some(name => normalizeSearch(name).includes(term)))
}
