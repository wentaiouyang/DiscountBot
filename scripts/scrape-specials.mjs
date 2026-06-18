// 抓取 Woolworths / Coles 当周特价，生成 public/products.json
//
// 用法：node scripts/scrape-specials.mjs
// 由 .github/workflows/update-specials.yml 每周定时运行并提交结果。
//
// 数据源（均为各自官网前端自用的内部接口，无需鉴权，但有反爬/限频）：
//   Woolworths  POST /apis/ui/Search/products       关键词搜索 + IsOnSpecial 过滤
//   Coles       GET  /_next/data/{buildId}/en/on-special.json   特价页 Next.js 数据
//
// 设计原则：任一门店失败不影响另一门店；若两边都拿不到数据，则保留旧的 products.json 不覆盖。

import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, env } from 'node:process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/products.json')

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

// 每个门店最多保留多少件（按折扣力度排序后截断）
const PER_STORE = 40

// 名称 → emoji（无图时的兜底图标）
const EMOJI_RULES = [
  [/choc|cadbury|lindt|kitkat|m&m/i, '🍫'],
  [/coffee|espresso|vittoria|nescafe/i, '☕'],
  [/chip|crisp|pringles|doritos/i, '🍟'],
  [/milk|dairy|cream/i, '🥛'],
  [/cheese/i, '🧀'],
  [/shampoo|conditioner|head & shoulders|hair/i, '🧴'],
  [/soft drink|cola|pepsi|coke|solo|lemonade|soda/i, '🥤'],
  [/wine|gin|vodka|beer|whisky|spirit/i, '🍷'],
  [/beef|steak|meat|lamb|pork/i, '🥩'],
  [/chicken|poultry/i, '🍗'],
  [/fish|salmon|tuna|seafood|prawn/i, '🐟'],
  [/bread|crumpet|bun|bakery|muffin/i, '🍞'],
  [/pasta|spaghetti|noodle/i, '🍝'],
  [/lolly|lollies|gummy|snake|confection|candy/i, '🍬'],
  [/ice ?cream|gelato/i, '🍦'],
  [/biscuit|cookie|cracker/i, '🍪'],
  [/juice|fruit/i, '🧃'],
  [/soap|wash|lip balm|skin|cetaphil/i, '🧼'],
  [/coffee|tea/i, '🍵'],
]
function emojiFor(name = '') {
  for (const [re, e] of EMOJI_RULES) if (re.test(name)) return e
  return '🛒'
}

// 把 set-cookie 头拼成可回传的 Cookie 字符串
function cookieHeaderFrom(res) {
  const list = res.headers.getSetCookie ? res.headers.getSetCookie() : []
  return list.map((c) => c.split(';')[0]).join('; ')
}

const round2 = (n) => Math.round(n * 100) / 100

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 单次请求超时 / 最大重试次数（应对 Akamai 反爬偶发性丢弃/重置连接）。
// 经住宅代理时单请求常需 30-70s（代理内部会轮换/重试出口 IP），故代理模式下
// 默认放宽到 70s；可用 SCRAPE_TIMEOUT_MS 覆盖。直连模式保持 15s。
const PROXY_ON = !!(env.SCRAPE_PROXY || '').trim()
const FETCH_TIMEOUT_MS = Number(env.SCRAPE_TIMEOUT_MS) || (PROXY_ON ? 70000 : 15000)
const MAX_RETRIES = 3

// 住宅代理（可选）。
// Woolworths/Coles 的 Akamai 会按 IP 信誉打分：本地住宅 IP 能通过，
// 而 GitHub Actions 的云端/数据中心 IP 几乎必被拦截 —— 这也是 CI 始终拿不到
// 数据的根因。设置 SCRAPE_PROXY=http://user:pass@host:port 即可让请求经由
// 住宅代理（如 ScraperAPI 代理模式）发出，绕过 IP 拦截。未设置时按直连处理，
// 本地开发行为不变。
const PROXY_URL = (env.SCRAPE_PROXY || '').trim()

// 按需启用住宅代理。undici 仅在配置了代理时才动态加载：
//  - 没配代理（本地开发）时根本不 import undici，避免它在某些 Node 版本上的
//    加载期崩溃（如 Node 20 + undici 8 的 markAsUncloneable）拖垮整个脚本；
//  - setGlobalDispatcher 会作用于全局 fetch（内置 fetch 与 undici 共享全局
//    dispatcher）。不能把 ProxyAgent 当作 per-request dispatcher 传给内置 fetch
//    （会报 UND_ERR_INVALID_ARG），必须走全局 dispatcher。
async function setupProxy() {
  if (!PROXY_URL) return
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import('undici')
    setGlobalDispatcher(new ProxyAgent(PROXY_URL))
    // 不打印凭据，仅打印主机，便于在 CI 日志确认代理已生效
    let host = PROXY_URL
    try { host = new URL(PROXY_URL).host } catch { /* 保留原值 */ }
    console.log(`使用住宅代理：${host}`)
  } catch (err) {
    console.error(`代理初始化失败（${err.message}）；将以直连方式继续。`)
  }
}

// 带超时与重试的 fetch。
// Woolworths/Coles 前置 Akamai 会偶发性重置或挂起连接，表现为 undici 的
// "fetch failed"（TypeError，真实原因藏在 err.cause）或请求永久挂起。
// 这里用 AbortSignal.timeout 防止挂起，并对网络错误 / 5xx / 429 做退避重试。
export async function fetchWithRetry(
  url,
  init = {},
  { retries = MAX_RETRIES, timeout = FETCH_TIMEOUT_MS, label = url } = {},
) {
  let lastErr
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) })
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`HTTP ${res.status}`)
      } else {
        return res
      }
    } catch (err) {
      lastErr = err
      // undici 把真实原因放在 err.cause（如 ECONNRESET / UND_ERR_SOCKET）
      const cause = err.cause?.code || err.cause?.message || ''
      if (attempt < retries) {
        console.warn(
          `  [retry ${attempt}/${retries}] ${label}: ${err.message}${cause ? ` (${cause})` : ''}`,
        )
      }
    }
    if (attempt < retries) await sleep(attempt * 800) // 线性退避：0.8s、1.6s…
  }
  throw lastErr
}

// ---------------------------------------------------------------- Woolworths
const WOOLIES_TERMS = [
  'chocolate', 'coffee', 'chips', 'shampoo', 'cheese', 'soft drink',
  'biscuits', 'pasta', 'ice cream', 'cereal', 'laundry', 'snacks',
  'frozen', 'juice', 'tea', 'nuts',
]

async function scrapeWoolies() {
  const home = await fetchWithRetry(
    'https://www.woolworths.com.au/',
    { headers: { 'User-Agent': UA, Accept: 'text/html' } },
    { label: 'woolies home' },
  )
  const cookie = cookieHeaderFrom(home)

  const byCode = new Map()
  for (const term of WOOLIES_TERMS) {
    try {
      const res = await fetchWithRetry('https://www.woolworths.com.au/apis/ui/Search/products', {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://www.woolworths.com.au',
          Referer: 'https://www.woolworths.com.au/shop/search/products',
          'Request-Id': '|a.b',
          Cookie: cookie,
        },
        body: JSON.stringify({
          SearchTerm: term,
          PageSize: 36,
          PageNumber: 1,
          SortType: 'TraderRelevance',
          Location: '/shop/search/products',
          Filters: [],
          IsSpecial: false,
          IsBundle: false,
          IsMobile: false,
        }),
      }, { label: `woolies "${term}"` })
      if (!res.ok) {
        console.warn(`  [woolies] "${term}" HTTP ${res.status}`)
        continue
      }
      const data = await res.json()
      for (const group of data.Products || []) {
        for (const p of group.Products || []) {
          const was = p.WasPrice
          const now = p.Price
          if (!p.IsOnSpecial || !was || !now || was <= now) continue
          byCode.set(p.Stockcode, {
            store: 'Woolworths',
            name: p.DisplayName || p.Name,
            size: p.PackageSize || '',
            was: round2(was),
            now: round2(now),
            emoji: emojiFor(p.Name),
            image: p.MediumImageFile || p.SmallImageFile || null,
          })
        }
      }
    } catch (err) {
      const cause = err.cause?.code || err.cause?.message || ''
      console.warn(`  [woolies] "${term}" 失败:`, err.message, cause ? `(${cause})` : '')
    }
    await sleep(350) // 轻微限频
  }
  return [...byCode.values()]
}

// ---------------------------------------------------------------------- Coles
async function scrapeColes() {
  const home = await fetchWithRetry(
    'https://www.coles.com.au/',
    { headers: { 'User-Agent': UA, Accept: 'text/html' } },
    { label: 'coles home' },
  )
  const cookie = cookieHeaderFrom(home)
  const html = await home.text()
  const buildId = html.match(/"buildId":"([^"]+)"/)?.[1]
  if (!buildId) throw new Error('无法从首页解析 Coles buildId')

  const assetsBase = html.match(/"assetsUrl":"([^"]+)"/)?.[1] ||
    'https://cdn.productimages.coles.com.au/productimages'

  const byId = new Map()
  for (let page = 1; page <= 4; page++) {
    try {
      const url =
        `https://www.coles.com.au/_next/data/${buildId}/en/on-special.json` +
        (page > 1 ? `?page=${page}` : '')
      const res = await fetchWithRetry(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json',
          Referer: 'https://www.coles.com.au/on-special',
          Cookie: cookie,
        },
      }, { label: `coles page ${page}` })
      if (!res.ok) {
        console.warn(`  [coles] page ${page} HTTP ${res.status}`)
        continue
      }
      const data = await res.json()
      const results = data?.pageProps?.searchResults?.results || []
      for (const p of results) {
        if (p._type !== 'PRODUCT') continue
        const pr = p.pricing || {}
        const was = pr.was
        const now = pr.now
        if (!was || !now || was <= now) continue
        const uri = (p.imageUris || [])[0]?.uri
        byId.set(p.id ?? p.name, {
          store: 'Coles',
          name: p.name,
          size: [p.brand, p.size].filter(Boolean).join(' · ') || p.size || '',
          was: round2(was),
          now: round2(now),
          emoji: emojiFor(`${p.brand || ''} ${p.name}`),
          image: uri ? assetsBase + uri : null,
        })
      }
      if (results.length === 0) break
    } catch (err) {
      const cause = err.cause?.code || err.cause?.message || ''
      console.warn(`  [coles] page ${page} 失败:`, err.message, cause ? `(${cause})` : '')
    }
    await sleep(350)
  }
  return [...byId.values()]
}

// 按折扣百分比降序，截断到 PER_STORE
function topByDiscount(items) {
  return items
    .map((p) => ({ ...p, _pct: (p.was - p.now) / p.was }))
    .sort((a, b) => b._pct - a._pct)
    .slice(0, PER_STORE)
    .map(({ _pct, ...p }) => p)
}

async function main() {
  await setupProxy()
  console.log('抓取 Woolworths…')
  let woolies = []
  try { woolies = await scrapeWoolies() } catch (e) { console.warn('Woolworths 整体失败:', e.message) }
  console.log(`  → ${woolies.length} 件特价`)

  console.log('抓取 Coles…')
  let coles = []
  try { coles = await scrapeColes() } catch (e) { console.warn('Coles 整体失败:', e.message) }
  console.log(`  → ${coles.length} 件特价`)

  const products = [...topByDiscount(woolies), ...topByDiscount(coles)]

  if (products.length === 0) {
    console.error('两个门店都没抓到数据，保留现有 products.json 不覆盖。')
    try { await readFile(OUT) } catch { /* 没有旧文件也无所谓 */ }
    process.exit(1)
  }

  const payload = {
    updatedAt: new Date().toISOString(),
    count: products.length,
    sources: { woolworths: woolies.length, coles: coles.length },
    products,
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`已写入 ${OUT}（共 ${products.length} 件，更新于 ${payload.updatedAt}）`)
}

// 仅在被直接运行时执行（被测试 import 时不触发网络请求）
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
