// Native registration keeps activation under explicit user control, including across tabs.
export function startPwaUpdates({ worker, target, document, online, reload, onAvailable, onError }) {
  let disposed = false
  let registration
  let reloadRequested = false
  let lastCheck = 0
  let installing

  function inspect() {
    if (!disposed && worker.controller && registration?.waiting) onAvailable()
  }
  function watchInstalling() {
    installing?.removeEventListener('statechange', inspect)
    installing = registration.installing
    installing?.addEventListener('statechange', inspect)
  }
  function controllerChanged() {
    if (reloadRequested && !disposed) { reloadRequested = false; reload() }
    else inspect()
  }
  async function check() {
    if (disposed || !registration || !online() || document.visibilityState === 'hidden' || Date.now() - lastCheck < 30_000) return
    lastCheck = Date.now()
    try { await registration.update(); inspect() } catch { /* The current version remains usable when the update server is unavailable. */ }
  }

  worker.addEventListener('controllerchange', controllerChanged)
  target.addEventListener('focus', check)
  target.addEventListener('online', check)
  document.addEventListener('visibilitychange', check)
  const interval = target.setInterval(check, 60 * 60 * 1000)
  worker.register('/sw.js', { updateViaCache: 'none' }).then(result => {
    if (disposed) return
    registration = result
    registration.addEventListener('updatefound', watchInstalling)
    watchInstalling()
    inspect()
  }).catch(() => { if (!disposed) onError() })

  return {
    apply() {
      if (disposed || !registration) return false
      if (!registration.waiting) { reload(); return true }
      reloadRequested = true
      try { registration.waiting.postMessage({ type: 'SKIP_WAITING' }); return true }
      catch { reloadRequested = false; onError(); return false }
    },
    dispose() {
      disposed = true
      worker.removeEventListener('controllerchange', controllerChanged)
      target.removeEventListener('focus', check)
      target.removeEventListener('online', check)
      document.removeEventListener('visibilitychange', check)
      registration?.removeEventListener('updatefound', watchInstalling)
      installing?.removeEventListener('statechange', inspect)
      target.clearInterval(interval)
    },
  }
}
