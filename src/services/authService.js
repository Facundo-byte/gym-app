import { ValidationError } from '../domain/exercises.js'
import { validateCredentials } from '../domain/accounts.js'
import { StorageError } from './storage.js'

function unwrap(result) {
  if (result.error) throw new StorageError('auth', result.error.message || 'The account request could not be completed. Try again.', result.error)
  return result.data
}

export function createAuthService(client, { origin = () => window.location.origin } = {}) {
  function requireClient() {
    if (!client) throw new StorageError('configuration', 'Account connection has not been configured. You can continue as a guest.')
    return client.auth
  }
  function credentials(input, mode) {
    const errors = validateCredentials(input, mode)
    if (Object.keys(errors).length) throw new ValidationError(errors)
    return { email: input.email?.trim(), password: input.password }
  }
  return {
    getSession: async () => unwrap(await requireClient().getSession())?.session ?? null,
    subscribe: (listener) => {
      const { data } = requireClient().onAuthStateChange(listener)
      return () => data.subscription.unsubscribe()
    },
    signIn: async (input) => unwrap(await requireClient().signInWithPassword(credentials(input, 'login'))),
    signUp: async (input) => unwrap(await requireClient().signUp({ ...credentials(input, 'signup'), options: { emailRedirectTo: `${origin()}/login` } })),
    requestPasswordReset: async (input) => unwrap(await requireClient().resetPasswordForEmail(credentials(input, 'reset').email, { redirectTo: `${origin()}/account/password` })),
    updatePassword: async (input) => {
      const { password } = credentials(input, 'password')
      return unwrap(await requireClient().updateUser({ password }))
    },
    // This browser signs out; sessions on other devices remain available.
    signOut: async () => {
      const auth = requireClient()
      const result = await auth.signOut({ scope: 'local' })
      if (result.error) {
        // The SDK can remove the local session even when remote revocation fails.
        const remaining = await auth.getSession()
        if (!remaining.error && !remaining.data?.session) return { notice: 'You are signed out on this browser. The account service could not confirm ending the remote session. Your guest plans are available; sign in again if needed.' }
        unwrap(result)
      }
      return { notice: null }
    },
  }
}
