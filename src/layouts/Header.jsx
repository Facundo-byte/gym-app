import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { Button } from '../components/Button.jsx'
import { useAuth } from '../app/useAuth.js'

const links = [{ to: '/', label: 'Home', end: true }, { to: '/routines', label: 'Routines' }, { to: '/exercises', label: 'Exercises' }, { to: '/login', label: 'Log in', account: true }]

function NavigationLinks({ onNavigate, user, busy, onLogout }) {
  return (
    <ul>
      {links.map(({ to, label, end, account }) => (
        <li key={to}>
          <NavLink to={to} end={end} onClick={onNavigate} className={`nav-link ${account ? 'nav-link--account' : ''}`}>{account && user ? 'Account' : label}</NavLink>
        </li>
      ))}
      {user && <li><button type="button" disabled={busy} className="nav-link nav-link--account nav-link--button" onClick={onLogout}>{busy ? 'Logging out…' : 'Log out'}</button></li>}
    </ul>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const logoutLock = useRef(false)
  const [openPath, setOpenPath] = useState(null)
  const headerRef = useRef(null)
  const toggleRef = useRef(null)
  const isOpen = openPath === pathname

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isOpen && event.key === 'Escape') { setOpenPath(null); toggleRef.current?.focus() }
    }
    const handlePointerDown = (event) => {
      if (isOpen && !headerRef.current?.contains(event.target)) setOpenPath(null)
    }
    const media = window.matchMedia('(min-width: 768px)')
    const isMobileControl = (element) => element === toggleRef.current || headerRef.current?.querySelector('.mobile-nav')?.contains(element)
    let previousFocus = document.activeElement
    const handleFocus = (event) => { previousFocus = event.target }
    const handleResize = () => {
      // CSS can hide a focused link before the media-query event runs.
      if (media.matches) {
        setOpenPath(null)
        if (isMobileControl(previousFocus)) (headerRef.current?.querySelector('.desktop-nav [aria-current="page"]') ?? headerRef.current?.querySelector('.brand'))?.focus()
      } else if (headerRef.current?.querySelector('.desktop-nav')?.contains(previousFocus)) toggleRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('focusin', handleFocus)
    media.addEventListener('change', handleResize)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('focusin', handleFocus)
      media.removeEventListener('change', handleResize)
    }
  }, [isOpen])

  function navigateFromMenu(event) {
    setOpenPath(null)
    if (event.currentTarget.pathname === pathname) toggleRef.current?.focus()
  }

  async function logout() {
    if (logoutLock.current) return
    logoutLock.current = true; setLoggingOut(true); setLogoutError('')
    try { await signOut(); navigate('/login') }
    catch (error) { setLogoutError(error.message) }
    finally { logoutLock.current = false; setLoggingOut(false) }
  }

  return (
    <header ref={headerRef} className="site-header">
      <div className="site-header__inner">
        <Link className="brand" to="/" aria-label="FORGE home" onClick={() => setOpenPath(null)}>FORGE</Link>
        <nav className="desktop-nav" aria-label="Main navigation"><NavigationLinks user={user} onLogout={logout} busy={loggingOut} /></nav>
        <Button ref={toggleRef} variant="secondary" className="menu-toggle" aria-label={isOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={isOpen} aria-controls="mobile-navigation" onClick={() => setOpenPath(isOpen ? null : pathname)}>
          <span aria-hidden="true">{isOpen ? '×' : '☰'}</span>
        </Button>
      </div>
      <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation" hidden={!isOpen}>
        <NavigationLinks onNavigate={navigateFromMenu} user={user} onLogout={logout} busy={loggingOut} />
      </nav>
      {logoutError && <p className="field__error header-error" role="alert">{logoutError}</p>}
    </header>
  )
}
