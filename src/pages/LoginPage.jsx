import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'
import AuthForm from '../components/AuthForm.jsx'
import AccountPanel from '../components/AccountPanel.jsx'
import { useAuth } from '../app/useAuth.js'

const titles = { login: 'Train with a plan', signup: 'Create your account', reset: 'Recover your account', password: 'Choose a new password' }
export default function LoginPage({ mode = 'login' }) {
  const { user } = useAuth()
  return (
    <>
      <PageHeader eyebrow="YOUR ACCOUNT" title={user && mode !== 'password' ? 'Your training, across devices' : titles[mode]} description="Keep your plans together, or continue as a guest." />
      <Card className="page-body account-card">
        {user && mode !== 'password' ? <AccountPanel /> : mode === 'password' && !user ? <EmptyState title="Open your recovery link" description="Use the email link in the browser where you requested it. If it expired, request another link."><ButtonLink to="/forgot-password">Request recovery email</ButtonLink><ButtonLink to="/" variant="secondary">Continue as guest</ButtonLink></EmptyState> : <AuthForm key={mode} mode={mode} />}
      </Card>
    </>
  )
}
