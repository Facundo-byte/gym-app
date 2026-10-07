import ExerciseThumbnail from './ExerciseThumbnail.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function AssignmentRow({ assignment, exercise, index, total, editPath, busy, onMove, onRemove }) {
  const name = exercise?.name ?? 'Missing exercise'
  return (
    <li className="assignment-row" id={`assignment-${assignment.id}`} aria-label={`${name}, item ${index + 1}`}>
      <ExerciseThumbnail exercise={exercise} />
      <div className="assignment-row__copy">
        <h3>{name}</h3>
        <p>{exercise?.muscle ?? 'Choose a replacement or remove this assignment.'}</p>
      </div>
      <div className="assignment-row__targets"><strong>{assignment.sets} × {assignment.reps}</strong><span>{assignment.targetWeight} kg</span></div>
      <div className="assignment-row__actions">
        <Button variant="secondary" data-direction="up" aria-label={`Move ${name}, item ${index + 1}, up`} disabled={busy || index === 0} onClick={() => onMove(assignment.id, -1)}>↑</Button>
        <Button variant="secondary" data-direction="down" aria-label={`Move ${name}, item ${index + 1}, down`} disabled={busy || index === total - 1} onClick={() => onMove(assignment.id, 1)}>↓</Button>
        <ButtonLink variant="secondary" to={editPath} onClick={(event) => { if (busy) event.preventDefault() }} aria-disabled={busy || undefined} aria-label={`Edit targets for ${name}, item ${index + 1}`}>Edit</ButtonLink>
        <Button variant="text" disabled={busy} onClick={() => onRemove(assignment)} aria-label={`Remove ${name}, item ${index + 1}`}>Remove</Button>
      </div>
    </li>
  )
}
