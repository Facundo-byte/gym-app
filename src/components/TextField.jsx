import { useId } from 'react'

export default function TextField({ label, hint, error, id, 'aria-describedby': describedBy, ...props }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionIds = [describedBy, hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(' ')
  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>{label}</label>
      <input {...props} className="field__input" id={inputId} aria-invalid={error ? true : undefined} aria-describedby={descriptionIds || undefined} />
      {hint && <p id={`${inputId}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${inputId}-error`} className="field__error">{error}</p>}
    </div>
  )
}
