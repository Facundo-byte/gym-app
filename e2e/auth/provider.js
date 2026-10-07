const host = 'https://account-fixture.supabase.co'
export const accounts = {
  a: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'a@forge.test' },
  b: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', email: 'b@forge.test' },
}
function user(account) { return { ...account, aud: 'authenticated', role: 'authenticated', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {} } }
function token(account) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: account.id, aud: 'authenticated', role: 'authenticated', exp: 4102444800 })}.fixture-signature`
}

// The real SDK talks to intercepted HTTP responses only. No fake mode exists in production code.
export async function installProvider(context, backend = { rows: new Map(), objects: new Map(), calls: [], failSave: false, failLogout: false }) {
  await context.route(`${host}/**`, async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
    const reply = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) })
    if (method === 'OPTIONS') return reply({})
    const authToken = request.headers().authorization?.split(' ')[1]
    const account = Object.values(accounts).find((account) => token(account) === authToken)
    const body = request.postData() && !url.pathname.startsWith('/storage/') ? request.postDataJSON() : null
    // Record operation names/identities without retaining even synthetic passwords.
    backend.calls.push({ path: url.pathname, method, owner: account?.id, email: body?.email, redirect: url.searchParams.get('redirect_to') })
    if (url.pathname === '/auth/v1/token') {
      const recovery = url.searchParams.get('grant_type') === 'pkce' && body.auth_code === 'recovery-code' && body.code_verifier
      const candidate = recovery ? accounts.a : Object.values(accounts).find((account) => account.email === body.email)
      if (!candidate || (!recovery && body.password !== 'password-123')) return reply({ msg: 'Invalid login credentials', error_code: 'invalid_credentials' }, 400)
      return reply({ access_token: token(candidate), refresh_token: `refresh-${candidate.id}`, token_type: 'bearer', expires_in: 3600, user: user(candidate) })
    }
    if (url.pathname === '/auth/v1/signup') return reply({ user: user(accounts.b), session: null })
    if (url.pathname === '/auth/v1/recover') return reply({})
    if (url.pathname === '/auth/v1/logout') return backend.failLogout ? reply({ msg: 'Logout temporarily unavailable' }, 500) : reply({})
    if (url.pathname === '/auth/v1/user') return account ? reply(user(account)) : reply({ msg: 'Unauthenticated' }, 401)
    if (!account) return reply({ message: 'Unauthenticated' }, 401)
    if (url.pathname === '/rest/v1/forge_documents') {
      const row = backend.rows.get(account.id)
      return reply(row && url.searchParams.get('owner_id') === `eq.${account.id}` ? [row] : [])
    }
    if (url.pathname === '/rest/v1/rpc/forge_save_document') {
      if (backend.failSave) return reply({ message: 'Temporary failure' }, 503)
      const previous = backend.rows.get(account.id)
      if (body.p_import_hash && previous?.guest_import_hash === body.p_import_hash) return reply([previous])
      if (body.p_import_hash && previous && (previous.guest_import_hash || previous.document.routines.length || previous.document.workoutLogs.length)) return reply({ message: 'FORGE_IMPORT_NOT_EMPTY' }, 400)
      if ((previous?.revision ?? 0) !== body.p_expected_revision) return reply({ message: 'FORGE_CONFLICT' }, 400)
      const row = { owner_id: account.id, revision: (previous?.revision ?? 0) + 1, document: body.p_document, guest_import_hash: body.p_import_hash ?? previous?.guest_import_hash ?? null }
      backend.rows.set(account.id, row)
      return reply([row])
    }
    const image = url.pathname.match(/^\/storage\/v1\/object\/(?:authenticated\/)?forge-exercise-images\/(.*)$/)
    if (image) {
      const path = decodeURIComponent(image[1])
      if (!path.startsWith(`${account.id}/`)) return reply({ message: 'Forbidden' }, 403)
      if (method === 'POST') {
        if (backend.objects.has(path)) return reply({ statusCode: '409', error: 'Duplicate', message: 'Already exists' }, 409)
        backend.objects.set(path, request.postDataBuffer())
        return reply({ Key: path })
      }
      const data = backend.objects.get(path)
      return data ? route.fulfill({ status: 200, headers, body: data, contentType: path.endsWith('.png') ? 'image/png' : 'image/jpeg' }) : reply({ message: 'Not found' }, 404)
    }
    throw new Error(`Unexpected fixture request: ${method} ${url.pathname}`)
  })
  return backend
}
