import { createGymService } from './gymService.js'
import { createSupabaseAdapter } from './supabaseAdapter.js'

export function createAccountSession(client, { guest = () => createGymService(), account = (id) => createGymService(createSupabaseAdapter(client, id)) } = {}) {
  let current = null
  let generation = 0
  return {
    select(user) {
      const id = user?.id ?? null
      if (current && current.ownerId === id) return current
      current?.service.dispose()
      current = { ownerId: id, key: `${id ?? 'guest'}:${++generation}`, mode: id ? 'account' : 'guest', service: id ? account(id) : guest() }
      return current
    },
  }
}
