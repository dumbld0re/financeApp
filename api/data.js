import {
  getRedis,
  loadFinanceData,
  saveFinanceData,
  formatRedisError,
} from '../lib/redis.js'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isAuthorized(request) {
  const secret = process.env.SYNC_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

function isValidData(data) {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.transactions) &&
    Array.isArray(data.savingsGoals)
  )
}

function sanitizePayload(body) {
  return {
    transactions: body.transactions.map((t) => ({
      id: String(t.id),
      type: t.type,
      amount: Number(t.amount),
      description: String(t.description ?? ''),
      ...(t.category ? { category: String(t.category) } : {}),
      ...(t.goalId ? { goalId: String(t.goalId) } : {}),
      date: Number(t.date),
    })),
    savingsGoals: body.savingsGoals.map((g) => ({
      id: String(g.id),
      name: String(g.name),
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      createdAt: Number(g.createdAt),
    })),
    updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : Date.now(),
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const redis = getRedis()
  if (!redis) {
    return jsonResponse({ error: 'Redis not configured' }, 503)
  }

  try {
    const data = await loadFinanceData(redis)
    return jsonResponse({ data })
  } catch (err) {
    return jsonResponse(
      { error: 'Redis read failed', detail: formatRedisError(err, 'read') },
      503
    )
  }
}

export async function PUT(request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const redis = getRedis()
  if (!redis) {
    return jsonResponse({ error: 'Redis not configured' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  if (!isValidData(body)) {
    return jsonResponse({ error: 'Invalid data shape' }, 400)
  }

  const payload = sanitizePayload(body)

  try {
    await saveFinanceData(redis, payload)
    return jsonResponse({ ok: true, updatedAt: payload.updatedAt })
  } catch (err) {
    return jsonResponse(
      { error: 'Redis write failed', detail: formatRedisError(err, 'write') },
      503
    )
  }
}
