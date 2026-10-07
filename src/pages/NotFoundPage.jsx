import { useLanguage } from '../i18n/useLanguage.js'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function NotFoundPage() {
  const { t } = useLanguage()
  return (
    <>
      <PageHeader eyebrow="404" title={t("This page took a rest day")} description={t("The address you opened does not match a page in FORGE.")} />
      <Card className="page-body">
        <EmptyState title={t("Let's get you back on track")} description={t("Head back to your training space or use the navigation to find your routines and exercises.")}>
          <ButtonLink to="/">{t("Back to Home")}</ButtonLink>
        </EmptyState>
      </Card>
    </>
  )
}
