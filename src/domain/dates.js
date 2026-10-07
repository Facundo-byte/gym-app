export function formatLocalDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function parseLocalDate(value) {
  if (!isCalendarDate(value)) throw new Error('Use a valid local calendar date.')
  const [year, month, day] = value.split('-').map(Number)
  // Noon avoids midnight transitions; setDate performs calendar rather than elapsed-time arithmetic.
  return new Date(year, month - 1, day, 12)
}

export function addCalendarDays(value, amount) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

export function isoWeekday(value) {
  return parseLocalDate(value).getDay() || 7
}

export function weekDates(value) {
  const monday = addCalendarDays(value, 1 - isoWeekday(value))
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(monday, index))
}
