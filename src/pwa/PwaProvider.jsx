import { useEffect, useRef, useState } from 'react'
import { PwaContext } from './PwaContext.js'
import { startPwaUpdates } from './updates.js'

export default function PwaProvider({ children }) {
  const displayMode = window.matchMedia('(display-mode: standalone)')
  const [installed, setInstalled] = useState(() => displayMode.matches || navigator.standalone === true)
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [preparationError, setPreparationError] = useState(false)
  const updates = useRef(null)

  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)')
    const modeChanged = () => setInstalled(mode.matches || navigator.standalone === true)
    const connectionChanged = () => setOffline(!navigator.onLine)
    const beforeInstall = event => { event.preventDefault(); setInstallPrompt(event) }
    const appInstalled = () => { setInstalled(true); setInstallPrompt(null) }
    mode.addEventListener('change', modeChanged)
    window.addEventListener('online', connectionChanged)
    window.addEventListener('offline', connectionChanged)
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', appInstalled)
    if (import.meta.env.PROD && 'serviceWorker' in navigator && window.isSecureContext) {
      updates.current = startPwaUpdates({
        worker: navigator.serviceWorker, target: window, document,
        online: () => navigator.onLine, reload: () => window.location.reload(),
        onAvailable: () => setUpdateAvailable(true), onError: () => setPreparationError(true),
      })
    }
    return () => {
      mode.removeEventListener('change', modeChanged)
      window.removeEventListener('online', connectionChanged)
      window.removeEventListener('offline', connectionChanged)
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', appInstalled)
      updates.current?.dispose()
    }
  }, [])

  async function install() {
    if (!installPrompt) return false
    try {
      await installPrompt.prompt()
      return (await installPrompt.userChoice).outcome === 'accepted'
    } finally { setInstallPrompt(null) }
  }

  return <PwaContext value={{ installed, offline, installPrompt, install, updateAvailable, preparationError, applyUpdate: () => updates.current?.apply() ?? false }}>{children}</PwaContext>
}
