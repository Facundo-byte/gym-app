import { useLanguage } from '../i18n/useLanguage.js'
import { useRef, useState } from 'react'
import Dialog from './Dialog.jsx'
import { Button } from './Button.jsx'

export default function DeleteExerciseDialog({ exercise, assignmentCount, open, onClose, onDelete }) {
  const { t, exerciseName } = useLanguage()
  const cancelRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function confirmDelete() {
    if (busy) return
    setBusy(true)
    setError('')
    try { await onDelete() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} title={t("Delete exercise?")} onClose={() => { if (!busy) onClose() }} initialFocusRef={cancelRef} actions={
      <>
        <Button variant="secondary" ref={cancelRef} onClick={onClose} disabled={busy}>{t("Cancel")}</Button>
        <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? t("Deleting…") : t("Delete exercise")}</Button>
      </>
    }>
      <p>{t('Delete “{name}” from your library? This cannot be undone.', { name: exerciseName(exercise) })}</p>
      {assignmentCount > 0 && <p>{t(assignmentCount === 1 ? 'This also removes {count} assignment from your routine days. Past workout history will be kept.' : 'This also removes {count} assignments from your routine days. Past workout history will be kept.', { count: assignmentCount })}</p>}
      {error && <p className="field__error" role="alert">{t(error)}</p>}
    </Dialog>
  )
}
