import { parseLocalDate } from '../domain/dates.js'
import Card from './Card.jsx'
import WeekdayStrip from './WeekdayStrip.jsx'

export default function WeeklyProgressCard({ progress, error }) {
  const weekLabel = progress ? [progress.weekStart, progress.weekEnd].map((date) => parseLocalDate(date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })).join(' – ') : ''
  return (
    <Card className="weekly-progress" aria-labelledby="progress-heading">
      <h2 id="progress-heading">Weekly progress</h2>
      {!progress ? <p className="card__description" role="status">{error ? 'Weekly progress is unavailable until your schedule can be loaded and saved.' : 'Loading weekly progress…'}</p> : <>
        <p className="weekly-progress__dates">{weekLabel}</p>
        <div className="weekly-progress__summary" role="status" aria-live="polite" aria-atomic="true">
          <p className="weekly-progress__number"><span aria-hidden="true">{progress.completed} / {progress.scheduled}</span><span className="sr-only">{progress.completed} of {progress.scheduled}</span></p>
          <p className="card__description">workouts completed</p>
          <p className="weekly-progress__consistency">{progress.consistency === null ? 'No workouts scheduled' : `${progress.consistency}% consistency`}</p>
        </div>
        <WeekdayStrip days={progress.days} />
        <ul className="weekly-progress__legend" aria-label="Workout state symbols">
          <li><span data-state="completed" aria-hidden="true">✓</span>Completed</li>
          <li><span data-state="missed" aria-hidden="true">×</span>Missed</li>
          <li><span data-state="pending" aria-hidden="true">○</span>Pending</li>
          <li><span aria-hidden="true">·</span>Future</li>
          <li><span aria-hidden="true">—</span>Rest / not tracked</li>
        </ul>
        <p className="card__description weekly-progress__note">Future workouts count toward this week&apos;s plan. Only past tracked workouts can be missed.</p>
      </>}
    </Card>
  )
}
