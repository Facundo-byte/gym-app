import { useRef, useState } from 'react'
import Dialog from './Dialog.jsx'
import { Button } from './Button.jsx'

export default function DeleteExerciseDialog({ exercise, assignmentCount, open, onClose, onDelete }) {
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
    <Dialog open={open} title="Delete exercise?" onClose={() => { if (!busy) onClose() }} initialFocusRef={cancelRef} actions={
      <>
        <Button variant="secondary" ref={cancelRef} onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="danger" onClick={confirmDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete exercise'}</Button>
      </>
    }>
      <p>Delete “{exercise.name}” from your library? This cannot be undone.</p>
      {assignmentCount > 0 && <p>This also removes {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'} from your routine days. Past workout history will be kept.</p>}
      {error && <p className="field__error" role="alert">{error}</p>}
    </Dialog>
  )
}
