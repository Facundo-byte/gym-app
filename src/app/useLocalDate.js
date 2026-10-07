import { useEffect, useState } from 'react'
import { formatLocalDate } from '../domain/dates.js'

export function useLocalDate() {
  const [date, setDate] = useState(() => formatLocalDate(new Date()))
  useEffect(() => {
    let timer
    function refresh() {
      clearTimeout(timer)
      const now = new Date()
      setDate(formatLocalDate(now))
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      // Recheck the clock/timezone while open and wake at the next local midnight.
      timer = setTimeout(refresh, Math.min(60_000, Math.max(1, midnight - now + 25)))
    }
    function visible() { if (document.visibilityState === 'visible') refresh() }
    refresh()
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', refresh)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', refresh) }
  }, [])
  return date
}
