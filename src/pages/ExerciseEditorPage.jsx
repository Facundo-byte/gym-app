import { useLanguage } from '../i18n/useLanguage.js'
import { useParams } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import ExerciseForm from '../components/ExerciseForm.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'
import { useStorage } from '../app/useStorage.js'

export default function ExerciseEditorPage() {
  const { t } = useLanguage()
  const { id } = useParams()
  const { status, data } = useStorage()
  const exercise = data?.exercises.find((item) => item.id === id)

  return (
    <div className="exercise-editor">
      <PageHeader eyebrow={t("EXERCISES")} title={id ? t("Edit exercise") : t("New exercise")} description={id ? t("Update this movement in your exercise library.") : t("Add a movement to your exercise library.")} />
      {status === 'loading' && <p className="exercise-status" role="status">{t("Loading your exercise…")}</p>}
      {status === 'error' && <Card className="page-body"><EmptyState title={t("Saving is unavailable")} description={t("Resolve the storage issue above to continue.")}><ButtonLink variant="secondary" to="/exercises">{t("Back to library")}</ButtonLink></EmptyState></Card>}
      {status === 'ready' && (id && !exercise ? (
        <Card className="page-body"><EmptyState title={t("Exercise not found")} description={t("This exercise may have been deleted. Choose another movement from your library.")}><ButtonLink to="/exercises">{t("Back to library")}</ButtonLink></EmptyState></Card>
      ) : <ExerciseForm key={id ?? 'new'} exercise={exercise} />)}
    </div>
  )
}
