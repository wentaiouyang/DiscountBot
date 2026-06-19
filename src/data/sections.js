// 按商品名把商品归到「卖场区域」，用于购物清单分区 + 走店路线。
//
// 说明：超市真实货架号是门店专属、不公开的（官方接口只给「品类」而非物理货架），
// 所以这里用商品名关键词做启发式归类 —— 零额外请求、前端即可、两家店通用。
// 不是精确门店导航，但足以把清单按区域分组、按逛店顺序排出一条路线。

// 区域按「逛店顺序」排列（生鲜在入口、冷冻和日用靠结账区）。
// 显示名走 i18n（key 形如 sec_produce），这里只保留 key + emoji。
export const SECTIONS = [
  { key: 'produce',   emoji: '🥬' },
  { key: 'bakery',    emoji: '🍞' },
  { key: 'meat',      emoji: '🥩' },
  { key: 'dairy',     emoji: '🧀' },
  { key: 'pantry',    emoji: '🥫' },
  { key: 'snacks',    emoji: '🍫' },
  { key: 'drinks',    emoji: '🥤' },
  { key: 'frozen',    emoji: '🧊' },
  { key: 'health',    emoji: '🧴' },
  { key: 'household', emoji: '🧻' },
  { key: 'other',     emoji: '🛒' },
]

const SECTION_META = Object.fromEntries(SECTIONS.map((s) => [s.key, s]))
export function sectionMeta(key) {
  return SECTION_META[key] || SECTION_META.other
}

// 匹配优先级（越靠前越优先；带修饰词的先判，例如「冷冻/果汁」要先于「蔬果」）。
const RULES = [
  ['frozen',    /frozen|ice ?cream|gelato/i],
  ['bakery',    /bread|crumpet|\bbun\b|bakery|muffin|bagel|croissant|\bcake\b|pastry|donut|doughnut|wrap\b/i],
  ['meat',      /beef|steak|mince|\blamb\b|pork|chicken|poultry|bacon|sausage|\bham\b|fish|salmon|tuna|seafood|prawn|\bmeat\b/i],
  // 零食/巧克力放在乳制品之前：避免「Cadbury Dairy Milk」因含 milk 被归到乳制品
  ['snacks',    /choc|cadbury|lindt|kitkat|m&m|chip|crisp|pringles|doritos|biscuit|cookie|cracker|lolly|lollies|gummy|candy|confection|\bnuts?\b|popcorn|muesli bar|\bbar\b|snack/i],
  ['dairy',     /milk|cheese|yoghurt|yogurt|butter|\bcream\b|\beggs?\b|dairy|custard/i],
  ['drinks',    /soft drink|\bcola\b|pepsi|coke|\bsolo\b|lemonade|soda|juice|\bwater\b|coffee|espresso|\btea\b|wine|beer|\bgin\b|vodka|whisky|spirit|cordial|energy drink|gatorade|powerade|kombucha|\bdrink\b/i],
  ['health',    /shampoo|conditioner|\bhair\b|\bsoap\b|body wash|\bskin\b|lip balm|cetaphil|moistur|deodorant|toothpaste|\btooth\b|razor|shave|sanitary|tampon|panadol|nurofen|vitamin|sunscreen|\bface\b|cosmetic|makeup/i],
  ['household', /laundry|detergent|fabric soft|dishwash|cleaner|cleaning|toilet paper|paper towel|tissue|napkin|garbage|bin liner|\bfoil\b|cling|battery|bleach|spray\b/i],
  ['pantry',    /pasta|spaghetti|noodle|\brice\b|sauce|cereal|oats|flour|sugar|\boil\b|vinegar|\bcan\b|tinned|soup|beans|honey|\bjam\b|spread|condiment|stock|seasoning|spice|sauce|nutella|vegemite/i],
  ['produce',   /apple|banana|avocado|tomato|lettuce|spinach|carrot|potato|onion|capsicum|broccoli|grape|orange|lemon|\blime\b|berry|berries|mushroom|cucumber|salad|herb|\bfruit\b|vegetable|\bveg\b|fresh produce/i],
]

export function sectionFor(name = '') {
  for (const [key, re] of RULES) if (re.test(name)) return key
  return 'other'
}
