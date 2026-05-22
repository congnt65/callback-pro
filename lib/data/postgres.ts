import { Pool } from 'pg'

declare global {
  var __callbackProPgPool: Pool | undefined
}

export function getPostgresPool() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('Missing DATABASE_URL for postgres provider')
  }

  if (!global.__callbackProPgPool) {
    global.__callbackProPgPool = new Pool({
      connectionString,
    })
  }

  return global.__callbackProPgPool
}
