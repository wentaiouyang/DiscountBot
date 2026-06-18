// 回归测试：fetchWithRetry 的超时 + 重试行为
// 运行：node --test scripts/scrape-specials.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchWithRetry } from './scrape-specials.mjs'

const realFetch = globalThis.fetch
function stubFetch(fn) { globalThis.fetch = fn }
function restoreFetch() { globalThis.fetch = realFetch }

test('成功请求直接返回，不重试', async () => {
  let calls = 0
  stubFetch(async () => { calls++; return new Response('ok', { status: 200 }) })
  try {
    const res = await fetchWithRetry('https://x', {}, { retries: 3 })
    assert.equal(res.status, 200)
    assert.equal(calls, 1)
  } finally { restoreFetch() }
})

test('瞬时网络错误后重试并最终成功', async () => {
  let calls = 0
  stubFetch(async () => {
    calls++
    if (calls < 2) {
      // 模拟 undici 的 "fetch failed"（真实原因在 cause）
      const err = new TypeError('fetch failed')
      err.cause = { code: 'ECONNRESET' }
      throw err
    }
    return new Response('ok', { status: 200 })
  })
  try {
    const res = await fetchWithRetry('https://x', {}, { retries: 3 })
    assert.equal(res.status, 200)
    assert.equal(calls, 2) // 第一次失败、第二次成功
  } finally { restoreFetch() }
})

test('5xx 触发重试，耗尽后抛出', async () => {
  let calls = 0
  stubFetch(async () => { calls++; return new Response('err', { status: 503 }) })
  try {
    await assert.rejects(
      () => fetchWithRetry('https://x', {}, { retries: 3 }),
      /HTTP 503/,
    )
    assert.equal(calls, 3)
  } finally { restoreFetch() }
})

test('持续失败时抛出原始错误（带 cause）', async () => {
  stubFetch(async () => {
    const err = new TypeError('fetch failed')
    err.cause = { code: 'UND_ERR_SOCKET' }
    throw err
  })
  try {
    await assert.rejects(
      () => fetchWithRetry('https://x', {}, { retries: 2 }),
      (e) => e.cause?.code === 'UND_ERR_SOCKET',
    )
  } finally { restoreFetch() }
})

test('请求挂起时被超时中止（不会无限等待）', async () => {
  // fetch 模拟慢响应（5s 才返回）；100ms 超时应在它返回前中止
  stubFetch((url, init) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response('late', { status: 200 })), 5000)
      init.signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
      })
    }),
  )
  try {
    const t0 = Date.now()
    await assert.rejects(
      () => fetchWithRetry('https://x', {}, { retries: 1, timeout: 100 }),
      (e) => e.name === 'AbortError',
    )
    assert.ok(Date.now() - t0 < 4000, '应在超时后立即中止，而非等待慢响应')
  } finally { restoreFetch() }
})
