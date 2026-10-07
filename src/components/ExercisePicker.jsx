import { useLanguage } from '../i18n/useLanguage.js'
import { useId, useState } from 'react'
import TextField from './TextField.jsx'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button } from './Button.jsx'

export default function ExercisePicker({ exercises, value, onChange, error, disabled, firstInputRef, searchRef }) {
  const { t, exerciseName, searchExercises } = useLanguage()
  const id = useId()
  const [query, setQuery] = useState('')
  const matches = searchExercises(exercises, query)
  const selected = exercises.find((exercise) => exercise.id === value)
  return (
    <fieldset className="exercise-picker" disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}>
      <legend>{t("Choose exercise")}</legend>
      <TextField ref={searchRef} label={t("Search exercise library")} type="search" placeholder={t("Search by name")} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="exercise-picker__results">
        {matches.map((exercise, index) => (
          <label className="exercise-choice" key={exercise.id}>
            <input type="radio" name={id} ref={index === 0 ? firstInputRef : undefined} value={exercise.id} checked={exercise.id === value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={() => onChange(exercise.id)} />
            <ExerciseThumbnail exercise={exercise} />
            <span className="exercise-choice__copy"><strong>{exerciseName(exercise)}</strong><span>{t(exercise.muscle)}</span></span>
          </label>
        ))}
        {!matches.length && <div className="exercise-picker__empty"><p>{t("No matching exercises. Try another name.")}</p><Button variant="secondary" onClick={() => setQuery('')}>{t("Clear search")}</Button></div>}
      </div>
      <p className="field__hint" role="status">{selected ? t('Selected: {name}', { name: exerciseName(selected) }) : t('Select one exercise to add to this training day.')}</p>
      {error && <p className="field__error" id={`${id}-error`}>{t(error)}</p>}
    </fieldset>
  )
}
