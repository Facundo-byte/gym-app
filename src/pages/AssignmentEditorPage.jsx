import { useParams } from 'react-router'
import { useStorage } from '../app/useStorage.js'
import { weekdayName } from '../domain/routines.js'
import PageHeader from '../components/PageHeader.jsx'
import AssignmentForm from '../components/AssignmentForm.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { ButtonLink } from '../components/Button.jsx'

export default function AssignmentEditorPage() {
  const { id, dayOfWeek, assignmentId } = useParams()
  const { status, data } = useStorage()
  const routine = data?.routines.find((item) => item.id === id)
  const day = routine?.days.find((item) => item.dayOfWeek === Number(dayOfWeek))
  const assignment = day?.assignments.find((item) => item.id === assignmentId)
  const valid = routine && day && (!assignmentId || assignment)
  const backPath = routine ? `/routines/${encodeURIComponent(id)}?day=${day?.dayOfWeek ?? routine.days[0].dayOfWeek}` : '/routines'
  return (
    <div className="assignment-editor">
      <PageHeader eyebrow="ROUTINE EXERCISES" title={assignmentId ? 'Edit exercise targets' : 'Add exercise'} description={valid ? `${routine.name} · ${weekdayName(day.dayOfWeek)}` : 'Choose a movement and plan its targets for one training day.'} />
      {status === 'loading' && <p className="routine-status" role="status">Loading your training day…</p>}
      {status === 'error' && <Card className="page-body"><EmptyState title="Saving is unavailable" description="Resolve the storage issue above to continue."><ButtonLink to="/routines">Back to routines</ButtonLink></EmptyState></Card>}
      {status === 'ready' && (!valid ? (
        <Card className="page-body"><EmptyState title="Training day or assignment not found" description="This item may have been removed. Return to your routine and choose an available training day."><ButtonLink to={backPath}>Back to routine</ButtonLink></EmptyState></Card>
      ) : data.exercises.length ? <AssignmentForm key={`${id}:${dayOfWeek}:${assignmentId ?? 'new'}`} routine={routine} day={day} assignment={assignment} exercises={data.exercises} /> : (
        <Card className="page-body"><EmptyState title="Your exercise library is empty" description="Create an exercise in your library before adding one to this training day."><ButtonLink to="/exercises">Open exercise library</ButtonLink><ButtonLink variant="text" to={backPath}>Back to routine</ButtonLink></EmptyState></Card>
      ))}
    </div>
  )
}
