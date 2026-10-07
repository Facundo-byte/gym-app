import { isStoredImageValid, MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, MAX_SOURCE_BYTES } from '../domain/exercises.js'

export function validateImageFile(file, bytes) {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPG image.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 5 MB.')
  if (file.size === 0) throw new Error('This file is empty. Choose another image.')
  if (bytes) {
    const signature = [...bytes]
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => signature[index] === value)
    const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255
    if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpeg)) throw new Error('This file is not a valid PNG or JPG image.')
  }
}

export function fitImageDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error('This image has no readable pixels. Choose another image.')
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function encodeImage(canvas) {
  const png = canvas.toDataURL('image/png')
  if (isStoredImageValid(png) && typeof png === 'string') return png
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality)
    if (isStoredImageValid(jpeg) && typeof jpeg === 'string') return jpeg
  }
  if (typeof png !== 'string' || png.length <= MAX_IMAGE_BYTES) throw new Error('Your browser could not convert this image. Choose another PNG or JPG.')
  throw new Error('This image cannot fit the 256 KiB storage limit. Choose a simpler or smaller image.')
}

export async function processExerciseImage(file) {
  validateImageFile(file)
  validateImageFile(file, new Uint8Array(await file.slice(0, 8).arrayBuffer()))
  const url = URL.createObjectURL(file)
  const image = new Image()
  try {
    image.src = url
    try { await image.decode() } catch { throw new Error('This image could not be opened. Choose another PNG or JPG.') }
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('This image has no readable pixels. Choose another image.')
    const canvas = document.createElement('canvas')
    Object.assign(canvas, fitImageDimensions(image.naturalWidth, image.naturalHeight))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not process this image. Try another browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return encodeImage(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}
