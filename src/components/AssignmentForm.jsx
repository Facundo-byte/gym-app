import { useLanguage } from '../i18n/useLanguage.js'
import { useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { validateAssignmentInput } from '../domain/assignments.js'
import { weekdayName } from '../domain/routines.js'
import ExercisePicker from './ExercisePicker.jsx'
import TextField from './TextField.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function AssignmentForm({ routine, day, assignment, exercises, creationFlow }) {
  const { t } = useLanguage()
  const { saveAssignment } = useStorage()
  const navigate = useNavigate()
  const [localDraft, setLocalDraft] = useState({ exerciseId: assignment?.exerciseId ?? '', sets: assignment ? String(assignment.sets) : '', reps: assignment ? String(assignment.reps) : '', targetWeight: assignment ? String(assignment.targetWeight) : '' })
  const draft = creationFlow?.draft ?? localDraft
  const setDraft = creationFlow?.setDraft ?? setLocalDraft
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const submitLock = useRef(false)
  const exerciseRef = useRef(null)
  const searchRef = useRef(null)
  const setsRef = useRef(null)
  const repsRef = useRef(null)
  const weightRef = useRef(null)
  const weightHintId = useId()
  const backPath = `/routines/${encodeURIComponent(routine.id)}?day=${day.dayOfWeek}`

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSaveError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (submitLock.current) return
    const validation = validateAssignmentInput(draft, exercises)
    setErrors(validation)
    if (Object.keys(validation).length) {
      const focus = validation.exerciseId ? exerciseRef.current ?? searchRef.current : validation.sets ? setsRef.current : validation.reps ? repsRef.current : weightRef.current
      focus?.focus()
      return
    }
    submitLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      await saveAssignment(routine.id, day.dayOfWeek, assignment?.id, draft)
      navigate(backPath, { state: { message: assignment ? 'Exercise targets updated.' : `Exercise added to ${weekdayName(day.dayOfWeek)}.` } })
    } catch (failure) {
      if (failure.errors) setErrors(failure.errors)
      else setSaveError(failure.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  return (
    <form className="assignment-form" noValidate onSubmit={submit} aria-busy={saving}>
      <ExercisePicker exercises={exercises} value={draft.exerciseId} onChange={(exerciseId) => update('exerciseId', exerciseId)} error={errors.exerciseId} disabled={saving} firstInputRef={exerciseRef} searchRef={searchRef} creationFlow={creationFlow} />
      <div className="assignment-targets">
        <TextField label={t("Sets")} type="number" inputMode="numeric" min="1" step="1" placeholder="4" value={draft.sets} onChange={(event) => update('sets', event.target.value)} error={errors.sets} required disabled={saving} ref={setsRef} />
        <TextField label={t("Reps")} type="number" inputMode="numeric" min="1" step="1" placeholder="8" value={draft.reps} onChange={(event) => update('reps', event.target.value)} error={errors.reps} required disabled={saving} ref={repsRef} />
        <TextField label={t("Target weight (kg)")} type="number" inputMode="decimal" min="0" step="0.5" placeholder="70" value={draft.targetWeight} onChange={(event) => update('targetWeight', event.target.value)} error={errors.targetWeight} aria-describedby={weightHintId} required disabled={saving} ref={weightRef} />
      </div>
      <p className="field__hint" id={weightHintId}>{t("Use 0 kg for bodyweight or no added weight. Decimal weights are allowed.")}</p>
      {saveError && <p className="field__error" role="alert">{t(saveError)}</p>}
      <div className="assignment-form__actions">
        <Button type="submit" disabled={saving}>{saving ? t("Saving…") : assignment ? t("Save targets") : t("Add to training day")}</Button>
        <ButtonLink to={backPath} variant="text" onClick={(event) => { if (saving) event.preventDefault() }} aria-disabled={saving || undefined}>{t("Cancel")}</ButtonLink>
      </div>
    </form>
  )
}
