import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { isoWeekday } from '../domain/dates.js'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button } from './Button.jsx'

export default function WorkoutCard({ workout, exercises, readOnly = false }) {
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
        <span className={`workout-badge ${workout.completed ? 'workout-badge--completed' : ''}`}>{workout.completed ? '✓ Completed' : 'Ready to train'}</span>
      </div>
      {!workout.routineAvailable && <p className="card__description">Saved workout · the original routine has been removed.</p>}
      {workout.missingCount > 0 && <p className="workout-notice">{workout.missingCount} unavailable {workout.missingCount === 1 ? 'exercise is' : 'exercises are'} excluded. Open the routine to review its assignments.</p>}
      <ol className="workout-exercises" aria-label={`${workout.routineName} planned exercises`}>
        {workout.exercises.map((exercise) => (
          <li className="workout-exercise" key={exercise.assignmentId}>
            <ExerciseThumbnail exercise={exercises.find((item) => item.id === exercise.exerciseId)} />
            <div className="workout-exercise__copy"><h4>{exercise.name}</h4><p>{exercise.muscle}</p></div>
            <div className="workout-exercise__targets"><strong>{exercise.sets} × {exercise.reps}</strong><span>{exercise.targetWeight} kg</span></div>
          </li>
        ))}
      </ol>
      <div className="workout-card__actions">
        {workout.completed ? <p className="workout-completed" role="status" tabIndex={-1} ref={completedRef}>Workout completed and saved.</p> : <p className="card__description">Finish when you have completed this session.</p>}
        <Button disabled={saving || workout.completed || readOnly} onClick={finish} aria-label={`${workout.completed ? 'Completed workout' : 'Finish workout'}: ${workout.routineName}`}>{saving ? 'Saving…' : workout.completed ? 'Workout completed' : 'Finish workout'}</Button>
      </div>
      {error && <p className="field__error" role="alert">{error}</p>}
    </article>
  )
}
