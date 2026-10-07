import { useRef } from 'react'
import Dialog from './Dialog.jsx'
import { Button } from './Button.jsx'

export default function ConfirmActionDialog({ open, title, children, confirmLabel, onConfirm, onClose, busy, error }) {
  const cancelRef = useRef(null)
  return (
    <Dialog open={open} title={title} onClose={() => { if (!busy) onClose() }} initialFocusRef={cancelRef} actions={
      <>
        <Button variant="secondary" ref={cancelRef} disabled={busy} onClick={onClose}>Cancel</Button>
        <Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Saving…' : confirmLabel}</Button>
      </>
    }>
      {children}
      {open && error && <p className="field__error" role="alert">{error}</p>}
    </Dialog>
  )
}
