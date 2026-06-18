// 真实打折数据，抓取自 2026-06-17~23 当周 Woolworths / Coles 特价
// 来源：Woolworths/Coles 周特价目录 + Grocerize 比价数据（详见 README）
// 图片：Woolworths 商品使用官方 CDN 图（cdn0.woolworths.media），其余用渐变 + emoji 兜底。
//
// 字段说明：
//   store  门店：'Woolworths' | 'Coles'
//   name   商品名
//   size   规格
//   was    原价（AUD）
//   now    特价（AUD）
//   emoji  无图时的占位图标
//   image  官方商品图 URL（可为 null）

const WOOLIES_IMG = (code) =>
  `https://cdn0.woolworths.media/content/wowproductimages/large/${code}.jpg`

const raw = [
  // ——— Woolworths：官方目录图片 ———
  { store: 'Woolworths', name: 'Head & Shoulders 去屑洗发水（清爽控油）', size: '850mL', was: 26.0, now: 13.0, emoji: '🧴', image: WOOLIES_IMG('583454') },
  { store: 'Woolworths', name: 'Cadbury 牛奶椰丝脆巧克力排块', size: '180g', was: 8.0, now: 4.0, emoji: '🍫', image: WOOLIES_IMG('815197') },
  { store: 'Woolworths', name: "Leggo's 奶油油浸番茄大蒜焗意面酱", size: '500g', was: 5.5, now: 4.3, emoji: '🍝', image: WOOLIES_IMG('452061') },
  { store: 'Woolworths', name: 'Cadbury Cherry Ripe 双层黑巧克力棒', size: '40g', was: 4.0, now: 3.0, emoji: '🍫', image: WOOLIES_IMG('610117') },
  { store: 'Woolworths', name: "Smith's 经典波浪番茄味薯片", size: '150g', was: 5.0, now: 2.0, emoji: '🍟', image: WOOLIES_IMG('6020914') },
  { store: 'Woolworths', name: 'The Natural Confectionery Co. 巨型软糖蛇', size: '170g', was: 5.0, now: 2.5, emoji: '🐍', image: WOOLIES_IMG('6073819') },

  // ——— Woolworths：本周最大折扣（Grocerize 比价） ———
  { store: 'Woolworths', name: 'Solo 无糖柠檬汽水 易拉罐', size: '375mL x 24', was: 39.5, now: 21.0, emoji: '🥤', image: null },
  { store: 'Woolworths', name: 'Pepsi Max 无糖可乐 易拉罐', size: '375mL x 24', was: 39.5, now: 21.0, emoji: '🥤', image: null },
  { store: 'Woolworths', name: 'Ferrero 费列罗精选巧克力礼盒', size: '15 颗 / 172g', was: 21.0, now: 10.5, emoji: '🍫', image: null },
  { store: 'Woolworths', name: 'Cadbury 迷你卷 树莓味', size: '5 个 / 125g', was: 6.9, now: 3.9, emoji: '🍫', image: null },
  { store: 'Woolworths', name: 'Cadbury 牛奶巧克力蛋糕棒', size: '105g', was: 6.9, now: 3.9, emoji: '🍫', image: null },
  { store: 'Woolworths', name: 'Cadbury 迷你卷 巧克力味', size: '5 个 / 115g', was: 6.9, now: 3.9, emoji: '🍫', image: null },

  // ——— Coles：本周最大折扣（Grocerize 比价） ———
  { store: 'Coles', name: 'Pacific West 冷冻迷你春卷', size: '1kg', was: 12.9, now: 7.5, emoji: '🥟', image: null },
  { store: 'Coles', name: 'Vittoria Espresso Magic 咖啡粉', size: '500g', was: 37.9, now: 22.0, emoji: '☕', image: null },
  { store: 'Coles', name: 'Vittoria Supreme 咖啡豆', size: '500g', was: 37.9, now: 22.0, emoji: '☕', image: null },
  { store: 'Coles', name: 'Pyrex 量杯', size: '500mL', was: 11.0, now: 6.5, emoji: '🥛', image: null },
  { store: 'Coles', name: 'Sharpie 细头记号笔（混色）', size: '12 支', was: 16.1, now: 9.5, emoji: '🖊️', image: null },
  { store: 'Coles', name: "Pyrex Let's Share 玻璃烤盘", size: '4L', was: 23.0, now: 13.8, emoji: '🍲', image: null },
  { store: 'Coles', name: 'Pyrex Iconics 玻璃碗', size: '3L', was: 16.5, now: 9.9, emoji: '🥣', image: null },
  { store: 'Coles', name: 'Cetaphil 温和泡沫洁面乳', size: '236mL', was: 19.5, now: 11.7, emoji: '🧴', image: null },
]

// 计算节省金额与折扣百分比，并生成唯一 id
export const products = raw.map((p, i) => {
  const saved = +(p.was - p.now).toFixed(2)
  const percentOff = Math.round((saved / p.was) * 100)
  return { id: i + 1, ...p, saved, percentOff }
})

export default products
