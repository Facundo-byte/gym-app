import { weekDates } from './dates.js'
import { findCompletion } from './workouts.js'

export function selectWeeklyProgress(data, today) {
  const dates = weekDates(today)
  const week = data.weeklySchedules.find((item) => item.weekStart === dates[0])
  const logs = data.workoutLogs.filter((log) => log.status === 'completed')
  const days = dates.map((date, index) => {
    const tracked = data.trackingStartedOn !== null && date >= data.trackingStartedOn
    const record = week?.days.find((day) => day.date === date)
    const routineIds = new Set(tracked ? (record?.occurrences ?? []).map((occurrence) => occurrence.routineId) : [])
    const scheduled = routineIds.size
    const completed = [...routineIds].filter((id) => findCompletion(logs, id, date)).length
    const state = !tracked ? 'untracked' : !scheduled ? 'rest' : completed === scheduled ? 'completed' : date < today ? 'missed' : date === today ? 'pending' : 'future'
    return { date, dayOfWeek: index + 1, isToday: date === today, state, scheduled, completed }
  })
  const completed = days.reduce((total, day) => total + day.completed, 0)
  const scheduled = days.reduce((total, day) => total + day.scheduled, 0)
  return { weekStart: dates[0], weekEnd: dates[6], days, completed, scheduled, consistency: scheduled ? Math.round(100 * completed / scheduled) : null }
}
