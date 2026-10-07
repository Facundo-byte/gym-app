import { useAuth } from './useAuth.js'
import StorageProvider from './StorageProvider.jsx'

export default function AccountData({ children }) {
  const { status, scope } = useAuth()
  if (status === 'loading') return <main className="main-content"><p role="status">Checking your account session…</p></main>
  return <StorageProvider key={scope.key} service={scope.service} mode={scope.mode}>{children}</StorageProvider>
}
