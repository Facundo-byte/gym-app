import { useParams } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import PageHeader from '../components/PageHeader.jsx'
import RoutineForm from '../components/RoutineForm.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function RoutineEditorPage() {
  const { id } = useParams()
  const { status, data } = useStorage()
  const routine = data?.routines.find((item) => item.id === id)
  return (
    <div className="routine-editor">
      <PageHeader eyebrow="TRAINING PLANS" title={id ? 'Edit routine' : 'New routine'} description={id ? 'Update your routine name and training days.' : 'Give your plan a name and choose when you train.'} />
      {status === 'loading' && <p className="routine-status" role="status">Loading your routine…</p>}
      {status === 'error' && <Card className="page-body"><EmptyState title="Saving is unavailable" description="Resolve the storage issue above to continue."><ButtonLink to="/routines" variant="secondary">Back to routines</ButtonLink></EmptyState></Card>}
      {status === 'ready' && (id && !routine ? (
        <Card className="page-body"><EmptyState title="Routine not found" description="This routine may have been deleted. Choose another plan from your routines."><ButtonLink to="/routines">Back to routines</ButtonLink></EmptyState></Card>
      ) : <RoutineForm key={id ?? 'new'} routine={routine} />)}
    </div>
  )
}
