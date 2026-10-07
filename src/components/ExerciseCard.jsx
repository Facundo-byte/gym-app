import { Link } from 'react-router'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'

export default function ExerciseCard({ exercise }) {
  return (
    <Link className="exercise-card" to={`/exercises/${encodeURIComponent(exercise.id)}/edit`} aria-label={`Edit ${exercise.name}`}>
      <ExerciseThumbnail exercise={exercise} className="exercise-card__image" />
      <h2>{exercise.name}</h2>
      <p>{exercise.muscle}</p>
    </Link>
  )
}
