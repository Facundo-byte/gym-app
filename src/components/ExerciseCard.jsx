import { Link } from 'react-router'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { useLanguage } from '../i18n/useLanguage.js'

export default function ExerciseCard({ exercise }) {
  const { t, exerciseName } = useLanguage()
  return (
    <Link className="exercise-card" to={`/exercises/${encodeURIComponent(exercise.id)}/edit`} aria-label={t('Edit {name}', { name: exerciseName(exercise) })}>
      <ExerciseThumbnail exercise={exercise} className="exercise-card__image" />
      <h2>{exerciseName(exercise)}</h2>
      <p>{t(exercise.muscle)}</p>
    </Link>
  )
}
