import { useState } from 'react'

export default function ExerciseThumbnail({ exercise, className = 'exercise-thumbnail' }) {
  const [failedImage, setFailedImage] = useState(null)
  return (
    <div className={className}>
      {exercise?.image && failedImage !== exercise.image ? <img src={exercise.image} alt="" onError={() => setFailedImage(exercise.image)} /> : <span aria-hidden="true">●</span>}
    </div>
  )
}
