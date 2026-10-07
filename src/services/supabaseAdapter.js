import { SCHEMA_VERSION, StorageError } from './storage.js'
import { validateAppData } from './dataIntegrity.js'
import { createCloudImages } from './cloudImages.js'

export function createSupabaseAdapter(client, ownerId) {
  let revision = null
  let disposed = false
  const images = createCloudImages(client, ownerId, assertActor)
  function active() {
    if (disposed) throw new StorageError('account-changed', 'The account changed. This operation was stopped; no data was saved to another account.')
  }
  async function assertActor() {
    active()
    const { data, error } = await client.auth.getSession()
    active()
    if (error || data.session?.user.id !== ownerId) throw new StorageError('account-changed', 'Your account session changed. Sign in again before saving.')
  }
  function remoteError(error) {
    if (error?.message?.includes('FORGE_CONFLICT')) return new StorageError('stale', 'Your account data changed on another device. Copy any unsaved input, then reload before saving.', error)
    if (error?.message?.includes('FORGE_IMPORT_NOT_EMPTY')) return new StorageError('import-not-empty', 'This account already has its own data or a different guest import. The local copy is safe; importing cannot replace this account.', error)
    return new StorageError('remote', 'The account change could not be confirmed. Your draft is still here. Check your connection; reload to check the saved version before retrying.', error)
  }
  function validateEnvelope(data) {
    if (data?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(data.weeklySchedules) || !Array.isArray(data.workoutLogs)) throw new StorageError('invalid', 'This account document has an unsupported or invalid format. No data has been changed.')
    return data
  }
  async function hydrate(row) {
    if (row.owner_id !== ownerId || !Number.isSafeInteger(row.revision) || row.revision < 1) throw new StorageError('invalid', 'The account response has an invalid owner or revision.')
    const data = structuredClone(validateEnvelope(row.document))
    if (!Array.isArray(data.exercises)) throw new StorageError('invalid', 'The account exercise library is not readable.')
    for (const exercise of data.exercises) exercise.image = await images.download(exercise.image)
    await assertActor()
    validateAppData(data)
    revision = row.revision
    return data
  }
  async function read(columns) {
    await assertActor()
    const { data, error } = await client.from('forge_documents').select(columns).eq('owner_id', ownerId).maybeSingle()
    active()
    if (error) throw new StorageError('remote', 'Account data could not be loaded. Check your connection and try again.', error)
    return data
  }
  async function write(data, importHash = null) {
    await assertActor()
    validateAppData(validateEnvelope(data))
    if (revision === null) throw new StorageError('remote', 'Load the account before saving changes.')
    const wire = structuredClone(data)
    for (const exercise of wire.exercises) exercise.image = await images.upload(exercise.image)
    await assertActor()
    const { data: rows, error } = await client.rpc('forge_save_document', { p_document: wire, p_expected_revision: revision, p_import_hash: importHash })
    active()
    if (error) throw remoteError(error)
    if (!Array.isArray(rows) || rows.length !== 1) throw new StorageError('remote', 'The account save could not be confirmed. Reload to check the saved version.')
    return hydrate(rows[0])
  }
  return {
    async load({ createInitialDocument } = {}) {
      const row = await read('owner_id,revision,document,guest_import_hash')
      if (row) return hydrate(row)
      revision = 0
      if (!createInitialDocument) throw new StorageError('missing', 'This account has no saved document yet.')
      return write(createInitialDocument())
    },
    save: (data) => write(data),
    importDocument: (data, hash) => write(data, hash),
    async assertCurrent() {
      if (revision === null) return assertActor()
      const row = await read('revision')
      if ((row?.revision ?? 0) !== revision) throw remoteError({ message: 'FORGE_CONFLICT' })
    },
    async exportRaw() {
      const row = await read('document')
      return row ? JSON.stringify(row.document) : null
    },
    async reset() { throw new StorageError('remote', 'Account data cannot be reset through the local reset action.') },
    dispose() { disposed = true; images.clear(); revision = null },
  }
}
