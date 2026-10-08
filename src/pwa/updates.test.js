import test from 'node:test'
import assert from 'node:assert/strict'
import { startPwaUpdates } from './updates.js'

const tick = () => new Promise(resolve => setImmediate(resolve))
function fixture({ controlled = true, waiting = true, reject = false } = {}) {
  const worker = new EventTarget()
  worker.controller = controlled ? {} : null
  const registration = new EventTarget()
  registration.waiting = waiting ? { postMessage: message => messages.push(message) } : null
  registration.installing = new EventTarget()
  registration.update = async () => { checks++ }
  worker.register = async () => { if (reject) throw new Error('unavailable'); return registration }
  const target = new EventTarget()
  target.setInterval = () => 1
  target.clearInterval = () => { cleared++ }
  const document = new EventTarget()
  document.visibilityState = 'visible'
  const messages = []
  let reloads = 0
  let notices = 0
  let errors = 0
  let checks = 0
  let cleared = 0
  const controller = startPwaUpdates({ worker, target, document, online: () => true, reload: () => { reloads++ }, onAvailable: () => { notices++ }, onError: () => { errors++ } })
  return { controller, worker, registration, target, document, messages, counts: () => ({ reloads, notices, errors, checks, cleared }) }
}

test('first installation never asks to update or reloads the app', async () => {
  const app = fixture({ controlled: false })
  await tick()
  app.registration.waiting = null
  app.worker.controller = {}
  app.worker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.counts().notices, 0)
  assert.equal(app.counts().reloads, 0)
  app.controller.dispose()
})

test('a waiting update stays inactive until accepted and only then reloads once', async () => {
  const app = fixture()
  await tick()
  assert.equal(app.counts().notices, 1)
  assert.deepEqual(app.messages, [])
  assert.equal(app.counts().reloads, 0)
  assert.equal(app.controller.apply(), true)
  assert.deepEqual(app.messages, [{ type: 'SKIP_WAITING' }])
  assert.equal(app.counts().reloads, 0)
  app.registration.waiting = null
  app.worker.dispatchEvent(new Event('controllerchange'))
  app.worker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.counts().reloads, 1)
  app.controller.dispose()
})

test('another tab activating a worker cannot reload or discard this tab draft', async () => {
  const app = fixture({ waiting: false })
  await tick()
  app.worker.dispatchEvent(new Event('controllerchange'))
  assert.equal(app.counts().reloads, 0)
  app.registration.waiting = { postMessage: () => {} }
  app.registration.dispatchEvent(new Event('updatefound'))
  app.registration.installing.dispatchEvent(new Event('statechange'))
  assert.equal(app.counts().notices, 1)
  app.controller.dispose()
})

test('registration failure is reported without a reload and unavailable updates cannot apply', async () => {
  const app = fixture({ reject: true })
  await tick()
  assert.equal(app.counts().errors, 1)
  assert.equal(app.controller.apply(), false)
  assert.equal(app.counts().reloads, 0)
  app.controller.dispose()
})

test('disposing registration releases checks/listeners and ignores late results', async () => {
  const app = fixture()
  app.controller.dispose()
  await tick()
  app.worker.dispatchEvent(new Event('controllerchange'))
  app.target.dispatchEvent(new Event('focus'))
  app.document.dispatchEvent(new Event('visibilitychange'))
  assert.deepEqual(app.counts(), { reloads: 0, notices: 0, errors: 0, checks: 0, cleared: 1 })
  assert.equal(app.controller.apply(), false)
})
