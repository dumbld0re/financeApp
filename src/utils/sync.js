function authHeaders() {
  const secret = import.meta.env.VITE_SYNC_SECRET
  if (!secret) return null
  return { Authorization: `Bearer ${secret}` }
}

export function isSyncEnabled() {
  return Boolean(import.meta.env.VITE_SYNC_SECRET)
}

export function mergeData(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const localTs = local.updatedAt || 0
  const remoteTs = remote.updatedAt || 0
  return remoteTs > localTs ? remote : local
}

export async function pullData() {
  const headers = authHeaders()
  if (!headers) return null

  try {
    const res = await fetch('/api/data', { headers })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export async function pushData(data) {
  const headers = authHeaders()
  if (!headers) return false

  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}
