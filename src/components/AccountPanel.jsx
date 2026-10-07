import { useLanguage } from '../i18n/useLanguage.js'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../app/useAuth.js'
import { useStorage } from '../app/useStorage.js'
import { prepareGuestImport } from '../services/guestImport.js'
import { Button, ButtonLink } from './Button.jsx'
import Dialog from './Dialog.jsx'

export default function AccountPanel() {
  const { t } = useLanguage()
  const { user, signOut } = useAuth()
  const { status, importGuestData } = useStorage()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [feedback, setFeedback] = useState('')
  const lock = useRef(false)
  const cancelRef = useRef(null)
  async function perform(operation) {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure(''); setFeedback('')
    try { return await operation() } catch (error) { setFailure(error.message) }
    finally { lock.current = false; setBusy(false) }
  }
  return <div className="account-panel">
    <h2>{t("Your account")}</h2>
    <p className="account-email">{user.email}</p>
    <p>{t("Your account plans are separate from this browser's guest plans. Successful changes are saved to your account. Reload to load changes from another device.")}</p>
    <p>{t("You can copy this browser's guest plans into a new or unused account. Existing account plans are never replaced. The guest copy remains on this device.")}</p>
    <div className="auth-links">
      <Button disabled={busy || status !== 'ready'} onClick={async () => { const reviewed = await perform(() => prepareGuestImport()); if (reviewed) setProposal(reviewed) }}>{t("Review guest import")}</Button>
      <ButtonLink to="/account/password" variant="secondary">{t("Change password")}</ButtonLink>
      <Button disabled={busy} variant="secondary" onClick={() => perform(async () => { await signOut(); navigate('/login') })}>{t("Log out")}</Button>
      <Button disabled={busy} variant="text" onClick={() => perform(async () => { await signOut(); navigate('/') })}>{t("Continue as guest")}</Button>
    </div>
    {failure && !proposal && <p className="field__error" role="alert">{t(failure)}</p>}
    {feedback && <p className="auth-success" role="status">{t(feedback)}</p>}
    <Dialog open={Boolean(proposal)} title={t("Import guest plans into this account?")} initialFocusRef={cancelRef} onClose={() => { if (!busy) { setProposal(null); setFailure('') } }} actions={<>
      <Button ref={cancelRef} disabled={busy} variant="secondary" onClick={() => { setProposal(null); setFailure('') }}>{t("Keep data separate")}</Button>
      <Button disabled={busy} onClick={async () => { const saved = await perform(() => importGuestData(proposal)); if (saved) { setProposal(null); setFeedback('Guest plans imported. The local guest copy has been preserved.') } }}>{busy ? t("Importing…") : t("Import guest plans")}</Button>
    </>}>
      <p>{t('Copy to')} <strong>{user.email}</strong>: {t('{exercises}, {routines}, and {workouts}.', {
        exercises: t(proposal?.summary.exercises === 1 ? '{count} exercise' : '{count} exercises', { count: proposal?.summary.exercises ?? 0 }),
        routines: t(proposal?.summary.routines === 1 ? '{count} routine' : '{count} routines', { count: proposal?.summary.routines ?? 0 }),
        workouts: t(proposal?.summary.completions === 1 ? '{count} completed workout' : '{count} completed workouts', { count: proposal?.summary.completions ?? 0 }),
      })}</p>
      <p>{t("Training days, order, targets, and saved history keep their existing identities. This replaces only an unused account's starter data. Repeating the same import will not create duplicates.")}</p>
      <p>{t("Your local guest data stays unchanged. If this account already has plans or a different import, the import will be refused.")}</p>
      {failure && <p className="field__error" role="alert">{t(failure)}</p>}
    </Dialog>
  </div>
}
