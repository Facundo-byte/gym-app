import { test, expect, activate, createRoutine, addAssignment, uploadExerciseImage, expectNoOverflow, captureReview } from '../helpers.js'
import { accounts, installProvider } from '../auth/provider.js'

async function ready(page) {
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
}
async function cachedURLs(page) {
  return page.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(request => request.url)))).flat())
}
async function signIn(page, account) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill(account.email)
  await page.getByLabel('Password', { exact: true }).fill('password-123')
  await activate(page, page.getByRole('button', { name: 'Log in', exact: true }))
  await expect(page.getByRole('link', { name: 'Account data', exact: true })).toBeVisible()
}

test('real manifest/icons and worker allow cold offline guest navigation, assignments, images and refresh', async ({ page, context }, testInfo) => {
  await page.goto('/exercises')
  await ready(page)
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json())
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone', short_name: 'FORGE' })
  for (const icon of manifest.icons) {
    const size = await page.evaluate(src => new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(`${image.naturalWidth}x${image.naturalHeight}`)
      image.onerror = reject
      image.src = src
    }), icon.src)
    expect(size).toBe(icon.sizes)
  }
  expect(manifest.icons.some(icon => icon.purpose === 'maskable')).toBe(true)
  const protocol = await context.newCDPSession(page)
  const { installabilityErrors } = await protocol.send('Page.getInstallabilityErrors')
  expect(installabilityErrors).toEqual([])
  // Detach the diagnostic session before network emulation; extra CDP sessions
  // can reset navigator.onLine on a worker-served navigation in Chromium.
  await protocol.detach()
  await expect(page.getByRole('button', { name: 'Update FORGE', exact: true })).toHaveCount(0)
  const routinePath = await createRoutine(page, 'Offline guest plan', [1, 5])
  await page.goto('/exercises/new')
  await page.getByLabel('Exercise name', { exact: true }).fill('Offline uploaded row')
  await page.getByLabel('Target muscle', { exact: true }).selectOption('Back')
  await uploadExerciseImage(page)
  await activate(page, page.getByRole('button', { name: 'Create exercise', exact: true }))
  await expect(page.getByRole('link', { name: 'Edit Offline uploaded row', exact: true })).toBeVisible()
  await context.setOffline(true)
  await addAssignment(page, routinePath, 1, 'Offline uploaded row', { Sets: 3, Reps: 10, 'Target weight (kg)': 0 })
  await page.reload()
  await expect(page.locator('.assignment-row')).toContainText('Offline uploaded row')
  await expect(page.locator('.pwa-connection-notice')).toContainText('Guest plans are saved on this device')
  await expect.poll(() => page.locator('.assignment-row img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.goto('/exercises')
  await expect(page.locator('.exercise-card')).toHaveCount(10)
  await expect.poll(() => page.getByRole('link', { name: 'Edit Bench Press', exact: true }).locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  await expectNoOverflow(page)
  await captureReview(page, testInfo, 'offline-guest-library')
  await context.setOffline(false)
  await expect(page.locator('.pwa-connection-notice')).toHaveCount(0)
})

test('bilingual installation help, cancellation and installed state keep keyboard focus and drafts', async ({ page }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1' }))
  await page.goto('/exercises/new')
  await ready(page)
  await page.getByLabel('Exercise name', { exact: true }).fill('Keep this draft')
  await activate(page, page.getByRole('button', { name: 'Switch to Spanish', exact: true }))
  const install = page.getByRole('button', { name: 'Instalar FORGE', exact: true })
  await activate(page, install)
  const dialog = page.getByRole('dialog', { name: 'Instalar FORGE', exact: true })
  await expect(dialog).toContainText('Abrí esta página en Safari.')
  await expect(dialog).toContainText('Compartir')
  await expect(dialog).toContainText('Abrir como app web')
  await expect(dialog.getByRole('button', { name: 'Cerrar', exact: true })).toBeVisible()
  await expectNoOverflow(page)
  await captureReview(page, testInfo, 'spanish-install-help')
  await page.keyboard.press('Escape')
  await expect(install).toBeFocused()
  await expect(page.getByLabel('Nombre del ejercicio', { exact: true })).toHaveValue('Keep this draft')
  await activate(page, page.getByRole('button', { name: 'Cambiar a inglés', exact: true }))

  // The native OS dialog cannot be installed by a headless test. Only event wiring is simulated here.
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true })
    event.prompt = async () => { window.fixturePromptCalls = (window.fixturePromptCalls ?? 0) + 1 }
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(event)
  })
  await activate(page, page.getByRole('button', { name: 'Install FORGE', exact: true }))
  await activate(page, page.getByRole('button', { name: 'Install app', exact: true }))
  await expect(page.getByRole('status').filter({ hasText: 'Installation was canceled' })).toBeVisible()
  expect(await page.evaluate(() => window.fixturePromptCalls)).toBe(1)
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')))
  await expect(page.getByRole('button', { name: 'Install FORGE', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Keep this draft')
})

test('a real worker update waits for approval and another tab cannot reload an unsaved form', async ({ page, context, request }, testInfo) => {
  await page.goto('/exercises/new')
  await ready(page)
  await page.getByLabel('Exercise name', { exact: true }).fill('Draft before update')
  await request.post('/__pwa_fixture/revision')
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
  await expect(page.getByRole('button', { name: 'Update FORGE', exact: true })).toBeVisible()
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Draft before update')
  await activate(page, page.getByRole('button', { name: 'Update FORGE', exact: true }))
  await captureReview(page, testInfo, 'update-confirmation')
  await activate(page, page.getByRole('button', { name: 'Later', exact: true }))
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Draft before update')
  const other = await context.newPage()
  try {
    await other.goto('/')
    await activate(other, other.getByRole('button', { name: 'Update FORGE', exact: true }))
    await activate(other, other.getByRole('button', { name: 'Update now', exact: true }))
    await expect(other.getByRole('button', { name: 'Update FORGE', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Draft before update')
  } finally { await other.close() }
  await activate(page, page.getByRole('button', { name: 'Update FORGE', exact: true }))
  await activate(page, page.getByRole('button', { name: 'Update now', exact: true }))
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Update FORGE', exact: true })).toHaveCount(0)
  await expectNoOverflow(page)
})

test('installed account images stay out of the cache, pending writes block updates and email recovery uses the browser', async ({ page, context, request }, testInfo) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { get: () => true }))
  const backend = await installProvider(context)
  await signIn(page, accounts.a)
  await ready(page)
  await page.goto('/exercises/new')
  await page.getByLabel('Exercise name', { exact: true }).fill('Private PWA row')
  await page.getByLabel('Target muscle', { exact: true }).selectOption('Back')
  await uploadExerciseImage(page)
  await request.post('/__pwa_fixture/revision')
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
  await expect(page.getByRole('button', { name: 'Update FORGE', exact: true })).toBeVisible()
  let releaseSave
  let markStarted
  const gate = new Promise(resolve => { releaseSave = resolve })
  const started = new Promise(resolve => { markStarted = resolve })
  const saveURL = 'https://account-fixture.supabase.co/rest/v1/rpc/forge_save_document'
  const holdSave = async route => { markStarted(); await gate; await route.fallback() }
  await context.route(saveURL, holdSave)
  try {
    await activate(page, page.getByRole('button', { name: 'Create exercise', exact: true }))
    await started
    await activate(page, page.getByRole('button', { name: 'Update FORGE', exact: true }))
    await expect(page.getByRole('button', { name: 'Update now', exact: true })).toBeDisabled()
    await expect(page.getByRole('status').filter({ hasText: 'Wait for the current save' })).toBeVisible()
    await activate(page, page.getByRole('button', { name: 'Later', exact: true }))
    releaseSave()
    await expect(page.getByRole('link', { name: 'Edit Private PWA row', exact: true })).toBeVisible()
  } finally { releaseSave(); await context.unroute(saveURL, holdSave) }
  const card = page.getByRole('link', { name: 'Edit Private PWA row', exact: true })
  await expect.poll(() => card.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true)
  const urls = await cachedURLs(page)
  expect(urls.length).toBeGreaterThan(10)
  expect(urls.every(url => new URL(url).origin === 'http://127.0.0.1:4177')).toBe(true)
  expect(urls.some(url => /forge_documents|forge-exercise-images|auth\/v1|Private PWA row/.test(url))).toBe(false)
  await activate(page, card)
  // The synthetic provider fulfills routes even when browser networking is off.
  // Abort its requests as a disconnected real Supabase endpoint would behave.
  const disconnectedProvider = route => route.abort('internetdisconnected')
  await context.route('https://account-fixture.supabase.co/**', disconnectedProvider)
  await context.setOffline(true)
  await page.getByLabel('Exercise name', { exact: true }).fill('Offline account draft')
  await activate(page, page.getByRole('button', { name: 'Save changes', exact: true }))
  // The SDK retries transient network failures before returning the save error.
  await expect(page.locator('.exercise-form [role=alert]')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Offline account draft')
  expect(backend.rows.get(accounts.a.id).document.exercises.at(-1).name).toBe('Private PWA row')
  await expect(page.locator('.pwa-connection-notice')).toContainText('Reconnect to load or save account plans')
  await context.setOffline(false)
  await context.unroute('https://account-fixture.supabase.co/**', disconnectedProvider)
  await page.goto('/login')
  await activate(page, page.locator('.account-panel').getByRole('button', { name: 'Log out', exact: true }))
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await page.goto('/signup')
  await expect(page.getByRole('link', { name: 'Open browser to create account', exact: true })).toHaveAttribute('href', '/signup')
  await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0)
  await page.goto('/forgot-password')
  await expect(page.getByRole('link', { name: 'Open browser to recover account', exact: true })).toHaveAttribute('target', '_blank')
  await expect(page.getByLabel('Email', { exact: true })).toHaveCount(0)
  await captureReview(page, testInfo, 'installed-recovery-help')
  const popup = page.waitForEvent('popup')
  await activate(page, page.getByRole('link', { name: 'Open browser to recover account', exact: true }))
  const browserPage = await popup
  await browserPage.getByLabel('Email', { exact: true }).fill(accounts.a.email)
  await activate(browserPage, browserPage.getByRole('button', { name: 'Send recovery email', exact: true }))
  await expect.poll(() => backend.calls.find(call => call.path === '/auth/v1/recover')?.redirect).toBe('http://127.0.0.1:4177/account/password')
  await expect(browserPage.getByRole('button', { name: 'Send recovery email', exact: true })).toBeEnabled()
  await browserPage.goto('/account/password?code=recovery-code')
  await browserPage.getByLabel('New password', { exact: true }).fill('password-new-123')
  await browserPage.getByLabel('Confirm password', { exact: true }).fill('password-new-123')
  await activate(browserPage, browserPage.getByRole('button', { name: 'Save new password', exact: true }))
  await expect(browserPage.getByRole('status').filter({ hasText: 'Your password has been updated' })).toBeVisible()
  expect((await cachedURLs(browserPage)).some(url => new URL(url).searchParams.has('code'))).toBe(false)
  await activate(browserPage, browserPage.getByRole('button', { name: 'Continue as guest', exact: true }))
  await expect(browserPage.getByRole('link', { name: 'Account data', exact: true })).toHaveCount(0)
  await expect(browserPage.getByRole('heading', { name: 'Rest day', exact: true })).toBeVisible()
  await browserPage.close()
  await signIn(page, accounts.b)
  await page.goto('/exercises')
  await expect(page.getByRole('link', { name: 'Edit Private PWA row', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Install FORGE', exact: true })).toHaveCount(0)
  await expectNoOverflow(page)
})
