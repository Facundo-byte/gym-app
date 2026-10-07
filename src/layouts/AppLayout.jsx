import { useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import Header from './Header.jsx'
import { Button } from '../components/Button.jsx'
import Dialog from '../components/Dialog.jsx'
import StorageNotice from '../components/StorageNotice.jsx'
import { useStorage } from '../app/useStorage.js'

export default function AppLayout() {
  const { pathname } = useLocation()
  const { data } = useStorage()
  const previousPath = useRef(pathname)
  const mainRef = useRef(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)

  useLayoutEffect(() => {
    const heading = mainRef.current?.querySelector('h1')
    document.title = `${heading?.textContent ?? 'Your training'} | FORGE`
    if (previousPath.current !== pathname) {
      mainRef.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname, data])

  return (
    <div className="app-shell">
      <a className="skip-link button button--primary" href="#main-content">Skip to content</a>
      <Header />
      <main className="main-content" id="main-content" ref={mainRef} tabIndex={-1}>
        <StorageNotice />
        <Outlet />
      </main>
      <footer className="app-footer">
        <Button variant="text" onClick={() => setPrivacyOpen(true)}>About local storage</Button>
      </footer>
      <Dialog open={privacyOpen} title="Your data stays on this device" onClose={() => setPrivacyOpen(false)} actions={<Button onClick={() => setPrivacyOpen(false)}>Got it</Button>}>
        <p>FORGE will save your exercises and routines in this browser. You can use it without an account.</p>
        <p>Clearing this browser&apos;s site data will remove your local plans. Account sign-in and synchronization will be available in a later update.</p>
      </Dialog>
    </div>
  )
}
