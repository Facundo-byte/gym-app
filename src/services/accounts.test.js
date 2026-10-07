import test from 'node:test'
import assert from 'node:assert/strict'
import { readCloudConfig, createCloudRuntime } from './supabaseClient.js'
import { createAuthService } from './authService.js'
import { createAccountSession } from './accountSession.js'
import { createGymService } from './gymService.js'
import { createEmptyDocument, createSessionStorage } from './storage.js'
import { validateCredentials } from '../domain/accounts.js'

test('cloud configuration is optional, accepts public keys and rejects secrets/invalid origins without disclosing them', () => {
  assert.deepEqual(readCloudConfig(), { configured: false, error: null })
  const valid = { VITE_SUPABASE_URL: 'https://fixture.supabase.co/', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }
  assert.equal(readCloudConfig(valid).configured, true)
  const jwt = (role) => `header.${btoa(JSON.stringify({ role }))}.signature`
  assert.equal(readCloudConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') }).configured, true)
  for (const env of [ { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_private' }, { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') }, { ...valid, VITE_SUPABASE_URL: 'http://remote.example' }, { ...valid, VITE_SUPABASE_URL: 'https://name:password@fixture.supabase.co' }, { ...valid, VITE_SUPABASE_URL: 'https://fixture.supabase.co/path' }, { ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: '' } ]) {
    const config = readCloudConfig(env)
    assert.equal(config.configured, false)
    assert.equal('key' in config, false)
    assert.doesNotMatch(config.error, /private|service_role|password@/)
  }
  let options
  const runtime = createCloudRuntime(valid, (url, key, settings) => { options = settings; return { url, key } })
  assert.equal(runtime.configured, true)
  assert.equal(options.auth.flowType, 'pkce')
  assert.equal(options.auth.storageKey, 'forge:auth:fixture.supabase.co')
  assert.equal(typeof options.auth.storage.getItem, 'function')
})

test('account forms trim email, allow existing short login passwords, and validate new password confirmation', () => {
  assert.deepEqual(validateCredentials({ email: ' user@example.test ', password: 'x' }, 'login'), {})
  assert.equal(validateCredentials({ email: 'invalid', password: 'x' }, 'login').email, 'Enter a valid email address.')
  assert.ok(validateCredentials({ email: 'u@example.test', password: 'short', confirmation: 'other' }, 'signup').password)
  assert.ok(validateCredentials({ password: 'eight-or-more', confirmation: '' }, 'password').confirmation)
  assert.deepEqual(validateCredentials({ email: 'u@example.test' }, 'reset'), {})
})

test('auth delegates passwords and sessions to the provider, uses allowed callback paths, and preserves provider failures', async () => {
  const calls = []
  const auth = Object.fromEntries(['getSession', 'signInWithPassword', 'signUp', 'resetPasswordForEmail', 'updateUser', 'signOut'].map((method) => [method, async (...args) => { calls.push([method, ...args]); return { data: method === 'getSession' ? { session: null } : {}, error: null } }]))
  let removed = false
  auth.onAuthStateChange = (listener) => { listener('INITIAL_SESSION', null); return { data: { subscription: { unsubscribe: () => { removed = true } } } } }
  const service = createAuthService({ auth }, { origin: () => 'https://forge.example' })
  const credentials = { email: ' user@example.test ', password: 'password-123', confirmation: 'password-123' }
  assert.equal(await service.getSession(), null)
  await service.signIn(credentials); await service.signUp(credentials); await service.requestPasswordReset(credentials); await service.updatePassword(credentials); await service.signOut()
  assert.deepEqual(calls[1][1], { email: 'user@example.test', password: 'password-123' })
  assert.equal(calls[2][1].options.emailRedirectTo, 'https://forge.example/login')
  assert.equal(calls[3][2].redirectTo, 'https://forge.example/account/password')
  assert.deepEqual(calls[4][1], { password: 'password-123' })
  assert.deepEqual(calls[5][1], { scope: 'local' })
  service.subscribe(() => {})(); assert.equal(removed, true)
  auth.signInWithPassword = async () => ({ error: { message: 'Invalid login credentials' } })
  await assert.rejects(service.signIn(credentials), /Invalid login credentials/)
  await assert.rejects(createAuthService(null).signIn(credentials), { code: 'configuration' })
})

test('logout reports local removal after failed remote revocation, but preserves failures when a session remains', async () => {
  const error = { message: 'Remote logout unavailable' }
  let session = null
  const service = createAuthService({ auth: {
    signOut: async () => ({ error }),
    getSession: async () => ({ data: { session }, error: null }),
  } })
  assert.match((await service.signOut()).notice, /signed out on this browser/)
  session = { user: { id: 'A' } }
  await assert.rejects(service.signOut(), /Remote logout unavailable/)
})

test('account changes immediately discard old services; token refresh retains the same scope and guest gets a fresh cache', () => {
  const disposed = []
  const scopes = createAccountSession(null, { guest: () => ({ dispose: () => disposed.push('guest') }), account: (id) => ({ dispose: () => disposed.push(id) }) })
  const guest = scopes.select(null)
  const a = scopes.select({ id: 'A' })
  assert.equal(scopes.select({ id: 'A', email: 'updated' }), a)
  const b = scopes.select({ id: 'B' })
  assert.notEqual(b.key, a.key)
  assert.notEqual(scopes.select(null).key, guest.key)
  assert.deepEqual(disposed, ['guest', 'A', 'B'])
})

test('a disposed service cannot publish an in-flight load or accept queued edits for a previous account', async () => {
  let finish
  const service = createGymService({ load: () => new Promise((resolve) => { finish = resolve }) })
  const pending = service.loadAppData()
  await Promise.resolve()
  service.dispose()
  finish(createEmptyDocument())
  await assert.rejects(pending, { code: 'account-changed' })
  await assert.rejects(service.createExercise({ name: 'Blocked', muscle: 'Back' }), { code: 'account-changed' })
})

test('provider session storage stays separate from guest data and reports denied browser storage', () => {
  const values = new Map([['forge:gym-routine-manager', 'guest']])
  const adapter = createSessionStorage(() => ({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }))
  adapter.setItem('forge:auth:fixture', 'session')
  assert.equal(adapter.getItem('forge:auth:fixture'), 'session')
  adapter.removeItem('forge:auth:fixture')
  assert.equal(values.get('forge:gym-routine-manager'), 'guest')
  assert.throws(() => createSessionStorage(() => { throw new Error('denied') }).getItem('session'), { code: 'unavailable' })
})
