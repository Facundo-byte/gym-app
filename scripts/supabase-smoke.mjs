import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { readCloudConfig } from '../src/services/supabaseClient.js'
import { createSupabaseAdapter } from '../src/services/supabaseAdapter.js'
import { createGymService } from '../src/services/gymService.js'
import { createStorageAdapter } from '../src/services/storage.js'
import { prepareGuestImport } from '../src/services/guestImport.js'
import { IMAGE_BUCKET } from '../src/services/cloudImages.js'
import { formatLocalDate } from '../src/domain/dates.js'
import { createStarterDocument } from '../src/services/starterExercises.js'

// This is an opt-in live integration check. It writes only to two unused test accounts.
// Sessions stay in memory; output never includes emails, passwords, or tokens.
const config = readCloudConfig(process.env)
const required = ['FORGE_SMOKE_EMAIL_A', 'FORGE_SMOKE_PASSWORD_A', 'FORGE_SMOKE_EMAIL_B', 'FORGE_SMOKE_PASSWORD_B']
if (!config.configured || required.some((key) => !process.env[key])) {
  process.stderr.write('Live smoke test requires public project configuration and two disposable test accounts. See docs/SUPABASE.md. No remote data was changed.\n')
  process.exit(1)
}
const clients = Array.from({ length: 3 }, () => createClient(config.url, config.key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}))
const [first, second, other] = clients
async function signIn(client, suffix) {
  const { data, error } = await client.auth.signInWithPassword({ email: process.env[`FORGE_SMOKE_EMAIL_${suffix}`], password: process.env[`FORGE_SMOKE_PASSWORD_${suffix}`] })
  assert.ok(!error && data.user, `Test account ${suffix} must exist, be confirmed, and accept its password.`)
  return data.user.id
}
async function row(client, owner) {
  const { data, error } = await client.from('forge_documents').select('*').eq('owner_id', owner).maybeSingle()
  assert.ok(!error, 'The migrated account table must be readable by its authenticated owner.')
  return data
}
function requireUnused(existing) {
  if (!existing) return
  const data = existing.document
  const starters = createStarterDocument(new Date().toISOString()).exercises
  assert.ok(!existing.guest_import_hash && data.routines?.length === 0 && data.workoutLogs?.length === 0
    && data.weeklySchedules?.every((week) => week.days.every((day) => day.occurrences.length === 0))
    && [0, starters.length].includes(data.exercises?.length)
    && data.exercises.every((item) => !item.image && starters.some((starter) => starter.id === item.id && starter.name === item.name && starter.muscle === item.muscle)),
  'Refusing to change an account with custom data. Use unused disposable test accounts.')
}
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6TjAAAAAASUVORK5CYII='
try {
  const ownerA = await signIn(first, 'A')
  const secondOwner = await signIn(second, 'A')
  const ownerB = await signIn(other, 'B')
  assert.equal(secondOwner, ownerA)
  assert.notEqual(ownerA, ownerB, 'Supply two different test accounts.')
  requireUnused(await row(first, ownerA))
  requireUnused(await row(other, ownerB))

  // Build a genuine guest document through the existing service, without browser storage.
  const values = new Map()
  const local = createStorageAdapter({ getStorage: () => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }), eventTarget: null })
  const now = new Date()
  const today = formatLocalDate(now)
  const weekday = now.getDay() || 7
  const options = { now: () => now.toISOString() }
  const guest = createGymService(local, options)
  await guest.loadAppData()
  const exerciseData = await guest.createExercise({ name: 'FORGE smoke image', muscle: 'Back', image: pixel })
  const exerciseId = exerciseData.exercises.at(-1).id
  const routineData = await guest.createRoutine({ name: 'FORGE smoke workout', weekdays: [weekday] })
  const routineId = routineData.routines.at(-1).id
  await guest.addAssignment(routineId, weekday, { exerciseId, sets: 2, reps: 10, targetWeight: 0 })
  await guest.completeWorkout(routineId, today)
  const proposal = await prepareGuestImport(local)
  const original = await local.exportRaw()
  const serviceA = createGymService(createSupabaseAdapter(first, ownerA), options)
  const serviceB = createGymService(createSupabaseAdapter(other, ownerB), options)
  const deviceTwo = createGymService(createSupabaseAdapter(second, ownerA), options)
  await serviceA.loadAppData()
  await serviceB.loadAppData()
  await assert.rejects(serviceA.importGuestData(proposal), { code: 'confirmation' })
  const imported = await serviceA.importGuestData(proposal, { confirmed: true })
  assert.deepEqual(await deviceTwo.loadAppData(), imported)
  assert.equal(await local.exportRaw(), original)
  const afterImport = await row(first, ownerA)
  assert.doesNotMatch(JSON.stringify(afterImport.document), /data:image/)
  await serviceA.importGuestData(proposal, { confirmed: true })
  assert.equal((await row(first, ownerA)).revision, afterImport.revision)
  assert.equal((await serviceA.loadAppData()).workoutLogs.length, 1)
  process.stdout.write('PASS: confirmed guest import, unique completion, private image and second-session refresh.\n')

  for (const [client, forbidden] of [[other, ownerA], [first, ownerB]]) {
    const read = await client.from('forge_documents').select('*').eq('owner_id', forbidden)
    assert.ok(!read.error && read.data.length === 0, 'The provider API must hide another owner\'s document.')
    // Use an unchanged scalar: an insecure policy cannot damage the fixture while being detected.
    const denied = await client.from('forge_documents').update({ revision: forbidden === ownerA ? afterImport.revision : (await row(other, ownerB)).revision }).eq('owner_id', forbidden).select()
    assert.ok(denied.error, 'Direct account updates must be denied by backend permissions.')
  }
  const path = afterImport.document.exercises.at(-1).image.path
  const stolen = await other.storage.from(IMAGE_BUCKET).download(path)
  assert.ok(stolen.error && !stolen.data, 'The provider must deny another account\'s private image.')
  const anon = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } })
  const anonymousRead = await anon.from('forge_documents').select('*')
  assert.ok(anonymousRead.error, 'Anonymous document reads must be denied.')
  const anonymousSave = await anon.rpc('forge_save_document', { p_document: afterImport.document, p_expected_revision: afterImport.revision })
  assert.ok(anonymousSave.error, 'Anonymous RPC saves must be denied.')
  process.stdout.write('PASS: live provider API denies cross-account reads/writes/images and anonymous access.\n')

  await deviceTwo.updateExercise(exerciseId, { name: 'FORGE smoke device two', muscle: 'Back', image: pixel })
  await assert.rejects(serviceA.updateExercise(exerciseId, { name: 'Stale draft', muscle: 'Back', image: pixel }), { code: 'stale' })
  const refreshed = await serviceA.loadAppData()
  assert.equal(refreshed.exercises.at(-1).name, 'FORGE smoke device two')
  assert.equal(refreshed.workoutLogs[0].snapshot.exercises[0].name, 'FORGE smoke image')
  assert.equal(refreshed.workoutLogs.length, 1)
  assert.equal((await serviceB.loadAppData()).routines.length, 0)
  process.stdout.write('PASS: remote revision conflict, refreshed edit, immutable history and account separation.\nLive smoke test passed. Disposable test plans/images remain in account A for manual review.\n')
} catch (error) {
  process.stderr.write(`Live smoke test failed: ${error instanceof assert.AssertionError ? error.message : error.code || 'provider request failed'}. Existing test data is retained for diagnosis.\n`)
  process.exitCode = 1
} finally {
  for (const client of clients) await client.auth.signOut({ scope: 'local' })
}
