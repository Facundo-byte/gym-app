import { useLanguage } from '../i18n/useLanguage.js'
import { useId, useRef, useState } from 'react'
import { processExerciseImage } from '../services/exerciseImages.js'
import { Button } from './Button.jsx'

export default function ExerciseImageField({ image, defaultImage = null, inputRef, onChange, error, onError, busy, setBusy, disabled }) {
  const { t } = useLanguage()
  const id = useId()
  const request = useRef(0)
  const [feedback, setFeedback] = useState('')
  const preview = image ?? defaultImage

  async function selectImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const current = ++request.current
    setBusy(true)
    setFeedback('Processing image…')
    onError('')
    try {
      const processed = await processExerciseImage(file)
      if (current !== request.current) return
      onChange(processed)
      setFeedback('Image ready to save.')
    } catch (failure) {
      if (current !== request.current) return
      onError(failure.message)
      setFeedback('')
    } finally {
      if (current === request.current) setBusy(false)
    }
  }

  return (
    <div className="field exercise-image-field">
      <label className="field__label" htmlFor={id}>{t("Exercise image")}{' '}<span className="field__optional">{t("(optional)")}</span></label>
      <div className={`image-upload ${preview ? 'image-upload--preview' : ''}`}>
        {preview && <img src={preview} alt={t("Exercise preview")} />}
        <div className="image-upload__copy" aria-hidden="true">
          <span className="image-upload__symbol">＋</span>
          <strong>{busy ? t("Processing image…") : preview ? t("Replace image") : t("Upload an image")}</strong>
          <span>{t("PNG or JPG · up to 5 MB")}</span>
        </div>
        <input ref={inputRef} className="image-upload__input" id={id} type="file" accept="image/png,image/jpeg" onChange={selectImage} disabled={disabled || busy} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={error ? true : undefined} />
      </div>
      <p className="field__hint" id={`${id}-hint`}>{t("Resized to 640 px · stored under 256 KiB.")}</p>
      {!image && defaultImage && <p className="field__hint">{t("Default illustration. Upload an image to replace it.")}</p>}
      {error && <p className="field__error" id={`${id}-error`} role="alert">{t(error)}</p>}
      {error && <Button variant="text" disabled={disabled || busy} onClick={() => { onError(''); setFeedback(preview ? 'Keeping the current image.' : 'Continuing without an image.') }}>{preview ? t("Keep current image") : t("Continue without image")}</Button>}
      <p className="sr-only" role="status">{t(feedback)}</p>
      {image && <Button variant="text" disabled={disabled || busy} onClick={() => { onChange(null); onError(''); setFeedback(defaultImage ? 'Default illustration restored in this draft.' : 'Image removed from this draft.') }}>{defaultImage ? t("Use default image") : t("Remove image")}</Button>}
    </div>
  )
}
