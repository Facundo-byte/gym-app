import { useLanguage } from '../i18n/useLanguage.js'
import { useState } from 'react'
import { useLocation } from 'react-router'
import PageHeader from '../components/PageHeader.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ExerciseCard from '../components/ExerciseCard.jsx'
import { Button, ButtonLink } from '../components/Button.jsx'
import { useStorage } from '../app/useStorage.js'

export default function ExercisesPage() {
  const { t, searchExercises } = useLanguage()
  const { status, data } = useStorage()
  const { state } = useLocation()
  const [query, setQuery] = useState('')
  const exercises = data?.exercises ?? []
  const matches = searchExercises(exercises, query)

  return (
    <div className="exercise-library">
      <PageHeader eyebrow={t("EXERCISES")} title={t("Exercise library")} description={t("Find your movements and build a library that fits your training.")} compactOnMobile />
      {state?.message && <p className="exercise-status" role="status">{t(state.message)}</p>}
      <div className="page-body exercise-library__body">
        <div className="exercise-toolbar">
          <div className="exercise-search">
            <label className="sr-only" htmlFor="exercise-search">{t("Search exercises")}</label>
            <span aria-hidden="true">⌕</span>
            <input id="exercise-search" type="search" placeholder={t("Search")} value={query} onChange={(event) => setQuery(event.target.value)} disabled={status !== 'ready'} />
          </div>
          {status === 'ready' && <ButtonLink to="/exercises/new">{t("+ Add exercise")}</ButtonLink>}
        </div>
        {status === 'loading' && <p role="status" className="exercise-status">{t("Loading your exercise library…")}</p>}
        {status === 'error' && <Card><EmptyState title={t("Your library is unavailable")} description={t("Resolve the storage issue above to safely view and save exercises.")} /></Card>}
        {status === 'ready' && (
          <>
            {matches.length ? (
              <div className="exercise-grid" aria-label={t("Exercise library")}>
                {matches.map((exercise) => <ExerciseCard key={exercise.id} exercise={exercise} />)}
              </div>
            ) : (
              <Card>
                {exercises.length ? (
                  <EmptyState title={t("No matching exercises")} description={t("Try another name or clear your search to see the full library.")}>
                    <Button variant="secondary" onClick={() => setQuery('')}>{t("Clear search")}</Button>
                  </EmptyState>
                ) : <EmptyState title={t("Your library is empty")} description={t("Add your first exercise to start building your library.")} />}
              </Card>
            )}
            <p className="sr-only" role="status">{t(matches.length === 1 ? '{count} exercise shown.' : '{count} exercises shown.', { count: matches.length })}</p>
            <ButtonLink to="/exercises/new" className="mobile-page-action">{t("+ Add exercise")}</ButtonLink>
          </>
        )}
      </div>
    </div>
  )
}
