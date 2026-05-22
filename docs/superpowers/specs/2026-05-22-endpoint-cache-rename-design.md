# Endpoint Cache Rename Design

## Summary

Rename the current in-process endpoint cache module away from `redis` terminology while preserving existing behavior. The goal is to remove misleading Redis naming and configuration references without changing request handling, cache invalidation, or persistence behavior.

## Current State

- `lib/redis.ts` implements a process-local `Map` cache with TTL; it does not connect to Redis.
- `app/api/hook/[id]/route.ts` reads endpoint configuration from that cache before falling back to the active data provider, then refreshes the cache after request processing.
- `app/api/endpoint/[id]/response/route.ts` invalidates the cached endpoint after response configuration updates.
- Documentation and local environment examples still mention Redis, including `REDIS_URL` in `.env.local`, which implies a runtime dependency that does not exist.

## Goals

- Remove Redis terminology from code and docs.
- Keep the existing in-memory caching behavior unchanged.
- Eliminate misleading environment/configuration references related to Redis.

## Non-Goals

- Replacing the current in-memory cache with a distributed cache.
- Changing request persistence or provider selection logic.
- Refactoring unrelated endpoint, hook, or database code.

## Chosen Approach

Rename `lib/redis.ts` to `lib/endpoint-cache.ts` and update imports, comments, and documentation to describe it as an in-process endpoint cache.

This keeps the current hot-path behavior intact:

- hook requests still attempt a cache read before fetching from the provider
- successful endpoint reads still warm the cache
- response configuration updates still invalidate the cached endpoint
- request-count cache refresh after webhook writes remains unchanged

The implementation should also remove stale Redis configuration references from checked-in examples and docs so deployment instructions align with the actual runtime contract.

## Alternatives Considered

### 1. Remove the cache entirely

Pros:

- Simpler mental model
- No cache naming or invalidation concerns

Cons:

- Increases database reads on every webhook request
- Changes performance behavior unnecessarily for this task

### 2. Keep the current module name and only delete `REDIS_URL`

Pros:

- Smallest diff
- Minimal file movement

Cons:

- Leaves misleading `redis` terminology in code
- Future contributors may still assume a Redis dependency exists

## Planned Changes

### Code

- Rename `lib/redis.ts` to `lib/endpoint-cache.ts`
- Update imports in:
  - `app/api/hook/[id]/route.ts`
  - `app/api/endpoint/[id]/response/route.ts`
- Update comments to consistently describe the module as in-process or in-memory endpoint caching

### Documentation and configuration samples

- Remove Redis references from README project structure and any related descriptive text
- Remove `REDIS_URL` from checked-in local environment examples if it is no longer used anywhere in the app

## Verification

- Run the existing build
- Run the Playwright smoke coverage relevant to endpoint creation and MongoDB flow to confirm the rename did not change behavior

## Risks and Mitigations

- **Risk:** A missed import or stale reference breaks runtime routes.
  - **Mitigation:** Search for all `redis` references and update them in one pass.
- **Risk:** Docs and config samples drift from implementation again.
  - **Mitigation:** Remove unused Redis examples in the same change as the code rename.
