import { useLanguage } from '../i18n/useLanguage.js'
import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { countRoutineAssignments, weekdayName } from '../domain/routines.js'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmActionDialog from '../components/ConfirmActionDialog.jsx'
import AssignmentDayPanel from '../components/AssignmentDayPanel.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'

function RoutineDetail({ routine, exercises }) {
  const { t } = useLanguage()
  const { deleteRoutine } = useStorage()
  const { state } = useLocation()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const deleteLock = useRef(false)
  const sortedDays = [...routine.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  const day = sortedDays.find((item) => item.dayOfWeek === Number(search.get('day'))) ?? sortedDays[0]
  const assignmentCount = countRoutineAssignments(routine)
  const editPath = `/routines/${encodeURIComponent(routine.id)}/edit`

  async function remove() {
    if (deleteLock.current) return
    deleteLock.current = true
    setDeleting(true)
    setError('')
    try {
      await deleteRoutine(routine.id)
      navigate('/routines', { state: { message: 'Routine deleted.' } })
    } catch (failure) { setError(failure.message) } finally {
      deleteLock.current = false
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader eyebrow={t("TRAINING PLANS")} title={routine.name} description={sortedDays.map((item) => t(weekdayName(item.dayOfWeek))).join(' · ')} action={<ButtonLink to={editPath} variant="secondary">{t("Edit routine")}</ButtonLink>} />
      {state?.message && <p className="routine-status" role="status">{t(state.message)}</p>}
      <div className="page-body routine-detail">
        <div className="routine-day-selector" role="group" aria-label={t("Routine training days")}>
          {sortedDays.map((item) => <Button key={item.dayOfWeek} variant="secondary" aria-pressed={item.dayOfWeek === day.dayOfWeek} aria-controls="routine-day-panel" onClick={() => setSearch({ day: String(item.dayOfWeek) })}>{t(weekdayName(item.dayOfWeek))}</Button>)}
        </div>
        <p className="sr-only" role="status">{t('{day} selected.', { day: t(weekdayName(day.dayOfWeek)) })}</p>
        <AssignmentDayPanel key={`${routine.id}:${day.dayOfWeek}`} routine={routine} day={day} exercises={exercises} />
        <div className="routine-detail__actions">
          <ButtonLink to={editPath} variant="secondary" className="routine-detail__mobile-edit">{t("Edit routine")}</ButtonLink>
          <Button variant="danger" onClick={() => { setError(''); setDeleteOpen(true) }}>{t("Delete routine")}</Button>
          <ButtonLink to="/routines" variant="text">{t("Back to routines")}</ButtonLink>
        </div>
      </div>
      <ConfirmActionDialog open={deleteOpen} title={t("Delete routine?")} confirmLabel={t("Delete routine")} onConfirm={remove} onClose={() => setDeleteOpen(false)} busy={deleting} error={error}>
        <p>{t(routine.days.length === 1 ? 'Delete “{name}” and its {count} training day? This cannot be undone.' : 'Delete “{name}” and its {count} training days? This cannot be undone.', { name: routine.name, count: routine.days.length })}</p>
        {assignmentCount > 0 && <p>{t(assignmentCount === 1 ? 'This removes {count} live exercise assignment from the routine.' : 'This removes {count} live exercise assignments from the routine.', { count: assignmentCount })}</p>}
        <p>{t("Past workout history will be kept. Exercises in your library will not be deleted.")}</p>
      </ConfirmActionDialog>
    </>
  )
}

export default function RoutineDetailPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const { status, data } = useStorage()
  const routine = data?.routines.find((item) => item.id === id)
  if (status === 'ready' && routine) return <RoutineDetail key={id} routine={routine} exercises={data.exercises} />
  return (
    <>
      <PageHeader eyebrow={t("TRAINING PLANS")} title={status === 'ready' ? t("Routine not found") : t("Routine")} />
      {status === 'loading' && <p className="routine-status" role="status">{t("Loading your routine…")}</p>}
      {status === 'error' && <Card className="page-body"><EmptyState title={t("Your routine is unavailable")} description={t("Resolve the storage issue above to safely view and save routines.")}><ButtonLink to="/routines">{t("Back to routines")}</ButtonLink></EmptyState></Card>}
      {status === 'ready' && <Card className="page-body"><EmptyState title={t("Choose another training plan")} description={t("This routine may have been deleted, or the address is incorrect.")}><ButtonLink to="/routines">{t("Back to routines")}</ButtonLink></EmptyState></Card>}
    </>
  )
}
