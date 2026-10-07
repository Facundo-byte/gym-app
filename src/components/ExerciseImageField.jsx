import { useId, useRef, useState } from 'react'
import { processExerciseImage } from '../services/exerciseImages.js'
import { Button } from './Button.jsx'

export default function ExerciseImageField({ image, inputRef, onChange, error, onError, busy, setBusy, disabled }) {
  const id = useId()
  const request = useRef(0)
  const [feedback, setFeedback] = useState('')

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
      <label className="field__label" htmlFor={id}>Exercise image <span className="field__optional">(optional)</span></label>
      <div className={`image-upload ${image ? 'image-upload--preview' : ''}`}>
        {image && <img src={image} alt="Exercise preview" />}
        <div className="image-upload__copy" aria-hidden="true">
          <span className="image-upload__symbol">＋</span>
          <strong>{busy ? 'Processing image…' : image ? 'Replace image' : 'Upload an image'}</strong>
          <span>PNG or JPG · up to 5 MB</span>
        </div>
        <input ref={inputRef} className="image-upload__input" id={id} type="file" accept="image/png,image/jpeg" onChange={selectImage} disabled={disabled || busy} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`} aria-invalid={error ? true : undefined} />
      </div>
      <p className="field__hint" id={`${id}-hint`}>Resized to 640 px · stored under 256 KiB.</p>
      {error && <p className="field__error" id={`${id}-error`} role="alert">{error}</p>}
      {error && <Button variant="text" disabled={disabled || busy} onClick={() => { onError(''); setFeedback(image ? 'Keeping the current image.' : 'Continuing without an image.') }}>{image ? 'Keep current image' : 'Continue without image'}</Button>}
      <p className="sr-only" role="status">{feedback}</p>
      {image && <Button variant="text" disabled={disabled || busy} onClick={() => { onChange(null); onError(''); setFeedback('Image removed from this draft.') }}>Remove image</Button>}
    </div>
  )
}
