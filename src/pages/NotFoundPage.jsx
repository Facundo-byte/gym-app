import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="This page took a rest day" description="The address you opened does not match a page in FORGE." />
      <Card className="page-body">
        <EmptyState title="Let&apos;s get you back on track" description="Head back to your training space or use the navigation to find your routines and exercises.">
          <ButtonLink to="/">Back to Home</ButtonLink>
        </EmptyState>
      </Card>
    </>
  )
}
