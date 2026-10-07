import { use } from 'react'
import { AuthContext } from './AuthContext.js'
export function useAuth() {
  const value = use(AuthContext)
  if (!value) throw new Error('Account state must be used inside AuthProvider.')
  return value
}
