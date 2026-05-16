import { getRedis, testRedisAccess } from '../lib/redis.js'

export async function GET() {
  const redis = getRedis()

  if (!redis) {
    return Response.json({
      redis: false,
      serverSecret: Boolean(process.env.SYNC_SECRET),
      clientSecretAtBuild: Boolean(process.env.VITE_SYNC_SECRET),
      detail: 'Missing UPSTASH_REDIS_REST_URL / TOKEN',
    })
  }

  const test = await testRedisAccess(redis)

  return Response.json({
    redis: test.ok,
    serverSecret: Boolean(process.env.SYNC_SECRET),
    clientSecretAtBuild: Boolean(process.env.VITE_SYNC_SECRET),
    detail: test.ok ? null : test.reason,
  })
}
