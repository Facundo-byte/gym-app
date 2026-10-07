import { useLanguage } from '../i18n/useLanguage.js'
import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function AssignmentRow({ assignment, exercise, index, total, editPath, busy, onMove, onRemove }) {
  const { t, exerciseName, number } = useLanguage()
  const name = exerciseName(exercise)
  return (
    <li className="assignment-row" id={`assignment-${assignment.id}`} aria-label={t('{name}, item {position}', { name, position: index + 1 })}>
      <ExerciseThumbnail exercise={exercise} />
      <div className="assignment-row__copy">
        <h3>{name}</h3>
        <p>{t(exercise?.muscle ?? 'Choose a replacement or remove this assignment.')}</p>
      </div>
      <div className="assignment-row__targets"><strong>{assignment.sets} × {assignment.reps}</strong><span>{number(assignment.targetWeight)}{' '}{t("kg")}</span></div>
      <div className="assignment-row__actions">
        <Button variant="secondary" data-direction="up" aria-label={t('Move {name}, item {position}, up', { name, position: index + 1 })} disabled={busy || index === 0} onClick={() => onMove(assignment.id, -1)}>↑</Button>
        <Button variant="secondary" data-direction="down" aria-label={t('Move {name}, item {position}, down', { name, position: index + 1 })} disabled={busy || index === total - 1} onClick={() => onMove(assignment.id, 1)}>↓</Button>
        <ButtonLink variant="secondary" to={editPath} onClick={(event) => { if (busy) event.preventDefault() }} aria-disabled={busy || undefined} aria-label={t('Edit targets for {name}, item {position}', { name, position: index + 1 })}>{t("Edit")}</ButtonLink>
        <Button variant="text" disabled={busy} onClick={() => onRemove(assignment)} aria-label={t('Remove {name}, item {position}', { name, position: index + 1 })}>{t("Remove")}</Button>
      </div>
    </li>
  )
}
