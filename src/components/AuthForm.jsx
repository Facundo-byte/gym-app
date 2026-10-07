import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../app/useAuth.js'
import { validateCredentials } from '../domain/accounts.js'
import TextField from './TextField.jsx'
import { Button, ButtonLink } from './Button.jsx'

const actions = { login: 'Log in', signup: 'Create account', reset: 'Send recovery email', password: 'Save new password' }
export default function AuthForm({ mode }) {
  const { auth, signOut, configured, configError, error, user } = useAuth()
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ email: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmationRef = useRef(null)
  const refs = { email: emailRef, password: passwordRef, confirmation: confirmationRef }
  const hasPassword = mode !== 'reset'
  const hasConfirmation = ['signup', 'password'].includes(mode)
  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
    setFailure(''); setMessage('')
  }
  async function submit(event) {
    event.preventDefault()
    if (lock.current || !configured) return
    const validation = validateCredentials(draft, mode)
    setErrors(validation)
    if (Object.keys(validation).length) { refs[Object.keys(validation)[0]].current.focus(); return }
    lock.current = true; setBusy(true); setFailure(''); setMessage('')
    try {
      if (mode === 'login') { await auth.signIn(draft); navigate('/') }
      else if (mode === 'signup') {
        const result = await auth.signUp(draft)
        if (result.session) navigate('/')
        else { setMessage('Check your email to confirm your account, then log in. Open the confirmation link in this browser.'); setDraft((current) => ({ ...current, password: '', confirmation: '' })) }
      } else if (mode === 'reset') {
        await auth.requestPasswordReset(draft)
        setMessage('If an account uses this email, a recovery link has been requested. Open it in this browser to choose a new password.')
      } else {
        await auth.updatePassword(draft)
        setMessage('Your password has been updated.')
        setDraft({ email: '', password: '', confirmation: '' })
      }
    } catch (issue) {
      if (issue.errors) setErrors(issue.errors)
      else setFailure(issue.message)
    } finally { lock.current = false; setBusy(false) }
  }
  async function continueAsGuest() {
    if (lock.current) return
    lock.current = true; setBusy(true); setFailure('')
    try { await signOut(); navigate('/') }
    catch (issue) { setFailure(issue.message) }
    finally { lock.current = false; setBusy(false) }
  }
  return <form className="auth-form" onSubmit={submit} noValidate aria-busy={busy}>
    {!configured && <p className="auth-notice" role="status">{configError || 'Account sign-in is unavailable here. Continue as a guest to use all local features.'}</p>}
    {error && <p className="field__error" role="alert">{error.message} Request a new email link and open it in the same browser.</p>}
    {mode !== 'password' && <TextField label="Email" type="email" autoComplete="email" autoCapitalize="none" value={draft.email} ref={emailRef} onChange={(event) => update('email', event.target.value)} error={errors.email} disabled={busy || !configured} required />}
    {hasPassword && <TextField label={mode === 'password' ? 'New password' : 'Password'} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={draft.password} ref={passwordRef} onChange={(event) => update('password', event.target.value)} error={errors.password} hint={hasConfirmation ? 'Use at least 8 characters.' : undefined} disabled={busy || !configured} required />}
    {hasConfirmation && <TextField label="Confirm password" type="password" autoComplete="new-password" value={draft.confirmation} ref={confirmationRef} onChange={(event) => update('confirmation', event.target.value)} error={errors.confirmation} disabled={busy || !configured} required />}
    {failure && <p className="field__error" role="alert">{failure}</p>}
    {message && <p className="auth-success" role="status">{message}</p>}
    <Button type="submit" disabled={busy || !configured}>{busy ? 'Please wait…' : actions[mode]}</Button>
    <div className="auth-links">
      {mode === 'login' ? <><ButtonLink to="/signup" variant="text">Create an account</ButtonLink><ButtonLink to="/forgot-password" variant="text">Forgot password?</ButtonLink></> : <ButtonLink to="/login" variant="text">Back to account</ButtonLink>}
      {user ? <Button variant="secondary" disabled={busy} onClick={continueAsGuest}>Continue as guest</Button> : <ButtonLink to="/" variant="secondary">Continue as guest</ButtonLink>}
    </div>
  </form>
}
