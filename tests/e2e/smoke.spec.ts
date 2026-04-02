import { test, expect } from '@playwright/test'

test('home page smoke', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('CallbackPro')).toBeVisible()
  await expect(page.getByText('Live')).toBeVisible()
})

test('new endpoint creates fresh id and resets usage state', async ({ page, request }) => {
  await page.goto('/')

  const hookUrlLocator = page.locator('span[title^="http"]').first()
  const counterLocator = page.locator('span', { hasText: /\d+\s*\/\s*\d+/ }).first()
  const readHookUrl = async () => hookUrlLocator.getAttribute('title')

  // Start from a guaranteed fresh endpoint so the test is not affected by
  // previously exhausted endpoints stored in localStorage.
  const initialHookUrl = await readHookUrl()
  await page.getByRole('button', { name: '+ New' }).click()
  await expect.poll(readHookUrl).not.toBe(initialHookUrl)
  await expect(counterLocator).toContainText('0 / 500')

  const firstFreshHookUrl = await readHookUrl()
  expect(firstFreshHookUrl).toBeTruthy()
  const firstFreshId = new URL(firstFreshHookUrl as string).pathname.split('/').pop() as string
  const firstMetaResponse = await request.get(`/api/endpoint/${firstFreshId}`)
  expect(firstMetaResponse.status()).toBe(200)
  const firstMeta = await firstMetaResponse.json()
  expect(firstMeta.id).toBe(firstFreshId)
  expect(firstMeta.request_count).toBe(0)
  expect(firstMeta.max_requests).toBe(500)

  await page.getByRole('button', { name: '+ New' }).click()
  await expect.poll(readHookUrl).not.toBe(firstFreshHookUrl)
  await expect(counterLocator).toContainText('0 / 500')

  const secondFreshHookUrl = await readHookUrl()
  expect(secondFreshHookUrl).toBeTruthy()
  expect(secondFreshHookUrl).not.toBe(firstFreshHookUrl)
  const secondFreshId = new URL(secondFreshHookUrl as string).pathname.split('/').pop() as string
  const secondMetaResponse = await request.get(`/api/endpoint/${secondFreshId}`)
  expect(secondMetaResponse.status()).toBe(200)
  const secondMeta = await secondMetaResponse.json()
  expect(secondMeta.id).toBe(secondFreshId)
  expect(secondMeta.request_count).toBe(0)
  expect(secondMeta.max_requests).toBe(500)
})
