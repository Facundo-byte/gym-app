import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { MUSCLES, countExerciseAssignments, validateExerciseInput } from '../domain/exercises.js'
import TextField from './TextField.jsx'
import ExerciseImageField from './ExerciseImageField.jsx'
import { getDefaultExerciseImage } from '../config/defaultExercises.js'
import DeleteExerciseDialog from './DeleteExerciseDialog.jsx'
import { Button, ButtonLink } from './Button.jsx'

export default function ExerciseForm({ exercise }) {
  const { data, saveExercise, deleteExercise } = useStorage()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ name: exercise?.name ?? '', muscle: exercise?.muscle ?? '', image: exercise?.image ?? null })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [imageError, setImageError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const submitLock = useRef(false)
  const nameRef = useRef(null)
  const muscleRef = useRef(null)
  const imageRef = useRef(null)
  const editing = Boolean(exercise)

  function update(field, value) {
    if (field === 'image') setImageError('')
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setSaveError('')
  }

  async function submit(event) {
    event.preventDefault()
    if (submitLock.current || imageBusy) return
    const validation = validateExerciseInput(draft)
    if (imageError) validation.image = imageError
    setErrors(validation)
    if (Object.keys(validation).length) {
      if (validation.name) nameRef.current.focus()
      else if (validation.muscle) muscleRef.current.focus()
      else if (validation.image) imageRef.current.focus()
      return
    }
    submitLock.current = true
    setSaving(true)
    setSaveError('')
    try {
      await saveExercise(exercise?.id, draft)
      navigate('/exercises', { state: { message: editing ? 'Exercise updated.' : 'Exercise created.' } })
    } catch (failure) {
      if (failure.errors) setErrors(failure.errors)
      else setSaveError(failure.message)
    } finally {
      submitLock.current = false
      setSaving(false)
    }
  }

  async function remove() {
    await deleteExercise(exercise.id)
    navigate('/exercises', { state: { message: 'Exercise deleted.' } })
  }

  return (
    <>
      <form className="exercise-form" onSubmit={submit} noValidate aria-busy={saving || imageBusy}>
        <TextField label="Exercise name" placeholder="e.g. Cable fly" value={draft.name} onChange={(event) => update('name', event.target.value)} error={errors.name} ref={nameRef} required disabled={saving} />
        <div className="field">
          <label className="field__label" htmlFor="exercise-muscle">Target muscle</label>
          <select className="field__input" id="exercise-muscle" ref={muscleRef} value={draft.muscle} onChange={(event) => update('muscle', event.target.value)} required disabled={saving} aria-invalid={errors.muscle ? true : undefined} aria-describedby={errors.muscle ? 'exercise-muscle-error' : undefined}>
            <option value="">Select muscle</option>
            {draft.muscle && !MUSCLES.includes(draft.muscle) && <option value={draft.muscle}>{draft.muscle}</option>}
            {MUSCLES.map((muscle) => <option key={muscle}>{muscle}</option>)}
          </select>
          {errors.muscle && <p className="field__error" id="exercise-muscle-error">{errors.muscle}</p>}
        </div>
        <ExerciseImageField image={draft.image} defaultImage={getDefaultExerciseImage({ ...exercise, ...draft })} inputRef={imageRef} onChange={(image) => update('image', image)} error={imageError || errors.image} onError={(message) => { setImageError(message); setErrors((current) => ({ ...current, image: '' })) }} busy={imageBusy} setBusy={setImageBusy} disabled={saving} />
        {saveError && <p className="field__error" role="alert">{saveError}</p>}
        <div className="exercise-form__actions">
          <Button type="submit" disabled={saving || imageBusy}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create exercise'}</Button>
          {editing && <Button variant="danger" disabled={saving || imageBusy} onClick={() => setDeleteOpen(true)}>Delete exercise</Button>}
          <ButtonLink variant="text" to="/exercises">Cancel</ButtonLink>
        </div>
      </form>
      {exercise && <DeleteExerciseDialog exercise={exercise} assignmentCount={countExerciseAssignments(data.routines, exercise.id)} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDelete={remove} />}
    </>
  )
}
