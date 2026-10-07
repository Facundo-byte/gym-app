import test from 'node:test'
import assert from 'node:assert/strict'
import { createSupabaseAdapter } from './supabaseAdapter.js'
import { createGymService } from './gymService.js'
import { createEmptyDocument, createStorageAdapter, STORAGE_KEY } from './storage.js'
import { prepareGuestImport } from './guestImport.js'
import { workoutHistory } from './testHelpers/workoutHistory.js'

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const image = 'data:image/png;base64,AQID'
function fixture() {
  const state = { actor: owner, row: null, objects: new Map(), writes: [], failSave: false, failUpload: false }
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: state.actor } } } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: structuredClone(state.row), error: null }) }) }) }),
    rpc: async (name, args) => {
      state.writes.push(structuredClone(args))
      if (state.failSave) return { error: { message: 'failed' } }
      if (args.p_import_hash && state.row?.guest_import_hash === args.p_import_hash) return { data: [structuredClone(state.row)] }
      if ((state.row?.revision ?? 0) !== args.p_expected_revision) return { error: { message: 'FORGE_CONFLICT' } }
      state.row = { owner_id: owner, revision: (state.row?.revision ?? 0) + 1, document: structuredClone(args.p_document), guest_import_hash: args.p_import_hash ?? state.row?.guest_import_hash ?? null }
      return { data: [structuredClone(state.row)] }
    },
    storage: { from: () => ({
      upload: async (path, bytes, options) => {
        if (state.failUpload) return { error: { statusCode: '500' } }
        if (state.objects.has(path)) return { error: { statusCode: '409' } }
        state.objects.set(path, new Blob([bytes], { type: options.contentType }))
        return { error: null }
      },
      download: async (path) => ({ data: state.objects.get(path), error: state.objects.has(path) ? null : new Error('missing') }),
    }) },
  }
  return { state, client }
}

test('account adapter round-trips through the existing service while storing one private image reference without Base64', async () => {
  const { state, client } = fixture()
  const service = createGymService(createSupabaseAdapter(client, owner))
  await service.loadAppData()
  const data = await service.createExercise({ name: '  Cloud row  ', muscle: 'Back', image })
  assert.equal(data.exercises.at(-1).name, 'Cloud row')
  assert.equal(data.exercises.at(-1).image, image)
  assert.doesNotMatch(JSON.stringify(state.row.document), /data:image/)
  assert.match(state.row.document.exercises.at(-1).image.path, new RegExp(`^${owner}/[a-f0-9]{64}\\.png$`))
  assert.equal(state.objects.size, 1)
  assert.deepEqual(await createGymService(createSupabaseAdapter(client, owner)).loadAppData(), data)
  await service.updateExercise(data.exercises.at(-1).id, { name: 'Same image', muscle: 'Back', image })
  assert.equal(state.objects.size, 1)
})

test('failed image upload and failed remote save retain the last saved document and allow a safe retry', async () => {
  const { state, client } = fixture()
  const service = createGymService(createSupabaseAdapter(client, owner))
  await service.loadAppData()
  const original = structuredClone(state.row)
  state.failUpload = true
  await assert.rejects(service.createExercise({ name: 'Draft', muscle: 'Back', image }), { code: 'remote' })
  assert.deepEqual(state.row, original)
  state.failUpload = false; state.failSave = true
  await assert.rejects(service.createExercise({ name: 'Draft', muscle: 'Back', image }), { code: 'remote' })
  assert.deepEqual(state.row, original)
  assert.equal((await service.getExercises()).length, 9)
  state.failSave = false
  assert.equal((await service.createExercise({ name: 'Draft', muscle: 'Back', image })).exercises.length, 10)
})

test('async remote revision checks reject stale cached reads/no-op finishes and the RPC rejects a race after the check', async () => {
  const { state, client } = fixture()
  const adapter = createSupabaseAdapter(client, owner)
  const service = createGymService(adapter)
  await service.loadAppData()
  state.row.revision++
  await assert.rejects(service.getExercises(), { code: 'stale' })
  await assert.rejects(service.createExercise({ name: 'Stale', muscle: 'Back' }), { code: 'stale' })
  assert.equal(state.writes.length, 1)
  await service.loadAppData()
  const originalRpc = client.rpc
  client.rpc = async (...args) => { state.row.revision++; return originalRpc(...args) }
  await assert.rejects(service.createExercise({ name: 'Race', muscle: 'Back' }), { code: 'stale' })
  assert.equal(state.row.document.exercises.length, 9)
})

test('account identity changes and private image ownership/hash failures cannot publish another account document', async () => {
  const { state, client } = fixture()
  const adapter = createSupabaseAdapter(client, owner)
  await adapter.load({ createInitialDocument: createEmptyDocument })
  state.actor = 'other'
  await assert.rejects(adapter.save(createEmptyDocument()), { code: 'account-changed' })
  state.actor = owner
  state.row.document.exercises = [{ id: 'x', name: 'X', muscle: 'Back', image: { path: `other/${'a'.repeat(64)}.png` } }]
  await assert.rejects(adapter.load(), { code: 'invalid' })
  const invalidPath = `${owner}/${'a'.repeat(64)}.png`
  state.row.document.exercises[0].image.path = invalidPath
  state.objects.set(invalidPath, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }))
  await assert.rejects(adapter.load(), { code: 'invalid' })
  adapter.dispose()
  await assert.rejects(adapter.load(), { code: 'account-changed' })
})

test('guest import is reviewed, atomic, idempotent after a lost response, and keeps snapshots/IDs and the original local bytes', async () => {
  const original = JSON.stringify({ ...createEmptyDocument(), ...workoutHistory(), exercises: [{ id: 'local', name: 'Guest press', muscle: 'Chest', image }] })
  const values = new Map([[STORAGE_KEY, original]])
  const guestAdapter = createStorageAdapter({ getStorage: () => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }) })
  const proposal = await prepareGuestImport(guestAdapter)
  assert.deepEqual(proposal.summary, { exercises: 1, routines: 0, completions: 1 })
  const { state, client } = fixture()
  const service = createGymService(createSupabaseAdapter(client, owner))
  await service.loadAppData()
  await assert.rejects(service.importGuestData(proposal), { code: 'confirmation' })
  const imported = await service.importGuestData(proposal, { confirmed: true })
  assert.deepEqual(imported, proposal.document)
  const revision = state.row.revision
  await service.importGuestData(proposal, { confirmed: true })
  assert.equal(state.row.revision, revision)
  assert.equal(values.get(STORAGE_KEY), original)
  assert.deepEqual(imported.workoutLogs, JSON.parse(original).workoutLogs)
  values.set(STORAGE_KEY, JSON.stringify(createEmptyDocument()))
  await assert.rejects(service.importGuestData(proposal, { confirmed: true }), { code: 'stale' })
  assert.equal(state.row.revision, revision)
})

test('guest import refuses an unrepaired preview and never seeds absent guest data', async () => {
  let writes = 0
  let raw = null
  const adapter = createStorageAdapter({ getStorage: () => ({ getItem: () => raw, setItem: () => { writes++ } }) })
  await assert.rejects(prepareGuestImport(adapter), { code: 'missing' })
  assert.equal(writes, 0)
  raw = JSON.stringify({ ...createEmptyDocument(), exercises: [null] })
  await assert.rejects(prepareGuestImport(adapter), { code: 'repair-required' })
  assert.equal(writes, 0)
})
