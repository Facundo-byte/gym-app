import { useLanguage } from '../i18n/useLanguage.js'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { weekdayName } from '../domain/routines.js'
import { Button } from './Button.jsx'
import Card from './Card.jsx'
import Dialog from './Dialog.jsx'

export default function StorageNotice() {
  const { t } = useLanguage()
  const { status, mode, error, noticeError, recovery, dangling, retry, reset, applyRecovery, exportSavedData } = useStorage()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const cancelRef = useRef(null)
  const lock = useRef(false)

  const failure = noticeError ?? error
  const canReset = mode !== 'account' && !noticeError && ['corrupt', 'invalid', 'ambiguous'].includes(error?.code)
  if (status !== 'error' && !noticeError && !recovery && !dangling.length && !feedback) return null

  async function confirmAction() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setActionError('')
    try {
      if (confirmOpen === 'repair') {
        await applyRecovery()
        setFeedback('Recovery saved. Valid records and historical snapshots have been preserved.')
      } else {
        await reset()
        setFeedback('Local data reset. FORGE is ready for a fresh start.')
      }
      setConfirmOpen(false)
    } catch (failure) { setActionError(failure.message) }
    finally { lock.current = false; setBusy(false) }
  }

  async function download() {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setActionError('')
    let url
    try {
      const raw = await exportSavedData()
      if (raw === null) throw new Error('No saved FORGE data is available to download.')
      url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'forge-saved-data.json'
      link.click()
    } catch (failure) { setActionError(failure.message) }
    finally {
      // Allow the browser to consume the download before releasing its URL.
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000)
      lock.current = false
      setBusy(false)
    }
  }

  function openConfirmation(kind) {
    setActionError('')
    setConfirmOpen(kind)
  }

  return (
    <>
      <Card className="storage-notice" role={failure || recovery ? 'alert' : 'status'} aria-labelledby="storage-heading">
        <h2 id="storage-heading">{failure ? mode === 'account' ? t("Account data needs your attention") : t("Local storage needs your attention") : recovery ? t("Review local data recovery") : dangling.length ? t("Some exercise references need attention") : t("Local data updated")}</h2>
        {failure && <p>{t(failure.message)}</p>}
        {noticeError && <p>{t("Your current drafts are still here. Reload page opens the latest saved data and discards unsaved drafts. Copy any changes you want to keep first.")}</p>}
        {!noticeError && recovery && <>
          <p>{t("You are viewing the valid portion of your data. Saving is paused until you approve these changes. The original saved document is still intact.")}</p>
          <ul className="storage-notice__details">{recovery.changes.map((change) => <li key={change}>{t(change)}</li>)}</ul>
          <p>{t("Download saved data to keep the original, including any excluded records, before applying recovery.")}</p>
        </>}
        {dangling.length > 0 && <>
          <p>{t("Missing exercise assignments retain their targets. Open each day to replace or remove them explicitly. Saved workout history remains readable.")}</p>
          <ul className="storage-notice__details">{dangling.map(day => <li key={`${day.routineId}:${day.dayOfWeek}`}><Link to={`/routines/${encodeURIComponent(day.routineId)}?day=${day.dayOfWeek}`}>{day.routineName} · {t(weekdayName(day.dayOfWeek))}</Link> — {t(day.count === 1 ? '{count} missing exercise' : '{count} missing exercises', { count: day.count })}</li>)}</ul>
        </>}
        {feedback && <p>{t(feedback)}</p>}
        <div className="storage-notice__actions">
          {noticeError ? <Button variant="secondary" onClick={() => window.location.reload()}>{t("Reload page")}</Button> : status === 'error' && <Button variant="secondary" disabled={busy} onClick={retry}>{t("Try again")}</Button>}
          {!noticeError && recovery && <Button variant="secondary" disabled={busy} onClick={() => openConfirmation('repair')}>{t("Review recovery")}</Button>}
          {(failure || recovery) && <Button variant="secondary" disabled={busy} onClick={download}>{t("Download saved data")}</Button>}
          {canReset && <Button variant="secondary" disabled={busy} onClick={() => openConfirmation('reset')}>{t("Reset local data")}</Button>}
          {feedback && <Button variant="text" onClick={() => setFeedback('')}>{t("Dismiss message")}</Button>}
        </div>
        {actionError && !confirmOpen && <p className="storage-notice__failure" role="alert">{t(actionError)}</p>}
      </Card>
      <Dialog open={Boolean(confirmOpen)} title={confirmOpen === 'repair' ? t("Apply local data recovery?") : t("Reset local FORGE data?")} onClose={() => { if (!busy) setConfirmOpen(false) }} initialFocusRef={cancelRef} actions={
        <>
          <Button ref={cancelRef} variant="secondary" disabled={busy} onClick={() => setConfirmOpen(false)}>{confirmOpen === 'repair' ? t("Keep original data") : t("Keep my data")}</Button>
          <Button variant="danger" disabled={busy || Boolean(noticeError)} onClick={confirmAction}>{busy ? t("Saving…") : confirmOpen === 'repair' ? t("Apply recovery") : t("Reset FORGE data")}</Button>
        </>
      }>
        {confirmOpen === 'repair' ? <>
          <p>{t("This replaces the saved document with the recovery preview. The following changes are permanent unless you keep a downloaded copy of the original:")}</p>
          <ul className="storage-notice__details">{recovery?.changes.map((change) => <li key={change}>{t(change)}</li>)}</ul>
          <p>{t("The preview's exercises and routines, missing-reference targets, past schedules, and retained completion snapshots will be kept.")}</p>
        </> : <>
          <p>{t("This will permanently remove FORGE's local exercises, routines, and workout history from this browser. Other websites' data will not be changed.")}</p>
          <p>{t("Download saved data before resetting if you want to recover it later.")}</p>
        </>}
        {noticeError && <p className="storage-notice__failure" role="alert">{t(noticeError.message)}</p>}
        {actionError && <p className="storage-notice__failure" role="alert">{t(actionError)}</p>}
      </Dialog>
    </>
  )
}
