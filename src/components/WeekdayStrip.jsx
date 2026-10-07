import { useLanguage } from '../i18n/useLanguage.js'
import { parseLocalDate } from '../domain/dates.js'
import { weekdayName } from '../domain/routines.js'

const states = {
  completed: { symbol: '✓', label: 'Completed' },
  missed: { symbol: '×', label: 'Missed' },
  pending: { symbol: '○', label: 'Pending' },
  future: { symbol: '·', label: 'Future workout' },
  rest: { symbol: '—', label: 'Rest day' },
  untracked: { symbol: '—', label: 'Not tracked' },
}

export default function WeekdayStrip({ days }) {
  const { t, locale } = useLanguage()
  return (
    <ol className="weekday-strip" aria-label={t("This week's workout states")}>
      {days.map((day) => {
        const name = t(weekdayName(day.dayOfWeek))
        const state = states[day.state]
        const date = parseLocalDate(day.date).toLocaleDateString(locale, { month: 'long', day: 'numeric' })
        const label = `${name}, ${date}${day.isToday ? t(', today') : ''}: ${t(state.label)}.${day.scheduled ? ` ${t('{completed} of {scheduled} workouts completed.', { completed: day.completed, scheduled: day.scheduled })}` : ''}`
        return (
          <li key={day.date} data-state={day.state} aria-label={label} title={label} aria-current={day.isToday ? 'date' : undefined}>
            <span className="weekday-strip__name weekday-strip__name--full" aria-hidden="true">{name.slice(0, 3).toUpperCase()}</span>
            <span className="weekday-strip__name weekday-strip__name--short" aria-hidden="true">{name[0]}</span>
            <span className="weekday-strip__symbol" aria-hidden="true">{state.symbol}</span>
            <span className="weekday-strip__count" aria-hidden="true">{day.scheduled > 1 ? `${day.completed}/${day.scheduled}` : '\u00a0'}</span>
          </li>
        )
      })}
    </ol>
  )
}
