import { createClient } from '@supabase/supabase-js'
import { createSessionStorage } from './storage.js'

export function readCloudConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL?.trim()
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url && !key) return { configured: false, error: null }
  try {
    const parsed = new URL(url)
    if (parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)
      || !(parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)))) throw new Error()
    let publicKey = key?.startsWith('sb_publishable_')
    if (!publicKey && key?.split('.').length === 3) {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      publicKey = JSON.parse(atob(payload)).role === 'anon'
    }
    if (!publicKey) throw new Error()
    return { configured: true, url: parsed.origin, key, error: null }
  } catch {
    return { configured: false, error: 'Account connection is unavailable because its configuration is incomplete or invalid. You can continue as a guest.' }
  }
}

export function createCloudRuntime(env = {}, factory = createClient) {
  const config = readCloudConfig(env)
  if (!config.configured) return { ...config, client: null }
  const client = factory(config.url, config.key, {
    auth: {
      flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true,
      storage: createSessionStorage(), storageKey: `forge:auth:${new URL(config.url).hostname}`,
    },
  })
  return { configured: true, error: null, client }
}

export const cloudRuntime = createCloudRuntime(import.meta.env ?? {})
