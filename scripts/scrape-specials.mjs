// 抓取 Woolworths / Coles 当周特价，生成 public/products.json
//
// 用法：node scripts/scrape-specials.mjs
// 由 .github/workflows/update-specials.yml 每周定时运行并提交结果。
//
// 方式（关键）：用带 stealth 插件的真实无头浏览器加载官网，让 Akamai 反爬的
// JS 传感器正常运行、拿到有效 cookie，再取数据 —— 这样不会像直接 node fetch
// 那样因缺少传感器 cookie 而被 Akamai 挂起/重置（这正是 CI 一直超时的原因）。
//   Woolworths：访问首页拿 cookie，再在「页面内」fetch 内部搜索 API（按品类
//               关键词搜索 + IsOnSpecial 过滤），返回结构化数据。
//   Coles：访问 on-special 特价页，抓取已渲染的商品卡 DOM（含 Was 原价）。
//
// 可选住宅代理：设 SCRAPE_PROXY=http://user:pass@host:port，浏览器经该代理出站，
// 应对 GitHub Actions 数据中心 IP 被 Akamai 拦截的情况（浏览器 + 代理 = 最稳）。
//
// 设计原则：任一门店失败不影响另一门店；两边都拿不到则保留旧 products.json 不覆盖。

import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv, env } from 'node:process'
import puppeteer from 'puppeteer-extra'
import Stealth from 'puppeteer-extra-plugin-stealth'

puppeteer.use(Stealth())

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/products.json')

// 每个门店最多保留多少件（按折扣力度降序后截断）。
// 默认涵盖所有折扣产品（任意折扣，不止半价）；可用 SCRAPE_PER_STORE 调小做精选。
const PER_STORE = Number(env.SCRAPE_PER_STORE) || 200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const round2 = (n) => Math.round(n * 100) / 100

// 住宅代理（可选）+ 导航超时。代理出站较慢，故放宽超时；可用 SCRAPE_TIMEOUT_MS 覆盖。
const PROXY_URL = (env.SCRAPE_PROXY || '').trim()
const PROXY_ON = !!PROXY_URL
const NAV_TIMEOUT = Number(env.SCRAPE_TIMEOUT_MS) || (PROXY_ON ? 90000 : 45000)

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
export function emojiFor(name = '') {
  for (const [re, e] of EMOJI_RULES) if (re.test(name)) return e
  return '🛒'
}

// 从价格文本里取数字："$3.75" → 3.75，"| Was $12.00" → 12，数字原样返回
export function parseMoney(s) {
  if (typeof s === 'number') return s
  const m = String(s ?? '').match(/(\d+(?:\.\d+)?)/)
  return m ? parseFloat(m[1]) : NaN
}

// Coles 标题形如 "Name | Size"，拆成名称与规格
export function splitColesTitle(title = '') {
  const [name, ...rest] = String(title).split('|')
  return { name: name.trim(), size: rest.join('|').trim() }
}

// 按折扣百分比降序，截断到 PER_STORE
export function topByDiscount(items) {
  return items
    .map((p) => ({ ...p, _pct: (p.was - p.now) / p.was }))
    .sort((a, b) => b._pct - a._pct)
    .slice(0, PER_STORE)
    .map(({ _pct, ...p }) => p)
}

// ---------------------------------------------------------------- 浏览器
function proxyParts() {
  if (!PROXY_ON) return null
  try {
    const u = new URL(PROXY_URL)
    return {
      server: `${u.protocol}//${u.host}`,
      username: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      host: u.host,
    }
  } catch {
    return null
  }
}

async function launchBrowser() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ]
  const px = proxyParts()
  if (px) {
    args.push(`--proxy-server=${px.server}`)
    console.log(`使用住宅代理：${px.host}`)
  }
  return puppeteer.launch({ headless: true, args })
}

async function newPage(browser) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 900 })
  const px = proxyParts()
  if (px && (px.username || px.password)) {
    await page.authenticate({ username: px.username, password: px.password })
  }
  return page
}

// ---------------------------------------------------------------- Woolworths
const WOOLIES_TERMS = [
  'chocolate', 'coffee', 'chips', 'shampoo', 'cheese', 'soft drink',
  'biscuits', 'pasta', 'ice cream', 'cereal', 'laundry', 'snacks',
  'frozen', 'juice', 'tea', 'nuts',
]

async function scrapeWoolies(browser) {
  const page = await newPage(browser)
  // 先访问首页，让 Akamai 传感器跑起来、拿到有效 cookie
  await page.goto('https://www.woolworths.com.au/', { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
  await sleep(3500)

  const byCode = new Map()
  for (const term of WOOLIES_TERMS) {
    // 在页面内调用搜索 API —— 复用浏览器已验证的 cookie，避免被挂起
    const r = await page
      .evaluate(async (term) => {
        try {
          const res = await fetch('https://www.woolworths.com.au/apis/ui/Search/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              SearchTerm: term, PageSize: 36, PageNumber: 1, SortType: 'TraderRelevance',
              Location: '/shop/search/products', Filters: [], IsSpecial: false, IsBundle: false, IsMobile: false,
            }),
          })
          if (!res.ok) return { error: `HTTP ${res.status}` }
          const data = await res.json()
          const out = []
          for (const g of data.Products || []) {
            for (const p of g.Products || []) {
              if (p.IsOnSpecial && p.WasPrice && p.Price && p.WasPrice > p.Price) {
                out.push({
                  code: p.Stockcode, name: p.DisplayName || p.Name, raw: p.Name,
                  size: p.PackageSize || '', was: p.WasPrice, now: p.Price,
                  image: p.MediumImageFile || p.SmallImageFile || null,
                })
              }
            }
          }
          return { out }
        } catch (e) {
          return { error: e.message }
        }
      }, term)
      .catch((e) => ({ error: e.message }))

    if (r.error) {
      console.warn(`  [woolies] "${term}" 失败: ${r.error}`)
      await sleep(300)
      continue
    }
    for (const p of r.out) {
      byCode.set(p.code, {
        id: `W:${p.code}`, // 稳定 id（跨周追踪用）
        store: 'Woolworths', name: p.name, size: p.size,
        was: round2(p.was), now: round2(p.now),
        emoji: emojiFor(p.raw || p.name), image: p.image,
      })
    }
    await sleep(300) // 轻微限频
  }
  await page.close()
  return [...byCode.values()]
}

// ---------------------------------------------------------------------- Coles
const COLES_MAX_PAGES = 5

async function scrapeColes(browser) {
  const page = await newPage(browser)
  const ctx = browser.defaultBrowserContext()
  await ctx.overridePermissions('https://www.coles.com.au', ['geolocation'])
  await page.setGeolocation({ latitude: -33.8688, longitude: 151.2093 }) // 悉尼，清掉选店提示

  const byId = new Map()
  for (let pg = 1; pg <= COLES_MAX_PAGES; pg++) {
    try {
      await page.goto(`https://www.coles.com.au/on-special?page=${pg}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
      const ok = await page.waitForSelector('[data-testid="product-tile"]', { timeout: 25000 }).then(() => true).catch(() => false)
      if (!ok) {
        console.warn(`  [coles] page ${pg} 无商品（可能被拦截或到底）`)
        break
      }
      const items = await page.evaluate(() => {
        return [...document.querySelectorAll('[data-testid="product-tile"]')].map((el) => {
          const title = el.querySelector('.product__title')?.textContent?.trim() || ''
          const nowT = el.querySelector('.price__value')?.textContent?.trim() || ''
          const m = el.textContent.match(/Was\s*\$([\d.]+)/i)
          const rawImg = el.querySelector('[data-testid="product-image"]')?.getAttribute('src') || ''
          const img = rawImg.includes('url=') ? decodeURIComponent(rawImg.split('url=')[1].split('&')[0]) : rawImg
          const href = el.querySelector('a[href*="/product/"]')?.getAttribute('href') || ''
          return { title, nowT, was: m ? m[1] : null, img, href }
        })
      })

      let added = 0
      for (const it of items) {
        const now = parseMoney(it.nowT)
        const was = it.was ? parseMoney(it.was) : NaN
        if (!it.title || !(was > now) || !(now > 0)) continue // 只要真有 Was 原价的特价
        const id = (it.href.match(/-(\d+)(?:$|\?)/) || [])[1] || it.title
        if (byId.has(id)) continue
        const { name, size } = splitColesTitle(it.title)
        byId.set(id, {
          id: `C:${id}`, // 稳定 id（跨周追踪用）
          store: 'Coles', name, size,
          was: round2(was), now: round2(now),
          emoji: emojiFor(it.title), image: it.img || null,
        })
        added++
      }
      console.log(`  [coles] page ${pg}: +${added} 件特价`)
      if (added === 0 && pg > 1) break // 翻页没新增，说明到底/未真正翻页
      await sleep(500)
    } catch (e) {
      console.warn(`  [coles] page ${pg} 失败: ${e.message}`)
      break
    }
  }
  await page.close()
  return [...byId.values()]
}

async function main() {
  let browser
  try {
    browser = await launchBrowser()
  } catch (e) {
    console.error('浏览器启动失败:', e.message)
    process.exit(1)
  }

  console.log('抓取 Woolworths…')
  let woolies = []
  try { woolies = await scrapeWoolies(browser) } catch (e) { console.warn('Woolworths 整体失败:', e.message) }
  console.log(`  → ${woolies.length} 件特价`)

  console.log('抓取 Coles…')
  let coles = []
  try { coles = await scrapeColes(browser) } catch (e) { console.warn('Coles 整体失败:', e.message) }
  console.log(`  → ${coles.length} 件特价`)

  await browser.close().catch(() => {})

  const products = [...topByDiscount(woolies), ...topByDiscount(coles)]

  if (products.length === 0) {
    console.error('两个门店都没抓到数据，保留现有 products.json 不覆盖。')
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

// 仅在被直接运行时执行（被测试 import 时不触发浏览器）
if (argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
