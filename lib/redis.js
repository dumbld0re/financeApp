import { Redis } from '@upstash/redis'

export const DATA_KEY = 'finance:danny-miguel'

export function getRedis() {
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

function isWrongTypeError(err) {
  const msg = String(err?.message || err)
  return msg.includes('WRONGTYPE')
}

function isReadOnlyError(err) {
  const msg = String(err?.message || err)
  return msg.includes('NOPERM') || msg.includes('read only') || msg.includes('READONLY')
}

export function formatRedisError(err, operation) {
  if (isReadOnlyError(err)) {
    return 'Redis token is read-only — use UPSTASH_REDIS_REST_TOKEN (not read-only)'
  }
  if (isWrongTypeError(err)) {
    return `Corrupt data at key — ${operation} reset required`
  }
  return `${operation}: ${err?.message || String(err)}`
}

function parseStored(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') {
    return JSON.parse(raw)
  }
  if (typeof raw === 'object') {
    return raw
  }
  throw new Error('Unexpected value type in Redis')
}

export async function loadFinanceData(redis) {
  try {
    const raw = await redis.get(DATA_KEY)
    if (raw == null) return null
    return parseStored(raw)
  } catch (err) {
    if (isWrongTypeError(err)) {
      await redis.del(DATA_KEY)
      return null
    }
    throw err
  }
}

export async function saveFinanceData(redis, payload) {
  const json = JSON.stringify(payload)
  await redis.set(DATA_KEY, json)
}

export async function testRedisAccess(redis) {
  const checkKey = 'finance:healthcheck'

  try {
    await redis.set(checkKey, 'ok', { ex: 30 })
    const val = await redis.get(checkKey)
    await redis.del(checkKey)
    if (val !== 'ok') return { ok: false, reason: 'write/read check failed' }

    await loadFinanceData(redis)
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: formatRedisError(err, 'healthcheck') }
  }
}
