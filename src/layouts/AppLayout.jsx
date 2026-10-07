import { useLanguage } from '../i18n/useLanguage.js'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import Header from './Header.jsx'
import { Button } from '../components/Button.jsx'
import Dialog from '../components/Dialog.jsx'
import StorageNotice from '../components/StorageNotice.jsx'
import { useStorage } from '../app/useStorage.js'
import { useAuth } from '../app/useAuth.js'

export default function AppLayout() {
  const { t, language } = useLanguage()
  const { pathname } = useLocation()
  const { data } = useStorage()
  const { user, notice } = useAuth()
  const previousPath = useRef(pathname)
  const mainRef = useRef(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  useLayoutEffect(() => {
    const heading = mainRef.current?.querySelector('h1')
    document.title = `${heading?.textContent ?? t('Your training')} | FORGE`
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname, data, language, t])

  return (
    <div className="app-shell">
      <a className="skip-link button button--primary" href="#main-content">{t("Skip to content")}</a>
      <Header />
      <main className="main-content" id="main-content" ref={mainRef} tabIndex={-1}>
        <StorageNotice />
        {notice && <p className="auth-notice account-notice" role="status">{t(notice)}</p>}
        {user && <div className="account-status"><Link to="/login">{t("Account data")}</Link><span>{user.email}{' '}{t("· Guest plans stay separate on this device.")}</span></div>}
        <Outlet />
      </main>
      <footer className="app-footer">
        <Button variant="text" onClick={() => setPrivacyOpen(true)}>{user ? t("About your data") : t("About local storage")}</Button>
      </footer>
      <Dialog open={privacyOpen} title={user ? t("Your account and guest data") : t("Your data stays on this device")} onClose={() => setPrivacyOpen(false)} actions={<Button onClick={() => setPrivacyOpen(false)}>{t("Got it")}</Button>}>
        <p>{t("Guest exercises, routines, and workout history are saved in this browser. You can use them without an account. Clearing site data removes the guest copy.")}</p>
        <p>{t("When signed in, successful changes are saved to your account, separately from guest data. Sign in or reload on another device to load them. A connection is required to load and save account plans.")}</p>
        <p>{t("Guest plans are copied into an unused account only after you review and confirm an import. The local copy is preserved. Logging out returns to local guest data without deleting account plans.")}</p>
      </Dialog>
    </div>
  )
}
