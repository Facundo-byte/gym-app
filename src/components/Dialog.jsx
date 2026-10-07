import { useEffect, useId, useRef } from 'react'

export default function Dialog({ open, title, onClose, children, actions, initialFocusRef }) {
  const dialogRef = useRef(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    initialFocusRef?.current?.focus()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open, initialFocusRef])

  function containKeyboardFocus(event) {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]')]
      .filter((element) => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length)
    const first = controls[0]
    const last = controls.at(-1)
    if (!first) {
      event.preventDefault()
      dialog.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <dialog ref={dialogRef} className="dialog" tabIndex={-1} aria-labelledby={titleId} aria-describedby={bodyId} onKeyDown={containKeyboardFocus} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <h2 className="dialog__title" id={titleId}>{title}</h2>
      <div className="dialog__body" id={bodyId}>{children}</div>
      {actions && <div className="dialog__actions">{actions}</div>}
    </dialog>
  )
}
