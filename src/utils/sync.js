const SECRET_STORAGE_KEY = 'finance_sync_secret'

export function getClientSecret() {
  try {
    return localStorage.getItem(SECRET_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function setClientSecret(secret) {
  try {
    if (secret) {
      localStorage.setItem(SECRET_STORAGE_KEY, secret)
    } else {
      localStorage.removeItem(SECRET_STORAGE_KEY)
    }
  } catch {
    // ignore quota / private mode errors
  }
}

function authHeaders() {
  const secret = getClientSecret()
  if (!secret) return null
  return { Authorization: `Bearer ${secret}` }
}

function goalsEqual(a, b) {
  return (
    a.name === b.name &&
    a.kind === b.kind &&
    a.targetAmount === b.targetAmount &&
    a.currentAmount === b.currentAmount &&
    a.createdAt === b.createdAt &&
    (a.completedAt || 0) === (b.completedAt || 0)
  )
}

function unionCategories(remoteList, localList) {
  const merged = [...remoteList]
  for (const c of localList) {
    if (!merged.includes(c)) merged.push(c)
  }
  return merged
}

// True additive merge. Returns the `remote` object (same reference) when local
// contributes nothing beyond it, so callers can detect "already in sync" by
// reference; otherwise returns a fresh merged object that needs pushing.
export function mergeData(local, remote) {
  if (!remote) return local
  if (!local) return remote

  let changed = false

  const txById = new Map(remote.transactions.map((t) => [t.id, t]))
  for (const t of local.transactions) {
    if (!txById.has(t.id)) {
      txById.set(t.id, t)
      changed = true
    }
  }
  const transactions = [...txById.values()].sort((a, b) => (b.date || 0) - (a.date || 0))

  // A savings_release transaction is only ever created when a goal is deleted,
  // so its presence means that goal was removed on some device.
  const releasedGoalIds = new Set(
    transactions.filter((t) => t.type === 'savings_release' && t.goalId).map((t) => t.goalId)
  )

  const localNewer = (local.updatedAt || 0) > (remote.updatedAt || 0)
  const localGoalById = new Map(local.savingsGoals.map((g) => [g.id, g]))
  const remoteGoalIds = new Set(remote.savingsGoals.map((g) => g.id))
  const savingsGoals = []

  for (const rg of remote.savingsGoals) {
    if (releasedGoalIds.has(rg.id)) {
      changed = true
      continue
    }
    const lg = localGoalById.get(rg.id)
    if (lg && localNewer && !goalsEqual(lg, rg)) {
      savingsGoals.push(lg)
      changed = true
    } else {
      savingsGoals.push(rg)
    }
  }
  for (const lg of local.savingsGoals) {
    if (remoteGoalIds.has(lg.id) || releasedGoalIds.has(lg.id)) continue
    savingsGoals.push(lg)
    changed = true
  }

  const income = unionCategories(remote.categories?.income ?? [], local.categories?.income ?? [])
  const expense = unionCategories(remote.categories?.expense ?? [], local.categories?.expense ?? [])
  if (
    income.length !== (remote.categories?.income?.length ?? 0) ||
    expense.length !== (remote.categories?.expense?.length ?? 0)
  ) {
    changed = true
  }

  // recurring rules: union by id; on conflict keep the most-advanced nextDue
  // so an occurrence already posted on one device isn't re-posted on the other
  const recurringById = new Map((remote.recurring || []).map((r) => [r.id, r]))
  for (const lr of local.recurring || []) {
    const rr = recurringById.get(lr.id)
    if (!rr) {
      recurringById.set(lr.id, lr)
      changed = true
    } else if ((lr.nextDue || 0) > (rr.nextDue || 0)) {
      recurringById.set(lr.id, lr)
      changed = true
    }
  }
  const recurring = [...recurringById.values()]
  if (recurring.length !== (remote.recurring?.length ?? 0)) changed = true

  if (!changed) return remote

  return {
    transactions,
    savingsGoals,
    recurring,
    categories: { income, expense },
    updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0),
  }
}

function mapError(status, body) {
  if (status === 401) return 'Sync key rejected — it must match SYNC_SECRET on Vercel'
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
