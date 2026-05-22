import { MongoDataProvider } from './mongodb-provider'
import { PostgresDataProvider } from './postgres-provider'
import type { DataProvider } from './provider'
import { SupabaseDataProvider } from './supabase-provider'

let provider: DataProvider | null = null
let providerKey: string | null = null

function resolveProviderName() {
  const testOverride = process.env.NODE_ENV === 'test' ? process.env.TEST_DATABASE_PROVIDER : undefined
  return testOverride ?? process.env.DATABASE_PROVIDER
}

function resolveProviderKey() {
  const configuredProvider = resolveProviderName()

  if (configuredProvider) {
    return configuredProvider
  }

  return process.env.DATABASE_URL ? 'postgres' : 'supabase'
}

function resolveProvider(configuredProvider = resolveProviderName()) {

  if (configuredProvider === 'postgres') {
    return new PostgresDataProvider()
  }

  if (configuredProvider === 'mongodb') {
    return new MongoDataProvider()
  }

  if (configuredProvider === 'supabase') {
    return new SupabaseDataProvider()
  }

  if (process.env.DATABASE_URL) {
    return new PostgresDataProvider()
  }

  return new SupabaseDataProvider()
}

export function getDataProvider() {
  const nextProviderKey = resolveProviderKey()

  if (provider == null || providerKey !== nextProviderKey) {
    provider = resolveProvider()
    providerKey = nextProviderKey
  }

  return provider
}
