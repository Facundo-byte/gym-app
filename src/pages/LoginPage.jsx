import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function LoginPage() {
  return (
    <>
      <PageHeader eyebrow="YOUR ACCOUNT" title="Train with a plan" description="You can use FORGE without signing in." />
      <Card className="page-body account-placeholder">
        <EmptyState title="Account sign-in is coming later" description="For now, your plans will stay in this browser. Signing in and syncing across devices are not available yet.">
          <ButtonLink to="/">Continue on this device</ButtonLink>
        </EmptyState>
      </Card>
    </>
  )
}
