import { useState } from 'react'
import { useLanguage } from '../i18n/useLanguage.js'
import { usePwa } from '../pwa/usePwa.js'
import { useStorage } from '../app/useStorage.js'
import { Button, ButtonLink } from './Button.jsx'
import Dialog from './Dialog.jsx'

export function InstallAppButton() {
  const { t } = useLanguage()
  const { installed, installPrompt, install, preparationError } = usePwa()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  async function startInstallation() {
    setBusy(true)
    setFeedback('')
    try {
      if (await install()) setOpen(false)
      else setFeedback('Installation was canceled. You can try again from your browser menu.')
    } catch { setFeedback('Installation could not start. Try again from your browser menu.') }
    finally { setBusy(false) }
  }

  if (installed) return null
  return <>
    <Button variant="secondary" onClick={() => { setFeedback(''); setOpen(true) }}>{t('Install FORGE')}</Button>
    <Dialog open={open} title={t('Install FORGE')} onClose={() => { if (!busy) setOpen(false) }} actions={<>
      {installPrompt && <Button disabled={busy} onClick={startInstallation}>{busy ? t('Opening installation…') : t('Install app')}</Button>}
      <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>{t('Close')}</Button>
    </>}>
      <p>{t('Open FORGE from your home screen, in its own window.')}</p>
      {apple ? <ol className="pwa-install-steps">
        <li>{t('Open this page in Safari.')}</li>
        <li>{t('Tap Share, then Add to Home Screen.')}</li>
        <li>{t('Keep Open as Web App enabled if shown, then tap Add.')}</li>
      </ol> : <p>{installPrompt ? t('Choose Install app below and confirm in your browser.') : t('In your browser menu, choose Install app or Add to Home Screen. If unavailable, try Chrome on Android or Safari on iPhone.')}</p>}
      <p>{t('Sign in after installing to load your account plans. Guest plans may stay separate from your browser.')}</p>
      <p>{t('Account access and saving need an internet connection. Guest plans work on this device after the app has loaded once.')}</p>
      {preparationError && <p role="status">{t('Installation preparation is unavailable right now. Check your connection and reopen FORGE.')}</p>}
      {feedback && <p role="status">{t(feedback)}</p>}
    </Dialog>
  </>
}

export function PwaStatus() {
  const { t } = useLanguage()
  const { offline, updateAvailable, applyUpdate } = usePwa()
  const { mode, pendingSaves } = useStorage()
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(false)

  function update() {
    if (pendingSaves || updating) return
    setError(false)
    setUpdating(true)
    if (!applyUpdate()) { setUpdating(false); setError(true) }
  }

  return <>
    {offline && <p className="pwa-connection-notice" role="status">{mode === 'account' ? t('You are offline. Reconnect to load or save account plans.') : t('You are offline. Guest plans are saved on this device; account access needs a connection.')}</p>}
    {updateAvailable && <div className="pwa-update-notice">
      <p role="status">{t('A new version of FORGE is ready.')}</p>
      <Button variant="secondary" onClick={() => setOpen(true)}>{t('Update FORGE')}</Button>
    </div>}
    <Dialog open={open} title={t('Update FORGE?')} onClose={() => { if (!updating) setOpen(false) }} actions={<>
      <Button onClick={update} disabled={Boolean(pendingSaves) || updating}>{updating ? t('Updating…') : t('Update now')}</Button>
      <Button variant="secondary" disabled={updating} onClick={() => setOpen(false)}>{t('Later')}</Button>
    </>}>
      <p>{t('Updating reloads FORGE. Save your changes first; unsaved form input will be lost. Saved plans remain available.')}</p>
      {Boolean(pendingSaves) && <p role="status">{t('Wait for the current save to finish before updating.')}</p>}
      {error && <p role="alert">{t('The update could not start. Close this message and try again when connected.')}</p>}
    </Dialog>
  </>
}

export function PwaEmailHelp({ mode }) {
  const { t } = useLanguage()
  const signup = mode === 'signup'
  return <div className="pwa-email-help">
    <p>{t('Email links open in your browser, which may have a separate session from the installed app. Complete account creation or recovery there, then return to FORGE and sign in.')}</p>
    <ButtonLink to={signup ? '/signup' : '/forgot-password'} target="_blank" rel="noopener noreferrer">{signup ? t('Open browser to create account') : t('Open browser to recover account')}</ButtonLink>
    <ButtonLink variant="text" to="/login">{t('Back to Log in')}</ButtonLink>
  </div>
}
