import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { createGymService } from './gymService.js'

function memoryStorage(raw = null) {
  const values = new Map(raw === null ? [] : [[STORAGE_KEY, raw]])
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

function setup(raw = null) {
  const storage = memoryStorage(raw)
  return { storage, adapter: createStorageAdapter({ getStorage: () => storage }) }
}

test('a new installation loads an empty versioned document without writing or seeding', async () => {
  const { storage, adapter } = setup()
  const data = await adapter.load()
  assert.deepEqual(data, createEmptyDocument())
  assert.equal(storage.getItem(STORAGE_KEY), null)
  data.exercises.push({ id: 'isolated-test-record' })
  assert.deepEqual(await adapter.load(), createEmptyDocument())
})

test('an intentionally empty document stays empty across a new adapter', async () => {
  const { storage, adapter } = setup()
  await adapter.save(createEmptyDocument())
  const reloaded = createStorageAdapter({ getStorage: () => storage })
  assert.deepEqual(await reloaded.load(), createEmptyDocument())
})

test('valid data round-trips without sharing mutable references', async () => {
  const { storage, adapter } = setup()
  const input = { ...createEmptyDocument(), exercises: [{ id: 'fixture', name: 'Test movement', muscle: 'Chest' }] }
  const saved = await adapter.save(input)
  input.exercises[0].name = 'Unsaved edit'
  saved.exercises[0].name = 'Another unsaved edit'
  assert.equal((await adapter.load()).exercises[0].name, 'Test movement')
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).exercises[0].name, 'Test movement')
})

test('malformed JSON is preserved and cannot be overwritten by a save', async () => {
  const raw = '{broken data'
  const { storage, adapter } = setup(raw)
  await assert.rejects(adapter.load(), { code: 'corrupt' })
  await assert.rejects(adapter.save(createEmptyDocument()), { code: 'corrupt' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('unsupported versions are preserved', async () => {
  const raw = JSON.stringify({ ...createEmptyDocument(), schemaVersion: 99 })
  const { storage, adapter } = setup(raw)
  await assert.rejects(adapter.load(), { code: 'unsupported' })
  await assert.rejects(adapter.save(createEmptyDocument()), { code: 'unsupported' })
  assert.equal(storage.getItem(STORAGE_KEY), raw)
})

test('invalid document structures are rejected without changing storage', async () => {
  for (const invalid of [null, [], {}, { ...createEmptyDocument(), routines: {} }, { ...createEmptyDocument(), exercises: [null] }, { ...createEmptyDocument(), trackingStartedOn: 7 }]) {
    const raw = JSON.stringify(invalid)
    const { storage, adapter } = setup(raw)
    await assert.rejects(adapter.load(), { code: 'invalid' })
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('blocked storage access and read errors become actionable errors', async () => {
  const blocked = createStorageAdapter({ getStorage: () => { throw new Error('blocked') } })
  await assert.rejects(blocked.load(), { code: 'unavailable' })
  const { storage, adapter } = setup()
  storage.getItem = () => { throw new Error('read failed') }
  await assert.rejects(adapter.load(), { code: 'unavailable' })
})

test('quota and generic write failures preserve the previous saved document', async () => {
  for (const failure of [new DOMException('Full', 'QuotaExceededError'), new Error('Write blocked')]) {
    const original = JSON.stringify(createEmptyDocument())
    const { storage, adapter } = setup(original)
    await adapter.load()
    storage.setItem = () => { throw failure }
    await assert.rejects(adapter.save({ ...createEmptyDocument(), exercises: [{ id: 'new' }] }), { code: failure.name === 'QuotaExceededError' ? 'quota' : 'unavailable' })
    assert.equal(storage.getItem(STORAGE_KEY), original)
  }
})

test('oversized and unserializable documents cannot replace saved data', async () => {
  const original = JSON.stringify(createEmptyDocument())
  const { storage, adapter } = setup(original)
  await assert.rejects(adapter.save({ ...createEmptyDocument(), extra: 'x'.repeat(3 * 1024 * 1024) }), { code: 'quota' })
  const cyclic = createEmptyDocument()
  cyclic.extra = cyclic
  await assert.rejects(adapter.save(cyclic), { code: 'invalid' })
  assert.equal(storage.getItem(STORAGE_KEY), original)
})

test('a known-stale document cannot overwrite an update from another tab', async () => {
  const { storage, adapter } = setup(JSON.stringify(createEmptyDocument()))
  await adapter.load()
  const updated = JSON.stringify({ ...createEmptyDocument(), exercises: [{ id: 'other-tab' }] })
  storage.setItem(STORAGE_KEY, updated)
  await assert.rejects(adapter.save(createEmptyDocument()), { code: 'stale' })
  assert.equal(storage.getItem(STORAGE_KEY), updated)
})

test('explicit reset removes only FORGE data and permits a fresh load', async () => {
  const { storage, adapter } = setup('{bad')
  storage.setItem('unrelated-app', 'keep')
  await adapter.reset()
  assert.equal(storage.getItem(STORAGE_KEY), null)
  assert.equal(storage.getItem('unrelated-app'), 'keep')
  assert.deepEqual(await adapter.load(), createEmptyDocument())
})

test('failed reset retains the original data', async () => {
  const { storage, adapter } = setup('{bad')
  storage.removeItem = () => { throw new Error('blocked') }
  await assert.rejects(adapter.reset(), { code: 'unavailable' })
  assert.equal(storage.getItem(STORAGE_KEY), '{bad')
})

test('the service accepts a replacement adapter and preserves asynchronous errors', async () => {
  const { adapter } = setup(JSON.stringify(createEmptyDocument()))
  const service = createGymService(adapter)
  assert.deepEqual(await service.loadAppData(), createEmptyDocument())
  await assert.rejects(service.saveAppData({}), { code: 'invalid' })
  await service.resetLocalData()
  assert.equal((await service.loadAppData()).exercises.length, 9)
})

test('failed-load recovery remembers the reviewed raw value so reset cannot delete a newer document', async () => {
  const { storage, adapter } = setup('{broken')
  await assert.rejects(adapter.load(), { code: 'corrupt' })
  const newer = JSON.stringify(createEmptyDocument())
  storage.setItem(STORAGE_KEY, newer)
  await assert.rejects(adapter.reset(), { code: 'stale' })
  assert.equal(storage.getItem(STORAGE_KEY), newer)
})

test('raw export preserves exact bytes for corrupt or unsupported data without accepting a stale baseline', async () => {
  for (const raw of ['{broken\n', JSON.stringify({ schemaVersion: 99, secretFutureField: 'keep' })]) {
    const { storage, adapter } = setup(raw)
    await assert.rejects(adapter.load())
    assert.equal(await adapter.exportRaw(), raw)
    storage.setItem(STORAGE_KEY, 'other tab')
    assert.equal(await adapter.exportRaw(), 'other tab')
    assert.throws(adapter.assertCurrent, { code: 'stale' })
  }
})

test('recovery decoding tolerates isolated bad records but still rejects invalid envelopes and unknown versions', async () => {
  const { adapter } = setup(JSON.stringify({ ...createEmptyDocument(), exercises: [null] }))
  assert.deepEqual((await adapter.load({ allowInvalidRecords: true })).exercises, [null])
  for (const data of [null, {}, { ...createEmptyDocument(), routines: {} }, { ...createEmptyDocument(), schemaVersion: 99 }]) {
    const raw = JSON.stringify(data)
    const { adapter, storage } = setup(raw)
    await assert.rejects(adapter.load({ allowInvalidRecords: true }))
    assert.equal(storage.getItem(STORAGE_KEY), raw)
  }
})

test('storage subscriptions detect this app updates and clear events, ignore unrelated storage, and unsubscribe', async () => {
  const target = new EventTarget()
  const { storage } = setup(JSON.stringify(createEmptyDocument()))
  const otherStorage = memoryStorage()
  const adapter = createStorageAdapter({ getStorage: () => storage, eventTarget: target })
  const errors = []
  const unsubscribe = adapter.subscribe((error) => errors.push(error.code))
  const dispatch = (key, storageArea = storage) => {
    const event = new Event('storage')
    Object.assign(event, { key, storageArea })
    target.dispatchEvent(event)
  }
  await adapter.load()
  dispatch(STORAGE_KEY)
  storage.setItem(STORAGE_KEY, 'newer')
  dispatch('unrelated-key')
  dispatch(STORAGE_KEY, otherStorage)
  assert.deepEqual(errors, [])
  dispatch(STORAGE_KEY)
  dispatch(null)
  assert.deepEqual(errors, ['stale', 'stale'])
  unsubscribe()
  dispatch(STORAGE_KEY)
  assert.equal(errors.length, 2)
})

test('serialization must still produce a readable supported envelope before replacing saved data', async () => {
  const original = JSON.stringify(createEmptyDocument())
  const { storage, adapter } = setup(original)
  for (const toJSON of [() => undefined, () => null, () => ({ ...createEmptyDocument(), schemaVersion: 99 }), () => ({ ...createEmptyDocument(), exercises: [null] })]) {
    await assert.rejects(adapter.save({ ...createEmptyDocument(), toJSON }))
    assert.equal(storage.getItem(STORAGE_KEY), original)
  }
})
