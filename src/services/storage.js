export const STORAGE_KEY = 'forge:gym-routine-manager'
export const SCHEMA_VERSION = 1
const MAX_DOCUMENT_BYTES = 3 * 1024 * 1024
const collections = ['exercises', 'routines', 'weeklySchedules', 'workoutLogs']

export const LANGUAGE_KEY = 'forge:language'

// A device preference stays separate from guest plans and account documents.
export function createLanguagePreference({ getStorage = () => window.localStorage } = {}) {
  return {
    load() {
      try { return getStorage().getItem(LANGUAGE_KEY) === 'es' ? 'es' : 'en' }
      catch { return 'en' }
    },
    save(language) {
      if (!['en', 'es'].includes(language)) return false
      try { getStorage().setItem(LANGUAGE_KEY, language); return true }
      catch { return false }
    },
  }
}

export class StorageError extends Error {
  constructor(code, message, cause) {
    super(message, { cause })
    this.name = 'StorageError'
    this.code = code
  }
}

export function createEmptyDocument() {
  return { schemaVersion: SCHEMA_VERSION, trackingStartedOn: null, exercises: [], routines: [], weeklySchedules: [], workoutLogs: [] }
}

// Supabase owns session serialization; browser access stays at this boundary.
export function createSessionStorage(getStorage = () => window.localStorage) {
  function access(operation) {
    try { return operation(getStorage()) } catch (cause) {
      throw new StorageError('unavailable', 'Account session storage is unavailable. Allow browser storage and try again.', cause)
    }
  }
  return {
    getItem: (key) => access((storage) => storage.getItem(key)),
    setItem: (key, value) => access((storage) => storage.setItem(key, value)),
    removeItem: (key) => access((storage) => storage.removeItem(key)),
  }
}

function validateDocument(data, allowInvalidRecords = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new StorageError('invalid', 'The saved data is not a readable FORGE document.')
  }
  if (!Number.isInteger(data.schemaVersion)) {
    throw new StorageError('invalid', 'The saved data is missing a valid format version.')
  }
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new StorageError('unsupported', 'This data uses a different FORGE format. It has been preserved without changes.')
  }
  const validCollections = collections.every((key) => Array.isArray(data[key]) && (allowInvalidRecords || data[key].every((item) => item && typeof item === 'object' && !Array.isArray(item))))
  const validTracking = data.trackingStartedOn === null || (typeof data.trackingStartedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.trackingStartedOn))
  if (!validCollections || !validTracking) {
    throw new StorageError('invalid', 'The saved data has an unexpected structure. It has been preserved without changes.')
  }
  return data
}

export function createStorageAdapter({ getStorage = () => window.localStorage, eventTarget = globalThis.window } = {}) {
  let hasLoaded = false
  let hasRead = false
  let lastRead = null

  function accessStorage() {
    try { return getStorage() } catch (cause) {
      throw new StorageError('unavailable', 'Browser storage is unavailable. FORGE cannot save on this device right now.', cause)
    }
  }

  function readRaw(storage) {
    try { return storage.getItem(STORAGE_KEY) } catch (cause) {
      throw new StorageError('unavailable', 'Browser storage could not be read. Your saved data has not been changed.', cause)
    }
  }

  async function load({ createInitialDocument, allowInvalidRecords = false } = {}) {
    hasLoaded = false
    const raw = readRaw(accessStorage())
    // Remember even unreadable data, so reset cannot delete a newer tab's repair.
    lastRead = raw
    hasRead = true
    let data = createEmptyDocument()
    if (raw !== null) {
      try { data = JSON.parse(raw) } catch (cause) {
        throw new StorageError('corrupt', 'Your saved data could not be read. The original data has been kept intact.', cause)
      }
      validateDocument(data, allowInvalidRecords)
    }
    lastRead = raw
    hasLoaded = true
    if (raw === null && createInitialDocument) return save(createInitialDocument())
    return data
  }

  function assertCurrent() {
    if (hasRead && readRaw(accessStorage()) !== lastRead) {
      throw new StorageError('stale', 'Your saved data changed in another tab. Reload before saving more changes.')
    }
  }

  function subscribe(onError) {
    if (!eventTarget) return () => {}
    const onStorage = (event) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return
      try {
        if (event.storageArea && event.storageArea !== accessStorage()) return
        assertCurrent()
      } catch (error) { onError(error) }
    }
    eventTarget.addEventListener('storage', onStorage)
    return () => eventTarget.removeEventListener('storage', onStorage)
  }

  async function save(data) {
    if (!hasLoaded) await load()
    validateDocument(data)
    let raw
    let saved
    try {
      raw = JSON.stringify(data)
      saved = JSON.parse(raw)
    } catch (cause) {
      throw new StorageError('invalid', 'The data could not be saved in a readable format.', cause)
    }
    validateDocument(saved)
    if (new TextEncoder().encode(raw).length > MAX_DOCUMENT_BYTES) {
      throw new StorageError('quota', 'This change exceeds the local data limit. Your previous data is still safe.')
    }
    const storage = accessStorage()
    if (readRaw(storage) !== lastRead) {
      throw new StorageError('stale', 'Your saved data changed in another tab. Reload before saving more changes.')
    }
    try { storage.setItem(STORAGE_KEY, raw) } catch (cause) {
      const quota = cause?.name === 'QuotaExceededError'
      throw new StorageError(quota ? 'quota' : 'unavailable', quota ? 'Browser storage is full. Your previous data is still safe.' : 'The change could not be saved. Your previous data is still safe.', cause)
    }
    lastRead = raw
    return saved
  }

  async function reset() {
    assertCurrent()
    try { accessStorage().removeItem(STORAGE_KEY) } catch (cause) {
      if (cause instanceof StorageError) throw cause
      throw new StorageError('unavailable', 'Local data could not be reset. Nothing has been changed.', cause)
    }
    hasLoaded = false
    hasRead = false
    lastRead = null
  }

  // Export exactly the stored bytes without advancing the optimistic-write baseline.
  return { load, save, reset, assertCurrent, subscribe, exportRaw: async () => readRaw(accessStorage()) }
}
