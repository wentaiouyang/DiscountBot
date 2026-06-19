// 轻量双语（英文 / 中文），默认英文。无第三方依赖：一个共享的 lang ref + t() 字典。
// 在模板里调用 t('key') 会读取 lang.value，因此切换语言时模板自动重渲染。
import { ref } from 'vue'

const stored = localStorage.getItem('ss-lang')
export const lang = ref(stored === 'zh' ? 'zh' : 'en') // 默认英文

export function setLang(l) {
  lang.value = l === 'zh' ? 'zh' : 'en'
  localStorage.setItem('ss-lang', lang.value)
  document.documentElement.lang = lang.value === 'zh' ? 'zh-CN' : 'en'
}
export function toggleLang() {
  setLang(lang.value === 'en' ? 'zh' : 'en')
}
// 初始化 <html lang>
document.documentElement.lang = lang.value === 'zh' ? 'zh-CN' : 'en'

const messages = {
  en: {
    all: 'All',
    loading: 'Loading live specials…',
    liveUpdated: 'Live specials · updated {date}',
    offline: 'Offline snapshot',
    trackBanner: '🔔 {n} tracked item(s) on sale now',
    savedPrefix: 'Saved',
    viewList: 'View list',
    keepSwiping: 'Keep swiping',
    langAria: 'Switch language',
    trackAria: 'Tracked items',
    themeToLight: 'Switch to light mode',
    themeToDark: 'Switch to dark mode',
    // deck
    allDone: 'All done!',
    allDoneSub: 'Check your list and tally your savings',
    skip: 'Skip',
    add: 'Add',
    remaining: '{n} left',
    // card
    stampAdd: 'ADD',
    stampSkip: 'SKIP',
    save: 'Save',
    trackOn: 'Track this item',
    trackOff: 'Untrack',
    // shopping list
    shoppingList: 'Shopping List',
    clear: 'Clear',
    listEmpty: 'Swipe right to add items 👉',
    total: 'Total',
    wasPrefix: 'Was',
    savedTotal: 'Saved ${amt} ({pct}%)',
    markPicked: 'Mark as picked',
    remove: 'Remove',
    // tracked list
    tracked: 'Tracked',
    onSaleCount: '{n} on sale',
    trackedEmpty: 'Tap 🔔 while swiping to track items. You’ll be reminded here when they go on sale again.',
    notOnSale: 'Not on sale this week',
    addToList: 'Add to list',
    untrack: 'Untrack',
    // sections
    sec_produce: 'Produce',
    sec_bakery: 'Bakery',
    sec_meat: 'Meat & Seafood',
    sec_dairy: 'Dairy & Eggs',
    sec_pantry: 'Pantry',
    sec_snacks: 'Snacks & Sweets',
    sec_drinks: 'Drinks',
    sec_frozen: 'Frozen',
    sec_health: 'Health & Beauty',
    sec_household: 'Household',
    sec_other: 'Other',
  },
  zh: {
    all: '全部',
    loading: '正在加载实时特价…',
    liveUpdated: '实时特价 · 更新于 {date}',
    offline: '离线快照',
    trackBanner: '🔔 {n} 件追踪商品正在打折',
    savedPrefix: '已省',
    viewList: '查看清单',
    keepSwiping: '继续滑',
    langAria: '切换语言',
    trackAria: '追踪商品',
    themeToLight: '切换到浅色模式',
    themeToDark: '切换到深色模式',
    allDone: '全部看完啦！',
    allDoneSub: '看看购物清单，结算省下的钱吧',
    skip: '跳过',
    add: '加入',
    remaining: '还剩 {n} 件',
    stampAdd: '加入',
    stampSkip: '跳过',
    save: '省',
    trackOn: '追踪这件商品',
    trackOff: '取消追踪',
    shoppingList: '购物清单',
    clear: '清空',
    listEmpty: '右滑商品即可加入这里 👉',
    total: '合计',
    wasPrefix: '原价',
    savedTotal: '共省 ${amt}（{pct}%）',
    markPicked: '标记已拿',
    remove: '删除',
    tracked: '追踪商品',
    onSaleCount: '{n} 在打折',
    trackedEmpty: '滑卡时点 🔔 追踪商品，它再次打折时这里会提醒你。',
    notOnSale: '本周不在售',
    addToList: '加入清单',
    untrack: '取消追踪',
    sec_produce: '生鲜果蔬',
    sec_bakery: '烘焙面包',
    sec_meat: '肉禽海鲜',
    sec_dairy: '乳制品·蛋',
    sec_pantry: '干货调味',
    sec_snacks: '零食糖果',
    sec_drinks: '饮料酒水',
    sec_frozen: '冷冻食品',
    sec_health: '个护美妆',
    sec_household: '家居清洁',
    sec_other: '其他',
  },
}

export function t(key, vars) {
  const dict = messages[lang.value] || messages.en
  let s = dict[key] ?? messages.en[key] ?? key
  if (vars) for (const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, vars[k])
  return s
}

// 本地化日期标签（顶栏「更新于」）
export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (lang.value === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}
