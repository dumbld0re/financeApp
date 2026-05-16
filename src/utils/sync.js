function authHeaders() {
  const secret = import.meta.env.VITE_SYNC_SECRET
  if (!secret) return null
  return { Authorization: `Bearer ${secret}` }
}

export function isSyncEnabled() {
  return Boolean(import.meta.env.VITE_SYNC_SECRET)
}

export function getSyncSetupHint() {
  if (!import.meta.env.VITE_SYNC_SECRET) {
    return 'Add VITE_SYNC_SECRET on Vercel, then redeploy'
  }
  return null
}

export function mergeData(local, remote) {
  if (!remote) return local
  if (!local) return remote
  const localTs = local.updatedAt || 0
  const remoteTs = remote.updatedAt || 0
  return remoteTs > localTs ? remote : local
}

function mapError(status, body) {
  if (status === 401) return 'Secret mismatch — SYNC_SECRET must match VITE_SYNC_SECRET'
  if (status === 503) {
    if (body?.detail) return body.detail
    return body?.error || 'Redis not connected — add Upstash on Vercel'
  }
  if (status === 404) return 'API not found — redeploy after vercel.json fix'
  return body?.detail || body?.error || `Sync failed (${status})`
}

export async function checkHealth() {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function pullData() {
  const headers = authHeaders()
  if (!headers) return { data: null, error: 'no_client_secret' }

  try {
    const res = await fetch('/api/data', { headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { data: null, error: mapError(res.status, body) }
    }
    return { data: body.data ?? null, error: null }
  } catch {
    return { data: null, error: 'Cannot reach /api — use Vercel URL, not local npm run dev' }
  }
}

export async function pushData(data) {
  const headers = authHeaders()
  if (!headers) return { ok: false, error: 'no_client_secret' }

  try {
    const res = await fetch('/api/data', {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: mapError(res.status, body) }
    }
    return { ok: true, error: null }
  } catch {
    return { ok: false, error: 'Cannot reach /api' }
  }
}
