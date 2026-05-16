import { Redis } from '@upstash/redis'

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

export async function GET() {
  const redis = getRedis()
  let redisOk = false

  if (redis) {
    try {
      await redis.ping()
      redisOk = true
    } catch {
      redisOk = false
    }
  }

  return Response.json({
    redis: redisOk,
    serverSecret: Boolean(process.env.SYNC_SECRET),
    clientSecretAtBuild: Boolean(process.env.VITE_SYNC_SECRET),
  })
}
