import { useCallback, useEffect, useState } from 'react'
import { cloudRuntime } from '../services/supabaseClient.js'
import { createAuthService } from '../services/authService.js'
import { createAccountSession } from '../services/accountSession.js'
import { AuthContext } from './AuthContext.js'

export default function AuthProvider({ children, runtime = cloudRuntime }) {
  const [auth] = useState(() => createAuthService(runtime.client))
  const [scopes] = useState(() => createAccountSession(runtime.client))
  const [state, setState] = useState(() => ({ status: runtime.configured ? 'loading' : 'ready', user: null, scope: runtime.configured ? null : scopes.select(null), error: null, notice: null }))
  const signOut = useCallback(async () => {
    const result = await auth.signOut()
    if (result.notice) setState((current) => ({ ...current, notice: result.notice }))
    return result
  }, [auth])
  useEffect(() => {
    if (!runtime.configured) return
    let active = true
    let events = 0
    const apply = (session, error = null) => {
      if (!active) return
      const user = session?.user ?? null
      setState({ status: 'ready', user, scope: scopes.select(user), error, notice: null })
    }
    // Keep the callback synchronous; Supabase holds its session lock during notifications.
    const unsubscribe = auth.subscribe((event, session) => {
      events++
      apply(session, event === 'SIGNED_OUT' ? null : undefined)
    })
    const initialEvents = events
    auth.getSession().then(
      (session) => { if (events === initialEvents) apply(session) },
      (error) => { if (events === initialEvents) apply(null, error) },
    )
    return () => { active = false; unsubscribe() }
  }, [auth, runtime.configured, scopes])
  return <AuthContext value={{ ...state, auth, signOut, configured: runtime.configured, configError: runtime.error }}>{children}</AuthContext>
}
