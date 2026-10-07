import { useState } from 'react'
import { useLocation } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ExerciseCard from '../components/ExerciseCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { useStorage } from '../app/useStorage.js'
import { searchExercises } from '../domain/exercises.js'

export default function ExercisesPage() {
  const { status, data } = useStorage()
  const { state } = useLocation()
  const [query, setQuery] = useState('')
  const exercises = data?.exercises ?? []
  const matches = searchExercises(exercises, query)

  return (
    <div className="exercise-library">
      <PageHeader eyebrow="EXERCISES" title="Exercise library" description="Find your movements and build a library that fits your training." compactOnMobile />
      {state?.message && <p className="exercise-status" role="status">{state.message}</p>}
      <div className="page-body exercise-library__body">
        <div className="exercise-toolbar">
          <div className="exercise-search">
            <label className="sr-only" htmlFor="exercise-search">Search exercises</label>
            <span aria-hidden="true">⌕</span>
            <input id="exercise-search" type="search" placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} disabled={status !== 'ready'} />
          </div>
          {status === 'ready' && <ButtonLink to="/exercises/new">+ Add exercise</ButtonLink>}
        </div>
        {status === 'loading' && <p role="status" className="exercise-status">Loading your exercise library…</p>}
        {status === 'error' && <Card><EmptyState title="Your library is unavailable" description="Resolve the storage issue above to safely view and save exercises." /></Card>}
        {status === 'ready' && (
          <>
            {matches.length ? (
              <div className="exercise-grid" aria-label="Exercise library">
                {matches.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}
              </div>
            ) : (
              <Card>
                {exercises.length ? (
                  <EmptyState title="No matching exercises" description="Try another name or clear your search to see the full library.">
                    <Button variant="secondary" onClick={() => setQuery('')}>Clear search</Button>
                  </EmptyState>
                ) : <EmptyState title="Your library is empty" description="Add your first exercise to start building your library." />}
              </Card>
            )}
            <p className="sr-only" role="status">{matches.length} {matches.length === 1 ? 'exercise' : 'exercises'} shown.</p>
            <ButtonLink to="/exercises/new" className="mobile-page-action">+ Add exercise</ButtonLink>
          </>
        )}
      </div>
    </div>
  )
}
