import Card from './Card.jsx'
import { ButtonLink } from './Button.jsx'
import { countRoutineExercises, weekdayName } from '../domain/routines.js'

export default function RoutineCard({ routine, exercises }) {
  const count = countRoutineExercises(routine, exercises)
  return (
    <Card className="routine-card">
      <h2>{routine.name}</h2>
      <p className="routine-card__days">{routine.days.map((day) => weekdayName(day.dayOfWeek)).join(' · ')}</p>
      <p className="routine-card__count">{count} {count === 1 ? 'distinct exercise' : 'distinct exercises'}</p>
      <ButtonLink variant="secondary" to={`/routines/${encodeURIComponent(routine.id)}`} aria-label={`View ${routine.name}`}>View routine <span aria-hidden="true">→</span></ButtonLink>
    </Card>
  )
}
