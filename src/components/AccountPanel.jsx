import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../app/useAuth.js'
import { useStorage } from '../app/useStorage.js'
import { prepareGuestImport } from '../services/guestImport.js'
import { Button, ButtonLink } from './Button.jsx'
import Dialog from './Dialog.jsx'

export default function AccountPanel() {
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
    <h2>Your account</h2>
    <p className="account-email">{user.email}</p>
    <p>Your account plans are separate from this browser&apos;s guest plans. Successful changes are saved to your account. Reload to load changes from another device.</p>
    <p>You can copy this browser&apos;s guest plans into a new or unused account. Existing account plans are never replaced. The guest copy remains on this device.</p>
    <div className="auth-links">
      <Button disabled={busy || status !== 'ready'} onClick={async () => { const reviewed = await perform(() => prepareGuestImport()); if (reviewed) setProposal(reviewed) }}>Review guest import</Button>
      <ButtonLink to="/account/password" variant="secondary">Change password</ButtonLink>
      <Button disabled={busy} variant="secondary" onClick={() => perform(async () => { await signOut(); navigate('/login') })}>Log out</Button>
      <Button disabled={busy} variant="text" onClick={() => perform(async () => { await signOut(); navigate('/') })}>Continue as guest</Button>
    </div>
    {failure && !proposal && <p className="field__error" role="alert">{failure}</p>}
    {feedback && <p className="auth-success" role="status">{feedback}</p>}
    <Dialog open={Boolean(proposal)} title="Import guest plans into this account?" initialFocusRef={cancelRef} onClose={() => { if (!busy) { setProposal(null); setFailure('') } }} actions={<>
      <Button ref={cancelRef} disabled={busy} variant="secondary" onClick={() => { setProposal(null); setFailure('') }}>Keep data separate</Button>
      <Button disabled={busy} onClick={async () => { const saved = await perform(() => importGuestData(proposal)); if (saved) { setProposal(null); setFeedback('Guest plans imported. The local guest copy has been preserved.') } }}>{busy ? 'Importing…' : 'Import guest plans'}</Button>
    </>}>
      <p>Copy to <strong>{user.email}</strong>: {proposal?.summary.exercises} exercises, {proposal?.summary.routines} {proposal?.summary.routines === 1 ? 'routine' : 'routines'}, and {proposal?.summary.completions} completed {proposal?.summary.completions === 1 ? 'workout' : 'workouts'}.</p>
      <p>Training days, order, targets, and saved history keep their existing identities. This replaces only an unused account&apos;s starter data. Repeating the same import will not create duplicates.</p>
      <p>Your local guest data stays unchanged. If this account already has plans or a different import, the import will be refused.</p>
      {failure && <p className="field__error" role="alert">{failure}</p>}
    </Dialog>
  </div>
}
