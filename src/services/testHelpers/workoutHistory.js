import { weekDates } from '../../domain/dates.js'

export function workoutHistory({ routineId = 'past-plan', exerciseId = 'bench', name = 'Bench Press' } = {}) {
  const date = '2026-10-01'
  const snapshot = { routineId, date, routineName: 'Past workout', exercises: [{ assignmentId: 'past-assignment', exerciseId, name, muscle: 'Chest', sets: 4, reps: 8, targetWeight: 70 }] }
  return {
    trackingStartedOn: '2026-09-28',
    weeklySchedules: [{ weekStart: '2026-09-28', days: weekDates(date).map((day) => ({ date: day, occurrences: day === date ? [snapshot] : [] })) }],
    workoutLogs: [{ id: 'past-log', routineId, date, status: 'completed', completedAt: '2026-10-01T13:00:00.000Z', snapshot }],
  }
}
