import { useLanguage } from '../i18n/useLanguage.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { isoWeekday } from '../domain/dates.js'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button } from './Button.jsx'

export default function WorkoutCard({ workout, exercises, readOnly = false }) {
  const { t, exerciseName, number } = useLanguage()
  const { completeWorkout } = useStorage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const moveFocus = useRef(false)
  const completedRef = useRef(null)

  useEffect(() => {
    if (workout.completed && moveFocus.current) {
      completedRef.current?.focus()
      moveFocus.current = false
    }
  }, [workout.completed])

  async function finish() {
    if (lock.current || workout.completed || readOnly) return
    lock.current = true
    setSaving(true)
    setError('')
    moveFocus.current = true
    try { await completeWorkout(workout.routineId, workout.date) } catch (failure) {
      moveFocus.current = false
      setError(failure.message)
    } finally { lock.current = false; setSaving(false) }
  }

  return (
    <article className="workout-card" aria-label={workout.routineName} aria-busy={saving}>
      <div className="workout-card__heading">
        <h3>{workout.routineAvailable ? <Link to={`/routines/${encodeURIComponent(workout.routineId)}?day=${isoWeekday(workout.date)}`}>{workout.routineName}</Link> : workout.routineName}</h3>
        <span className={`workout-badge ${workout.completed ? 'workout-badge--completed' : ''}`}>{workout.completed ? t("✓ Completed") : t("Ready to train")}</span>
      </div>
      {!workout.routineAvailable && <p className="card__description">{t("Saved workout · the original routine has been removed.")}</p>}
      {workout.missingCount > 0 && <p className="workout-notice">{t(workout.missingCount === 1 ? '{count} unavailable exercise is excluded. Open the routine to review its assignments.' : '{count} unavailable exercises are excluded. Open the routine to review its assignments.', { count: workout.missingCount })}</p>}
      <ol className="workout-exercises" aria-label={t('{name} planned exercises', { name: workout.routineName })}>
        {workout.exercises.map((exercise) => (
          <li className="workout-exercise" key={exercise.assignmentId}>
            <ExerciseThumbnail exercise={exercises.find((item) => item.id === exercise.exerciseId)} />
            <div className="workout-exercise__copy"><h4>{exerciseName(exercise)}</h4><p>{t(exercise.muscle)}</p></div>
            <div className="workout-exercise__targets"><strong>{exercise.sets} × {exercise.reps}</strong><span>{number(exercise.targetWeight)}{' '}{t("kg")}</span></div>
          </li>
        ))}
      </ol>
      <div className="workout-card__actions">
        {workout.completed ? <p className="workout-completed" role="status" tabIndex={-1} ref={completedRef}>{t("Workout completed and saved.")}</p> : <p className="card__description">{t("Finish when you have completed this session.")}</p>}
        <Button disabled={saving || workout.completed || readOnly} onClick={finish} aria-label={t(workout.completed ? 'Completed workout: {name}' : 'Finish workout: {name}', { name: workout.routineName })}>{saving ? t("Saving…") : workout.completed ? t("Workout completed") : t("Finish workout")}</Button>
      </div>
      {error && <p className="field__error" role="alert">{t(error)}</p>}
    </article>
  )
}
