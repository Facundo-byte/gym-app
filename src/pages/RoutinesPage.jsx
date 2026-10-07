import { useLocation } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import RoutineCard from '../components/RoutineCard.jsx'
import { ButtonLink } from '../components/Button.jsx'
import { useStorage } from '../app/useStorage.js'

export default function RoutinesPage() {
  const { status, data } = useStorage()
  const { state } = useLocation()
  return (
    <>
      <PageHeader eyebrow="TRAINING PLANS" title="Your routines" description="Build your week and keep every session consistent." compactOnMobile action={status === 'ready' && <ButtonLink to="/routines/new">+ New routine</ButtonLink>} />
      {state?.message && <p className="routine-status" role="status">{state.message}</p>}
      <div className="page-body">
        {status === 'loading' && <p className="routine-status" role="status">Loading your routines…</p>}
        {status === 'error' && <Card><EmptyState title="Your routines are unavailable" description="Resolve the storage issue above to safely view and save routines." /></Card>}
        {status === 'ready' && (
          <>
            {data.routines.length ? (
              <div className="routine-grid" aria-label="Your routines">
                {data.routines.map((routine) => <RoutineCard key={routine.id} routine={routine} exercises={data.exercises} />)}
              </div>
            ) : <Card className="collection-placeholder"><EmptyState title="Your next plan starts here" description="Create a routine and choose your training days. Each day starts with its own empty exercise list." /></Card>}
            <ButtonLink to="/routines/new" className="mobile-page-action">+ New routine</ButtonLink>
          </>
        )}
      </div>
    </>
  )
}
