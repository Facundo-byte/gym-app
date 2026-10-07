import { createStorageAdapter, StorageError } from './storage.js'
import { inspectAppData, validateAppData } from './dataIntegrity.js'
import { sha256 } from './cloudImages.js'

export async function prepareGuestImport(adapter = createStorageAdapter()) {
  const data = await adapter.load({ allowInvalidRecords: true })
  const original = await adapter.exportRaw()
  if (original === null) throw new StorageError('missing', 'There is no saved guest data in this browser to import.')
  const inspected = inspectAppData(data)
  if (inspected.recovery) throw new StorageError('repair-required', 'Continue as a guest and review its data recovery before importing. The original has not been changed.')
  validateAppData(data)
  adapter.assertCurrent()
  return {
    document: structuredClone(data), hash: await sha256(JSON.stringify(data)),
    summary: { exercises: data.exercises.length, routines: data.routines.length, completions: data.workoutLogs.length },
    assertUnchanged: () => adapter.assertCurrent(),
  }
}
