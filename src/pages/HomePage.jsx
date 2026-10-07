import { useEffect, useState } from 'react'
import { useStorage } from '../app/useStorage.js'
import { useLocalDate } from '../app/useLocalDate.js'
import { isoWeekday, parseLocalDate } from '../domain/dates.js'
import { reconcileWorkouts, selectTodayWorkouts } from '../domain/workouts.js'
import { selectWeeklyProgress } from '../domain/weeklyProgress.js'
import Card from '../components/Card.jsx'
import PageHeader from '../components/PageHeader.jsx'
import EmptyState from '../components/EmptyState.jsx'
import WeeklyProgressCard from '../components/WeeklyProgressCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import WorkoutCard from '../components/WorkoutCard.jsx'

export default function HomePage() {
  const { status, data, recovery, noticeError, prepareTodayWorkouts } = useStorage()
  const date = useLocalDate()
  const [request, setRequest] = useState({ date: null, error: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (status !== 'ready' || recovery || noticeError) return
    let active = true
    prepareTodayWorkouts(date).then(
      () => { if (active) setRequest({ date, error: '' }) },
      (failure) => { if (active) setRequest({ date, error: failure.message }) },
    )
    return () => { active = false }
  }, [date, status, recovery, noticeError, prepareTodayWorkouts, attempt])
  const preview = status === 'ready' && Boolean(recovery)
  const ready = preview || (status === 'ready' && request.date === date && !request.error)
  const viewData = preview ? reconcileWorkouts(data, date, true) : data
  const { workouts, drafts } = ready ? selectTodayWorkouts(viewData, date) : { workouts: [], drafts: [] }
  const dateLabel = parseLocalDate(date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  return (
    <>
      <PageHeader eyebrow="HOME" title="Your training, organized" description="Build your week. Make every session count." />
      <div className="page-body home-grid">
        <Card className="today-workouts" aria-labelledby="workout-heading">
          <h2 id="workout-heading" className="card__title">Today&apos;s workout</h2>
          <p className="today-workouts__date"><time dateTime={date}>{dateLabel}</time></p>
          {status === 'error' && <EmptyState headingLevel={3} title="Your workouts are unavailable" description="Resolve the storage issue above to safely view and save your training." />}
          {!preview && status !== 'error' && !noticeError && request.date !== date && <p className="routine-status" role="status">Loading today&apos;s workouts…</p>}
          {noticeError && !ready && <p className="routine-status">Reload using the notice above to view the latest workouts.</p>}
          {!preview && request.date === date && request.error && <div className="workout-load-error"><p className="field__error" role="alert">{request.error}</p><Button variant="secondary" onClick={() => { setRequest({ date: null, error: '' }); setAttempt((value) => value + 1) }}>Retry loading workouts</Button></div>}
          {ready && <>
            {preview && <p className="workout-notice">Recovery preview · review the changes above before saving or finishing a workout.</p>}
            {!workouts.length && <EmptyState headingLevel={3} title="Rest day" description="No workout scheduled for today."><ButtonLink to="/routines" variant="secondary">Explore routines</ButtonLink></EmptyState>}
            <div className="today-workouts__list">{workouts.map((workout) => <WorkoutCard key={`${workout.routineId}:${date}`} workout={workout} exercises={data.exercises} readOnly={preview || Boolean(noticeError)} />)}</div>
            {drafts.length > 0 && <div className="workout-drafts"><h3>Training days to configure</h3><p className="card__description">Add at least one available exercise before finishing these workouts.</p>{drafts.map((draft) => <div key={draft.routineId}><ButtonLink variant="secondary" to={`/routines/${encodeURIComponent(draft.routineId)}?day=${isoWeekday(date)}`}>Configure {draft.routineName}</ButtonLink><Button disabled aria-label={`Finish workout: ${draft.routineName}`}>Finish workout</Button></div>)}</div>}
          </>}
        </Card>
        <WeeklyProgressCard progress={ready ? selectWeeklyProgress(viewData, date) : null} error={status === 'error' || (!preview && Boolean(request.error))} />
      </div>
    </>
  )
}
