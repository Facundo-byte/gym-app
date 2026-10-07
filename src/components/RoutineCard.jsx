import { useLanguage } from '../i18n/useLanguage.js'
import Card from './Card.jsx'
import { ButtonLink } from './Button.jsx'
import { countRoutineExercises, weekdayName } from '../domain/routines.js'

export default function RoutineCard({ routine, exercises }) {
  const { t } = useLanguage()
  const count = countRoutineExercises(routine, exercises)
  return (
    <Card className="routine-card">
      <h2>{routine.name}</h2>
      <p className="routine-card__days">{routine.days.map((day) => t(weekdayName(day.dayOfWeek))).join(' · ')}</p>
      <p className="routine-card__count">{t(count === 1 ? '{count} distinct exercise' : '{count} distinct exercises', { count })}</p>
      <ButtonLink variant="secondary" to={`/routines/${encodeURIComponent(routine.id)}`} aria-label={t('View {name}', { name: routine.name })}>{t("View routine")}{' '}<span aria-hidden="true">→</span></ButtonLink>
    </Card>
  )
}
