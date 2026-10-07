import { useLanguage } from '../i18n/useLanguage.js'
import { useParams } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import PageHeader from '../components/PageHeader.jsx'
import RoutineForm from '../components/RoutineForm.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function RoutineEditorPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const { status, data } = useStorage()
  const routine = data?.routines.find((item) => item.id === id)
  return (
    <div className="routine-editor">
      <PageHeader eyebrow={t("TRAINING PLANS")} title={id ? t("Edit routine") : t("New routine")} description={id ? t("Update your routine name and training days.") : t("Give your plan a name and choose when you train.")} />
      {status === 'loading' && <p className="routine-status" role="status">{t("Loading your routine…")}</p>}
      {status === 'error' && <Card className="page-body"><EmptyState title={t("Saving is unavailable")} description={t("Resolve the storage issue above to continue.")}><ButtonLink to="/routines" variant="secondary">{t("Back to routines")}</ButtonLink></EmptyState></Card>}
      {status === 'ready' && (id && !routine ? (
        <Card className="page-body"><EmptyState title={t("Routine not found")} description={t("This routine may have been deleted. Choose another plan from your routines.")}><ButtonLink to="/routines">{t("Back to routines")}</ButtonLink></EmptyState></Card>
      ) : <RoutineForm key={id ?? 'new'} routine={routine} />)}
    </div>
  )
}
