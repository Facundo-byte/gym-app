import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { getRemovedPopulatedDays, validateRoutineInput, weekdayName } from '../domain/routines.js'
import TextField from './TextField.jsx'
import WeekdayPicker from './WeekdayPicker.jsx'
import ConfirmActionDialog from './ConfirmActionDialog.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function RoutineForm({ routine }) {
  const { saveRoutine } = useStorage()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ name: routine?.name ?? '', weekdays: routine?.days.map((day) => day.dayOfWeek) ?? [] })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [removedDays, setRemovedDays] = useState([])
  const nameRef = useRef(null)
  const firstDayRef = useRef(null)
  const submitLock = useRef(false)
  const cancelPath = routine ? `/routines/${encodeURIComponent(routine.id)}` : '/routines'

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSaveError('')
  }

  async function commit(confirmRemovedDays = false) {
    if (submitLock.current) return
    submitLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      const saved = await saveRoutine(routine?.id, draft, { confirmRemovedDays })
      const id = routine?.id ?? saved.routines.at(-1).id
      navigate(`/routines/${encodeURIComponent(id)}`, { state: { message: routine ? 'Routine updated.' : 'Routine created.' } })
    } catch (failure) {
      if (failure.code === 'confirmation') setRemovedDays(failure.removedDays)
      else if (failure.errors) setErrors(failure.errors)
      else setSaveError(failure.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    if (submitLock.current) return
    const validation = validateRoutineInput(draft)
    setErrors(validation)
    if (Object.keys(validation).length) {
      if (validation.name) nameRef.current.focus()
      else firstDayRef.current.focus()
      return
    }
    setSaveError('')
    const removed = routine ? getRemovedPopulatedDays(routine, draft.weekdays) : []
    if (removed.length) setRemovedDays(removed)
    else commit()
  }

  const assignmentCount = removedDays.reduce((count, day) => count + day.assignments.length, 0)

  return (
    <>
      <form className="routine-form" noValidate onSubmit={submit} aria-busy={saving}>
        <TextField label="Routine name" placeholder="e.g. Push A" value={draft.name} onChange={(event) => update('name', event.target.value)} error={errors.name} ref={nameRef} disabled={saving} required />
        <WeekdayPicker weekdays={draft.weekdays} onChange={(weekdays) => update('weekdays', weekdays)} error={errors.weekdays} disabled={saving} firstInputRef={firstDayRef} />
        {saveError && !removedDays.length && <p className="field__error" role="alert">{saveError}</p>}
        <div className="routine-form__actions">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : routine ? 'Save changes' : 'Create routine'}</Button>
          <ButtonLink to={cancelPath} variant="text" onClick={(event) => { if (saving) event.preventDefault() }} aria-disabled={saving || undefined}>Cancel</ButtonLink>
        </div>
      </form>
      <ConfirmActionDialog open={removedDays.length > 0} title="Remove training days?" confirmLabel="Remove days and save" onConfirm={() => commit(true)} onClose={() => { setRemovedDays([]); setSaveError('') }} busy={saving} error={saveError}>
        <p>Removing {removedDays.map((day) => weekdayName(day.dayOfWeek)).join(', ')} will delete {assignmentCount} {assignmentCount === 1 ? 'exercise assignment' : 'exercise assignments'} from this routine.</p>
        <p>The remaining training days and past workout history will be kept.</p>
      </ConfirmActionDialog>
    </>
  )
}
