import { isStoredImageValid, MAX_IMAGE_BYTES } from '../domain/exercises.js'
import { StorageError } from './storage.js'

export const IMAGE_BUCKET = 'forge-exercise-images'
export async function sha256(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function imageBytes(image) {
  if (!isStoredImageValid(image) || typeof image !== 'string') throw new StorageError('invalid', 'The exercise image is not a supported processed upload.')
  const [header, encoded] = image.split(',')
  return { mime: header.slice(5).split(';')[0], bytes: Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0)) }
}

function imageDataURL(bytes, mime) {
  const chunks = []
  for (let offset = 0; offset < bytes.length; offset += 8192) chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)))
  const image = `data:${mime};base64,${btoa(chunks.join(''))}`
  if (!isStoredImageValid(image)) throw new StorageError('invalid', 'An account image exceeds the supported image limit.')
  return image
}

export function createCloudImages(client, ownerId, assertActor) {
  const known = new Map()
  const bucket = client.storage.from(IMAGE_BUCKET)
  async function upload(image) {
    if (image == null) return null
    const { bytes, mime } = imageBytes(image)
    const path = `${ownerId}/${await sha256(bytes)}.${mime === 'image/png' ? 'png' : 'jpeg'}`
    await assertActor()
    if (!known.has(path)) {
      const { error } = await bucket.upload(path, bytes, { contentType: mime, upsert: false })
      if (error && String(error.statusCode) !== '409') throw new StorageError('remote', 'The image could not be uploaded. Your saved plan and draft are unchanged. Check your connection and retry.', error)
      await assertActor()
      known.set(path, image)
    }
    return { path }
  }
  async function download(reference) {
    if (reference == null) return null
    const path = reference.path
    if (typeof path !== 'string' || !new RegExp(`^${ownerId}/[a-f0-9]{64}\\.(png|jpeg)$`).test(path)) throw new StorageError('invalid', 'An account image has an invalid owner or path. No data has been changed.')
    await assertActor()
    if (!known.has(path)) {
      const { data, error } = await bucket.download(path)
      if (error || !data) throw new StorageError('remote', 'An account image could not be loaded. Check your connection and retry; your account data has been preserved.', error)
      if (data.size > MAX_IMAGE_BYTES) throw new StorageError('invalid', 'An account image exceeds the supported image limit.')
      const bytes = new Uint8Array(await data.arrayBuffer())
      if (!path.includes(`/${await sha256(bytes)}.`)) throw new StorageError('invalid', 'An account image did not match its saved reference. No data has been changed.')
      await assertActor()
      known.set(path, imageDataURL(bytes, path.endsWith('.png') ? 'image/png' : 'image/jpeg'))
    }
    return known.get(path)
  }
  return { upload, download, clear: () => known.clear() }
}
