import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'

const execFileAsync = promisify(execFile)
const typeScriptRuntimeArgs = [
  '--experimental-strip-types',
  '--experimental-specifier-resolution=node',
  '--input-type=module',
] as const

async function runTypeScriptSnippet(script: string, env?: NodeJS.ProcessEnv) {
  const wrappedScript = `
    try {
      ${script}
    } finally {
      const mongoClientPromise = globalThis.__callbackProMongoClientPromise
      if (mongoClientPromise) {
        const mongoClient = await mongoClientPromise.catch(() => undefined)
        if (mongoClient) {
          await mongoClient.close()
        }
        globalThis.__callbackProMongoClientPromise = undefined
      }

      const pgPool = globalThis.__callbackProPgPool
      if (pgPool) {
        await pgPool.end()
        globalThis.__callbackProPgPool = undefined
      }
    }
  `

  const { stdout } = await execFileAsync(
    process.execPath,
    [...typeScriptRuntimeArgs, '-e', wrappedScript],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
    }
  )

  return stdout.trim()
}

function readOptionalFile(path: string) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

test('mongodb package is installed for runtime provider support', async () => {
  const mongodb = await import('mongodb')

  expect(typeof mongodb.MongoClient).toBe('function')
})

test('mongodb bootstrap requires MONGODB_URL when mongodb provider is selected', async () => {
  const stdout = await runTypeScriptSnippet(
    "const { getMongoDb } = await import('./lib/data/mongodb.ts'); delete process.env.MONGODB_URL; try { await getMongoDb(); console.log('UNEXPECTED_SUCCESS') } catch (error) { console.log(error instanceof Error ? error.message : String(error)) }",
    {
      MONGODB_URL: '',
    }
  )

  expect(stdout).toContain('Missing MONGODB_URL for mongodb provider')
})

test('mongodb provider is selected when DATABASE_PROVIDER=mongodb', async ({ request }) => {
  test.skip(!process.env.MONGODB_URL, 'requires MONGODB_URL')

  const response = await request.get(`/api/endpoint/missing-${Date.now()}`)

  expect(response.status()).toBe(404)
  await expect(response.json()).resolves.toEqual({
    error: 'Endpoint not found',
  })
})

test('mongodb routes create endpoints and enforce max_requests', async ({ request }) => {
  test.skip(!process.env.MONGODB_URL, 'requires MONGODB_URL')

  const createResponse = await request.post('/api/endpoint', {
    data: {},
  })
  expect(createResponse.status()).toBe(201)

  const created = await createResponse.json()
  const endpointId = created.id as string

  const readResponse = await request.get(`/api/endpoint/${endpointId}`)
  expect(readResponse.status()).toBe(200)
  await expect(readResponse.json()).resolves.toMatchObject({
    id: endpointId,
    request_count: 0,
    max_requests: 500,
  })

  const updateResponse = await request.put(`/api/endpoint/${endpointId}/response`, {
    data: {
      status: 201,
      headers: { 'x-test': 'mongodb' },
      body: '{"provider":"mongodb"}',
      contentType: 'application/json',
      delayMs: 0,
      maxRequests: 1,
    },
  })
  expect(updateResponse.status()).toBe(200)

  const firstHook = await request.post(`/api/hook/${endpointId}`, {
    data: { hello: 'world' },
  })
  expect(firstHook.status()).toBe(201)
  expect(firstHook.headers()['x-callbackpro-endpoint']).toBe(endpointId)
  expect(await firstHook.text()).toBe('{"provider":"mongodb"}')

  await expect
    .poll(async () => {
      const requestsResponse = await request.get(`/api/requests/${endpointId}`)
      const requests = await requestsResponse.json()
      return requests.length
    })
    .toBe(1)

  const storedRequestsResponse = await request.get(`/api/requests/${endpointId}`)
  const storedRequests = await storedRequestsResponse.json()
  expect(storedRequests).toHaveLength(1)
  expect(storedRequests[0]?.method).toBe('POST')
  expect(storedRequests[0]?.is_read).toBe(false)

  const markReadResponse = await request.patch(`/api/requests/${endpointId}/${storedRequests[0].id}`)
  expect(markReadResponse.status()).toBe(200)

  const markedRequestsResponse = await request.get(`/api/requests/${endpointId}`)
  const markedRequests = await markedRequestsResponse.json()
  expect(markedRequests[0]?.is_read).toBe(true)

  const secondHook = await request.post(`/api/hook/${endpointId}`, {
    data: { hello: 'again' },
  })
  expect(secondHook.status()).toBe(429)

  const deleteResponse = await request.delete(`/api/requests/${endpointId}/${storedRequests[0].id}`)
  expect(deleteResponse.status()).toBe(200)

  await expect
    .poll(async () => {
      const endpointResponse = await request.get(`/api/endpoint/${endpointId}`)
      const endpoint = await endpointResponse.json()
      return endpoint.request_count
    })
    .toBe(0)
})

test('mongodb routes clear request history and reset the counter', async ({ request }) => {
  test.skip(!process.env.MONGODB_URL, 'requires MONGODB_URL')

  const createResponse = await request.post('/api/endpoint', {
    data: {},
  })
  expect(createResponse.status()).toBe(201)

  const created = await createResponse.json()
  const endpointId = created.id as string

  const firstHook = await request.post(`/api/hook/${endpointId}`, {
    data: { index: 1 },
  })
  const secondHook = await request.post(`/api/hook/${endpointId}`, {
    data: { index: 2 },
  })

  expect(firstHook.status()).toBe(200)
  expect(secondHook.status()).toBe(200)

  await expect
    .poll(async () => {
      const requestsResponse = await request.get(`/api/requests/${endpointId}`)
      const requests = await requestsResponse.json()
      return requests.length
    })
    .toBe(2)

  const clearResponse = await request.delete(`/api/requests/${endpointId}`)
  expect(clearResponse.status()).toBe(200)

  await expect
    .poll(async () => {
      const requestsResponse = await request.get(`/api/requests/${endpointId}`)
      const requests = await requestsResponse.json()
      return requests.length
    })
    .toBe(0)

  const endpointResponse = await request.get(`/api/endpoint/${endpointId}`)
  const endpoint = await endpointResponse.json()
  expect(endpoint.request_count).toBe(0)
})

test('optional local files can be missing', async () => {
  expect(readOptionalFile('missing-local-file-that-should-not-exist.txt')).toBeNull()
})

test('documentation mentions mongodb runtime configuration', async () => {
  const readme = readFileSync('README.md', 'utf8')
  const instructions = readOptionalFile('.github/copilot-instructions.md')

  expect(readme).toContain('DATABASE_PROVIDER=mongodb')
  expect(readme).toContain('MONGODB_URL=')
  if (instructions) {
    expect(instructions).toContain('mongodb')
  }
})

test('endpoint cache uses neutral naming instead of redis references', async () => {
  const readme = readFileSync('README.md', 'utf8')
  const instructions = readOptionalFile('.github/copilot-instructions.md')
  const envLocal = readOptionalFile('.env.local')

  expect(existsSync('lib/endpoint-cache.ts')).toBe(true)
  expect(existsSync('lib/redis.ts')).toBe(false)
  expect(readme).not.toContain('redis.ts')

  if (instructions) {
    expect(instructions).toContain('lib/endpoint-cache.ts')
    expect(instructions).not.toContain('lib/redis.ts')
  }

  if (envLocal) {
    expect(envLocal).not.toContain('REDIS_URL=')
  }
})
