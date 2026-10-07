import { useLanguage } from '../i18n/useLanguage.js'
import { useEffect, useId, useRef, useState } from 'react'
import TextField from './TextField.jsx'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function ExercisePicker({ exercises, value, onChange, error, disabled, firstInputRef, searchRef, creationFlow }) {
  const { t, exerciseName, searchExercises } = useLanguage()
  const id = useId()
  const [localQuery, setLocalQuery] = useState('')
  const query = creationFlow?.query ?? localQuery
  const setQuery = creationFlow?.setQuery ?? setLocalQuery
  const selectedInputRef = useRef(null)
  const focusCreatedExercise = Boolean(creationFlow?.createdExerciseId && creationFlow.createdExerciseId === value)
  const matches = searchExercises(exercises, query)
  const selected = exercises.find((exercise) => exercise.id === value)

  useEffect(() => {
    if (focusCreatedExercise) {
      selectedInputRef.current?.focus()
      selectedInputRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [focusCreatedExercise])

  return (
    <fieldset className="exercise-picker" disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}>
      <legend>{t("Choose exercise")}</legend>
      {creationFlow && <ButtonLink className="exercise-picker__create" variant="secondary" to={creationFlow.createPath} onClick={(event) => { if (disabled) event.preventDefault() }} aria-disabled={disabled || undefined}><span aria-hidden="true">＋</span>{t("Create exercise")}</ButtonLink>}
      <TextField ref={searchRef} label={t("Search exercise library")} type="search" placeholder={t("Search by name")} value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="exercise-picker__results">
        {matches.map((exercise, index) => (
          <label className="exercise-choice" key={exercise.id}>
            <input type="radio" name={id} ref={(element) => { if (index === 0 && firstInputRef) firstInputRef.current = element; if (exercise.id === value) selectedInputRef.current = element }} value={exercise.id} checked={exercise.id === value} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={() => onChange(exercise.id)} />
            <ExerciseThumbnail exercise={exercise} />
            <span className="exercise-choice__copy"><strong>{exerciseName(exercise)}</strong><span>{t(exercise.muscle)}</span></span>
          </label>
        ))}
        {!matches.length && <div className="exercise-picker__empty"><p>{exercises.length ? t("No matching exercises. Try another name.") : t("Your exercise library is empty")}</p>{exercises.length ? <Button variant="secondary" onClick={() => setQuery('')}>{t("Clear search")}</Button> : <p>{t("Create an exercise in your library before adding one to this training day.")}</p>}</div>}
      </div>
      <p className="field__hint" role="status">{selected ? t('Selected: {name}', { name: exerciseName(selected) }) : t('Select one exercise to add to this training day.')}</p>
      {error && <p className="field__error" id={`${id}-error`}>{t(error)}</p>}
    </fieldset>
  )
}
