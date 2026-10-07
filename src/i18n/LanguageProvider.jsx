import { useCallback, useEffect, useMemo, useState } from 'react'
import { createLanguagePreference } from '../services/storage.js'
import { LanguageContext } from './LanguageContext.js'
import { localizedExerciseName, searchLocalizedExercises, translate } from './translate.js'

export default function LanguageProvider({ children }) {
  const [preference] = useState(() => createLanguagePreference())
  const [language, updateLanguage] = useState(() => preference.load())
  const [preferenceError, setPreferenceError] = useState(false)
  const setLanguage = useCallback(next => {
    if (!['en', 'es'].includes(next)) return
    updateLanguage(next)
    setPreferenceError(!preference.save(next))
  }, [preference])
  useEffect(() => { document.documentElement.lang = language }, [language])
  const value = useMemo(() => ({
    language,
    locale: language === 'es' ? 'es-AR' : 'en',
    setLanguage,
    preferenceError,
    t: (message, values) => translate(message, language, values),
    exerciseName: exercise => localizedExerciseName(exercise, language),
    searchExercises: (exercises, query) => searchLocalizedExercises(exercises, query, language),
    number: value => new Intl.NumberFormat(language === 'es' ? 'es-AR' : 'en', { maximumFractionDigits: 20 }).format(value),
  }), [language, setLanguage, preferenceError])
  return <LanguageContext value={value}>{children}</LanguageContext>
}
