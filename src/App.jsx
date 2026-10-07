import { lazy, Suspense } from 'react'
import { BrowserRouter } from 'react-router'
import AppRouter from './app/AppRouter.jsx'
import AccountData from './app/AccountData.jsx'

const AuthProvider = lazy(() => import('./app/AuthProvider.jsx'))

export default function App() {
  return <BrowserRouter><Suspense fallback={<main className="main-content"><p role="status">Loading FORGE…</p></main>}><AuthProvider><AccountData><AppRouter /></AccountData></AuthProvider></Suspense></BrowserRouter>
}
