import { useLanguage } from '../i18n/useLanguage.js'
import { useId } from 'react'
import { WEEKDAYS } from '../domain/routines.js'

export default function WeekdayPicker({ weekdays, onChange, error, disabled, firstInputRef }) {
  const { t } = useLanguage()
  const id = useId()
  return (
    <fieldset className="weekday-picker" aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={error ? true : undefined} disabled={disabled}>
      <legend>{t("Training days")}</legend>
      <p className="field__hint" id={`${id}-hint`}>{t("Choose one or more days. Each day has its own exercise list.")}</p>
      <div className="weekday-picker__options">
        {WEEKDAYS.map((day, index) => (
          <label key={day.value} className="weekday-option">
            <input ref={index === 0 ? firstInputRef : undefined} type="checkbox" checked={weekdays.includes(day.value)} aria-invalid={error ? true : undefined} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} onChange={(event) => onChange(event.target.checked ? [...weekdays, day.value] : weekdays.filter((value) => value !== day.value))} />
            <span>{t(day.name)}</span>
          </label>
        ))}
      </div>
      {error && <p className="field__error" id={`${id}-error`}>{t(error)}</p>}
    </fieldset>
  )
}
