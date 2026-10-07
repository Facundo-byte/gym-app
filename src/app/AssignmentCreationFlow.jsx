import { useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import AssignmentEditorPage from '../pages/AssignmentEditorPage.jsx'
import { useStorage } from './useStorage.js'

function AssignmentCreationDraft({ routineId, dayOfWeek }) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState({ exerciseId: '', sets: '', reps: '', targetWeight: '' })
  const [query, setQuery] = useState('')
  const [createdExerciseId, setCreatedExerciseId] = useState(null)
  const assignmentPath = `/routines/${encodeURIComponent(routineId)}/days/${dayOfWeek}/assignments/new`

  function onExerciseCreated(exercise) {
    setDraft((current) => ({ ...current, exerciseId: exercise.id }))
    setQuery('')
    setCreatedExerciseId(exercise.id)
    navigate(assignmentPath, { replace: true })
  }

  return <Outlet context={{ draft, setDraft, query, setQuery, createdExerciseId, assignmentPath, createPath: `${assignmentPath}/exercises/new`, onExerciseCreated }} />
}

export default function AssignmentCreationFlow() {
  const { id, dayOfWeek } = useParams()
  const { status, data } = useStorage()
  const routine = data?.routines.find((item) => item.id === id)
  const day = routine?.days.find((item) => item.dayOfWeek === Number(dayOfWeek))

  if (status !== 'ready' || !day) return <AssignmentEditorPage />
  return <AssignmentCreationDraft key={`${id}:${day.dayOfWeek}`} routineId={id} dayOfWeek={day.dayOfWeek} />
}
