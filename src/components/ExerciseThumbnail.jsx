import { useState } from 'react'
import { getDefaultExerciseImage } from '../config/defaultExercises.js'

export default function ExerciseThumbnail({ exercise, className = 'exercise-thumbnail' }) {
  const [failedImage, setFailedImage] = useState(null)
  const image = exercise?.image ?? getDefaultExerciseImage(exercise)
  return (
    <div className={className} data-default-image={!exercise?.image && image ? true : undefined}>
      {image && failedImage !== image ? <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailedImage(image)} /> : <span aria-hidden="true">●</span>}
    </div>
  )
}
