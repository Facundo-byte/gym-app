import test from 'node:test'
import assert from 'node:assert/strict'
import { isStoredImageValid } from '../domain/exercises.js'
import { encodeImage, fitImageDimensions, processExerciseImage } from './exerciseImages.js'

test('invalid base64 framing, unreadable pixels and empty canvas output cannot become saved images', () => {
  for (const image of ['data:image/png;base64,A', 'data:image/png;base64,AA=', 'data:image/png;base64,AAAA=', 'data:image/png;base64,', 'data:,']) assert.equal(isStoredImageValid(image), false)
  assert.equal(isStoredImageValid('data:image/png;base64,aGVsbG8='), true)
  for (const [width, height] of [[0, 1], [1, 0], [Infinity, 1], [1, NaN], [-2, 10]]) assert.throws(() => fitImageDimensions(width, height), /readable pixels/)
  assert.throws(() => encodeImage({ toDataURL: () => 'data:,' }), /could not convert/)
})

test('image decoding and conversion failures release temporary URLs and never return a damaged image', async (t) => {
  const previous = { Image: globalThis.Image, document: globalThis.document, createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }
  t.after(() => {
    for (const key of ['Image', 'document']) {
      if (previous[key] === undefined) delete globalThis[key]
      else globalThis[key] = previous[key]
    }
    URL.createObjectURL = previous.createObjectURL
    URL.revokeObjectURL = previous.revokeObjectURL
  })
  const released = []
  URL.createObjectURL = () => 'blob:fixture-image'
  URL.revokeObjectURL = (url) => released.push(url)
  const file = { type: 'image/png', size: 20, slice: () => ({ arrayBuffer: async () => new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer }) }
  globalThis.Image = class { naturalWidth = 10; naturalHeight = 20; async decode() { throw new Error('Decode failed') } }
  await assert.rejects(processExerciseImage(file), /could not be opened/)
  globalThis.Image = class { naturalWidth = 10; naturalHeight = 20; async decode() {} }
  globalThis.document = { createElement: () => ({ getContext: () => null }) }
  await assert.rejects(processExerciseImage(file), /could not process/)
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:,' }) }
  await assert.rejects(processExerciseImage(file), /could not convert/)
  globalThis.document = { createElement: () => ({ getContext: () => ({ drawImage() { throw new Error('Canvas failed') } }) }) }
  await assert.rejects(processExerciseImage(file), /Canvas failed/)
  assert.deepEqual(released, Array(4).fill('blob:fixture-image'))
})
