import { useLanguage } from '../i18n/useLanguage.js'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'
import AuthForm from '../components/AuthForm.jsx'
import AccountPanel from '../components/AccountPanel.jsx'
import { useAuth } from '../app/useAuth.js'

const titles = { login: 'Train with a plan', signup: 'Create your account', reset: 'Recover your account', password: 'Choose a new password' }
export default function LoginPage({ mode = 'login' }) {
  const { t } = useLanguage()
  const { user } = useAuth()
  return (
    <>
      <PageHeader eyebrow={t("YOUR ACCOUNT")} title={user && mode !== 'password' ? t("Your training, across devices") : t(titles[mode])} description={t("Keep your plans together, or continue as a guest.")} />
      <Card className="page-body account-card">
        {user && mode !== 'password' ? <AccountPanel /> : mode === 'password' && !user ? <EmptyState title={t("Open your recovery link")} description={t("Use the email link in the browser where you requested it. If it expired, request another link.")}><ButtonLink to="/forgot-password">{t("Request recovery email")}</ButtonLink><ButtonLink to="/" variant="secondary">{t("Continue as guest")}</ButtonLink></EmptyState> : <AuthForm key={mode} mode={mode} />}
      </Card>
    </>
  )
}
