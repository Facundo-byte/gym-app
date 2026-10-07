import { useLanguage } from '../i18n/useLanguage.js'
import { useEffect, useRef, useState } from 'react'
import { useStorage } from '../app/useStorage.js'
import { countMissingExercises, weekdayName } from '../domain/routines.js'
import Card from './Card.jsx'
import EmptyState from './EmptyState.jsx'
import AssignmentRow from './AssignmentRow.jsx'
import ConfirmActionDialog from './ConfirmActionDialog.jsx'
import { ButtonLink } from './Button.jsx'

export default function AssignmentDayPanel({ routine, day, exercises }) {
  const { t, exerciseName } = useLanguage()
  const { removeAssignment, reorderAssignments } = useStorage()
  const [removeTarget, setRemoveTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const operationLock = useRef(false)
  const focusTarget = useRef(null)
  const addRef = useRef(null)
  const basePath = `/routines/${encodeURIComponent(routine.id)}/days/${day.dayOfWeek}/assignments`
  const missing = countMissingExercises(day, exercises)
  const selectedExercise = exercises.find((exercise) => exercise.id === removeTarget?.exerciseId)

  useEffect(() => {
    if (busy || !focusTarget.current) return
    const { id, direction } = focusTarget.current
    const row = document.getElementById(`assignment-${id}`)
    const button = row?.querySelector(`[data-direction="${direction}"]:not(:disabled)`)
    const fallback = row?.querySelector('button:not(:disabled), a[href]') ?? addRef.current
    ;(button ?? fallback)?.focus()
    focusTarget.current = null
  }, [day.assignments, busy, removeTarget])

  async function move(id, offset) {
    if (operationLock.current) return
    const order = day.assignments.map((assignment) => assignment.id)
    const index = order.indexOf(id)
    const next = index + offset
    if (index < 0 || next < 0 || next >= order.length) return
    ;[order[index], order[next]] = [order[next], order[index]]
    operationLock.current = true
    focusTarget.current = { id, direction: offset < 0 ? 'up' : 'down' }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await reorderAssignments(routine.id, day.dayOfWeek, order)
      setMessage(`Exercise moved ${offset < 0 ? 'up' : 'down'}.`)
    } catch (failure) { setError(failure.message) } finally {
      operationLock.current = false
      setBusy(false)
    }
  }

  async function remove() {
    if (operationLock.current || !removeTarget) return
    operationLock.current = true
    setBusy(true)
    setError('')
    setMessage('')
    const index = day.assignments.findIndex((assignment) => assignment.id === removeTarget.id)
    try {
      await removeAssignment(routine.id, day.dayOfWeek, removeTarget.id)
      focusTarget.current = { id: day.assignments[index + 1]?.id ?? day.assignments[index - 1]?.id, direction: 'up' }
      setRemoveTarget(null)
      setMessage('Exercise removed from this training day.')
    } catch (failure) { setError(failure.message) } finally {
      operationLock.current = false
      setBusy(false)
    }
  }

  return (
    <>
      <Card id="routine-day-panel" role="region" aria-labelledby="routine-day-title">
        <div className="assignment-day-heading">
          <div><h2 id="routine-day-title">{t(weekdayName(day.dayOfWeek))}</h2><p>{t(day.assignments.length === 1 ? '{count} exercise assignment' : '{count} exercise assignments', { count: day.assignments.length })}</p></div>
          <ButtonLink ref={addRef} to={`${basePath}/new`} onClick={(event) => { if (busy) event.preventDefault() }} aria-disabled={busy || undefined}>{t("+ Add exercise")}</ButtonLink>
        </div>
        {missing > 0 && <p className="routine-reference-notice" role="status">{t(missing === 1 ? '{count} saved assignment refers to a missing exercise. Edit it to choose a replacement, or remove it. Your saved data has been kept.' : '{count} saved assignments refer to a missing exercise. Edit it to choose a replacement, or remove it. Your saved data has been kept.', { count: missing })}</p>}
        {day.assignments.length ? (
          <ol className="assignment-list" aria-label={t('{day} exercises', { day: t(weekdayName(day.dayOfWeek)) })}>
            {day.assignments.map((assignment, index) => <AssignmentRow key={assignment.id} assignment={assignment} exercise={exercises.find((exercise) => exercise.id === assignment.exerciseId)} index={index} total={day.assignments.length} editPath={`${basePath}/${encodeURIComponent(assignment.id)}/edit`} busy={busy} onMove={move} onRemove={(item) => { setError(''); setRemoveTarget(item) }} />)}
          </ol>
        ) : <EmptyState headingLevel={3} title={t('No exercises for {day} yet', { day: t(weekdayName(day.dayOfWeek)) })} description={t("Choose an exercise from your library and set its targets for this training day.")} />}
        {error && !removeTarget && <p className="field__error" role="alert">{t(error)}</p>}
        {message && <p className="routine-status" role="status">{t(message)}</p>}
      </Card>
      <ConfirmActionDialog open={Boolean(removeTarget)} title={t("Remove exercise from day?")} confirmLabel={t("Remove assignment")} onConfirm={remove} onClose={() => { setRemoveTarget(null); setError('') }} busy={busy} error={error}>
        <p>{t('Remove “{name}” from {day} in “{routine}”?', { name: exerciseName(selectedExercise), day: t(weekdayName(day.dayOfWeek)), routine: routine.name })}</p>
        <p>{t("This removes only this occurrence. Other training days, library exercises, and past workout history will be kept.")}</p>
      </ConfirmActionDialog>
    </>
  )
}
