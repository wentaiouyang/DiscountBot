// 商品数据：运行时从 public/products.json 拉取「每周定时抓取」的实时特价，
// 抓取失败 / 离线时回退到下方内置的精选快照，保证 App 永远有内容可滑。
//
// 数据生成：scripts/scrape-specials.mjs（由 GitHub Action 每周运行并提交 products.json）
//
// 字段说明：
//   store  门店：'Woolworths' | 'Coles'
//   name   商品名      size 规格
//   was    原价(AUD)   now  特价(AUD)
//   emoji  无图占位图标  image 官方商品图 URL（可为 null）

const WOOLIES_IMG = (code) =>
  `https://cdn0.woolworths.media/content/wowproductimages/large/${code}.jpg`

// —— 内置精选快照（离线 / 抓取失败时的兜底）——
const fallbackRaw = [
  { store: 'Woolworths', name: 'Head & Shoulders 去屑洗发水（清爽控油）', size: '850mL', was: 26.0, now: 13.0, emoji: '🧴', image: WOOLIES_IMG('583454') },
  { store: 'Woolworths', name: 'Cadbury 牛奶椰丝脆巧克力排块', size: '180g', was: 8.0, now: 4.0, emoji: '🍫', image: WOOLIES_IMG('815197') },
  { store: 'Woolworths', name: "Leggo's 奶油油浸番茄大蒜焗意面酱", size: '500g', was: 5.5, now: 4.3, emoji: '🍝', image: WOOLIES_IMG('452061') },
  { store: 'Woolworths', name: 'Cadbury Cherry Ripe 双层黑巧克力棒', size: '40g', was: 4.0, now: 3.0, emoji: '🍫', image: WOOLIES_IMG('610117') },
  { store: 'Woolworths', name: "Smith's 经典波浪番茄味薯片", size: '150g', was: 5.0, now: 2.0, emoji: '🍟', image: WOOLIES_IMG('6020914') },
  { store: 'Woolworths', name: 'The Natural Confectionery Co. 巨型软糖蛇', size: '170g', was: 5.0, now: 2.5, emoji: '🐍', image: WOOLIES_IMG('6073819') },
  { store: 'Woolworths', name: 'Solo 无糖柠檬汽水 易拉罐', size: '375mL x 24', was: 39.5, now: 21.0, emoji: '🥤', image: null },
  { store: 'Woolworths', name: 'Ferrero 费列罗精选巧克力礼盒', size: '15 颗 / 172g', was: 21.0, now: 10.5, emoji: '🍫', image: null },
  { store: 'Coles', name: 'Pacific West 冷冻迷你春卷', size: '1kg', was: 12.9, now: 7.5, emoji: '🥟', image: null },
  { store: 'Coles', name: 'Vittoria Espresso Magic 咖啡粉', size: '500g', was: 37.9, now: 22.0, emoji: '☕', image: null },
  { store: 'Coles', name: 'Sharpie 细头记号笔（混色）', size: '12 支', was: 16.1, now: 9.5, emoji: '🖊️', image: null },
  { store: 'Coles', name: 'Cetaphil 温和泡沫洁面乳', size: '236mL', was: 19.5, now: 11.7, emoji: '🧴', image: null },
]

// 计算节省金额、折扣百分比并生成唯一 id
export function normalize(list) {
  return list
    .filter((p) => p && p.name && p.was > 0 && p.now > 0 && p.now < p.was)
    .map((p, i) => {
      const saved = +(p.was - p.now).toFixed(2)
      const percentOff = Math.round((saved / p.was) * 100)
      return {
        id: p.id ?? i + 1,
        store: p.store,
        name: p.name,
        size: p.size || '',
        was: p.was,
        now: p.now,
        emoji: p.emoji || '🛒',
        image: p.image || null,
        saved,
        percentOff,
      }
    })
}

export const fallbackProducts = normalize(fallbackRaw)

// 运行时拉取实时数据；失败则回退到内置快照
export async function loadProducts() {
  try {
    const url = `${import.meta.env.BASE_URL}products.json`
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const products = normalize(data.products || [])
    if (!products.length) throw new Error('空数据')
    return { products, updatedAt: data.updatedAt || null, live: true }
  } catch (err) {
    console.warn('实时特价加载失败，使用内置快照:', err.message)
    return { products: fallbackProducts, updatedAt: null, live: false }
  }
}

export default fallbackProducts
