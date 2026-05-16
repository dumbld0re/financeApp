import { Redis } from '@upstash/redis'

const DATA_KEY = 'finance:danny-miguel'

function getRedis() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv()
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  }

  return null
}

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

export async function GET(request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const redis = getRedis()
  if (!redis) {
    return jsonResponse({ error: 'Redis not configured' }, 503)
  }

  try {
    const data = await redis.get(DATA_KEY)
    return jsonResponse({ data: data ?? null })
  } catch {
    return jsonResponse({ error: 'Redis error' }, 503)
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

  const payload = {
    transactions: body.transactions,
    savingsGoals: body.savingsGoals,
    updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : Date.now(),
  }

  try {
    await redis.set(DATA_KEY, payload)
    return jsonResponse({ ok: true, updatedAt: payload.updatedAt })
  } catch {
    return jsonResponse({ error: 'Redis error' }, 503)
  }
}
