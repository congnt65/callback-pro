import { Db, MongoClient } from 'mongodb'

declare global {
  var __callbackProMongoClientPromise: Promise<MongoClient> | undefined
}

export async function getMongoDb(): Promise<Db> {
  const connectionString = process.env.MONGODB_URL

  if (!connectionString) {
    throw new Error('Missing MONGODB_URL for mongodb provider')
  }

  if (!global.__callbackProMongoClientPromise) {
    const client = new MongoClient(connectionString)

    global.__callbackProMongoClientPromise = client.connect().then(() => client).catch((error) => {
      global.__callbackProMongoClientPromise = undefined
      throw error
    })
  }

  const client = await global.__callbackProMongoClientPromise
  return client.db(process.env.MONGODB_DB_NAME || 'callback-pro')
}
