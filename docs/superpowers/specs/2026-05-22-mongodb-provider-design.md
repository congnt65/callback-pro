# MongoDB Provider Design

## Goal

Add MongoDB as a first-class runtime data provider alongside the existing Supabase and PostgreSQL providers, without changing the HTTP/API contract or the current polling-based UI flow.

## Scope

This design covers:

- adding a `MongoDataProvider` that conforms to the existing `DataProvider` interface
- provider selection via environment configuration
- MongoDB collection design for endpoints and requests
- error handling and atomic counter behavior
- validation and testing needed to keep the current app behavior stable

This design does not replace Supabase or PostgreSQL. MongoDB is added as another provider option.

## Current context

The repository already has a provider abstraction in `lib/data/`:

- `provider.ts` defines the shared `DataProvider` interface
- `supabase-provider.ts` implements the current Supabase-backed behavior
- `postgres-provider.ts` implements direct PostgreSQL access
- `index.ts` selects the provider at runtime using environment variables

The UI no longer depends on Supabase Realtime directly. `app/page.tsx` now refreshes endpoint state and request history through polling, which makes the frontend provider-agnostic enough for MongoDB to slot in without a UI protocol change.

## Architecture

### Provider model

Keep the existing `DataProvider` contract as the stable application boundary. Add:

- `lib/data/mongodb.ts` for MongoDB client creation and connection reuse
- `lib/data/mongodb-provider.ts` for the MongoDB implementation of `DataProvider`

Update `lib/data/index.ts` so `getDataProvider()` can resolve:

- `DATABASE_PROVIDER=supabase`
- `DATABASE_PROVIDER=postgres`
- `DATABASE_PROVIDER=mongodb`

If `DATABASE_PROVIDER` is absent, existing fallback behavior should remain intact so current environments do not break unexpectedly.

### Why this approach

This keeps all route handlers and polling logic unchanged at the contract boundary. The provider switch happens behind `getDataProvider()`, which is the smallest change surface that still supports multiple backends cleanly.

## Data model

Use two MongoDB collections that mirror the current domain objects closely.

### `endpoints` collection

Document shape:

```json
{
  "_id": "uuid-string",
  "created_at": "2026-05-22T12:00:00.000Z",
  "request_count": 0,
  "max_requests": 500,
  "custom_response_status": 200,
  "custom_response_headers": {},
  "custom_response_body": "{\"message\":\"ok\"}",
  "custom_response_content_type": "application/json",
  "custom_response_delay_ms": 0
}
```

### `requests` collection

Document shape:

```json
{
  "_id": "uuid-string",
  "endpoint_id": "uuid-string",
  "method": "POST",
  "path": "/",
  "query_params": {},
  "headers": {},
  "body": "{\"hello\":\"world\"}",
  "received_at": "2026-05-22T12:00:00.000Z",
  "is_read": false,
  "ip": "127.0.0.1",
  "duration_ms": 12
}
```

### Identifier strategy

Keep IDs as UUID strings, not Mongo `ObjectId`s. This preserves:

- current route parameters
- localStorage endpoint persistence
- the existing `lib/types.ts` contract
- provider portability between SQL and MongoDB

## Provider behavior

### `createEndpoint(requestedId?)`

- if `requestedId` is provided, try to create that endpoint
- if the ID already exists, return the existing endpoint with `created: false`
- otherwise create a fresh document with the same defaults used by the current providers

### `getEndpoint(id)`

- return `null` when the endpoint is genuinely missing
- throw when MongoDB connectivity or query execution fails

### `updateEndpointResponse(id, config)`

- update the endpoint response fields in one operation
- normalize values exactly as the current providers do:
  - `status` default `200`
  - `headers` default `{}`
  - `body` default `''`
  - `contentType` default `application/json`
  - `delayMs` clamped to `0..30000`
  - `maxRequests` clamped to at least `1`

### `listRequests(endpointId)`

- return up to the latest 500 requests
- sort by `received_at` descending

### `clearRequests(endpointId)`

- delete all request documents for that endpoint
- reset the endpoint `request_count` to `0`

### `markRequestRead(requestId)`

- set `is_read = true`

### `deleteRequest(endpointId, requestId)`

- delete the request document
- decrement `request_count`, but never below `0`

### `tryIncrementRequestCount(endpointId)`

Use an atomic conditional update:

- only increment when `request_count < max_requests`
- return `true` if increment succeeded
- return `false` if the request limit was already reached

This should be implemented with a single MongoDB update/find-and-update operation so the limit check and increment happen together.

### `insertRequest(request)`

- insert the request document after the HTTP response is sent, matching current behavior
- preserve the fallback behavior around `duration_ms` only if Mongo runtime reveals a real compatibility issue; otherwise keep Mongo implementation simple

## Error handling

Route behavior must stay consistent across providers:

- connection/query/provider failures -> `500`
- endpoint truly missing -> `404`
- request limit exceeded -> `429`

The provider should throw explicit errors on infrastructure failures so route handlers can map them to `500` responses. MongoDB provider code must not turn connectivity failures into "not found" results.

## Runtime configuration

Add Mongo-specific environment handling:

- `DATABASE_PROVIDER=mongodb`
- `MONGODB_URL=<connection string>`
- optional `MONGODB_DB_NAME=<database name>` if the URL does not fully determine the target database cleanly

The Mongo provider should fail loudly at startup/use time if its required environment variables are missing.

## Files to add or modify

### Add

- `lib/data/mongodb.ts`
- `lib/data/mongodb-provider.ts`

### Modify

- `lib/data/index.ts`
- `package.json`
- `package-lock.json`
- `.github/copilot-instructions.md` if MongoDB configuration becomes part of the supported setup story
- `README.md` if runtime configuration instructions are updated in this change set

### Likely unchanged

- `app/api/endpoint/route.ts`
- `app/api/endpoint/[id]/route.ts`
- `app/api/endpoint/[id]/response/route.ts`
- `app/api/hook/[id]/route.ts`
- `app/api/requests/[id]/route.ts`
- `app/api/requests/[id]/[requestId]/route.ts`
- `app/page.tsx`

These should already be insulated by `getDataProvider()` and should only need changes if Mongo-specific edge cases reveal a contract mismatch.

## Testing strategy

### Build verification

- `npm run build`

### Lint verification

- `npm run lint`

### Regression checks

- preserve the current API behavior for endpoint creation, endpoint lookup, hook handling, request listing, marking read, deleting one request, and deleting all requests
- keep the existing Playwright smoke coverage working

### New targeted coverage

- provider selection resolves MongoDB when `DATABASE_PROVIDER=mongodb`
- Mongo provider can create an endpoint and read it back
- Mongo provider returns `false` from `tryIncrementRequestCount` when the limit is reached
- Mongo provider preserves request ordering and the 500-record cap

## Rollout

Phase 1 for this repository:

1. add MongoDB provider implementation
2. wire runtime selection in `lib/data/index.ts`
3. verify that existing routes work unchanged through the new provider
4. leave Supabase and PostgreSQL providers intact

This keeps the migration reversible and minimizes disruption while proving the abstraction can support a non-SQL backend.
