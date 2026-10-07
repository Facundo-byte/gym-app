import { useLanguage } from '../i18n/useLanguage.js'
import { useLocation } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import RoutineCard from '../components/RoutineCard.jsx'
import { ButtonLink } from '../components/Button.jsx'
import { useStorage } from '../app/useStorage.js'

export default function RoutinesPage() {
  const { t } = useLanguage()
  const { status, data } = useStorage()
  const { state } = useLocation()
  return (
    <>
      <PageHeader eyebrow={t("TRAINING PLANS")} title={t("Your routines")} description={t("Build your week and keep every session consistent.")} compactOnMobile action={status === 'ready' && <ButtonLink to="/routines/new">{t("+ New routine")}</ButtonLink>} />
      {state?.message && <p className="routine-status" role="status">{t(state.message)}</p>}
      <div className="page-body">
        {status === 'loading' && <p className="routine-status" role="status">{t("Loading your routines…")}</p>}
        {status === 'error' && <Card><EmptyState title={t("Your routines are unavailable")} description={t("Resolve the storage issue above to safely view and save routines.")} /></Card>}
        {status === 'ready' && (
          <>
            {data.routines.length ? (
              <div className="routine-grid" aria-label={t("Your routines")}>
                {data.routines.map((routine) => <RoutineCard key={routine.id} routine={routine} exercises={data.exercises} />)}
              </div>
            ) : <Card className="collection-placeholder"><EmptyState title={t("Your next plan starts here")} description={t("Create a routine and choose your training days. Each day starts with its own empty exercise list.")} /></Card>}
            <ButtonLink to="/routines/new" className="mobile-page-action">{t("+ New routine")}</ButtonLink>
          </>
        )}
      </div>
    </>
  )
}
