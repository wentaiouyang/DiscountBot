<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useDisplay, useTheme } from 'vuetify'
import { loadProducts, fallbackProducts } from './data/products.js'
import SwipeDeck from './components/SwipeDeck.vue'
import ShoppingList from './components/ShoppingList.vue'

const { mobile } = useDisplay()

/* ---- 主题（浅色 / 深色）---- */
const vTheme = useTheme()
const stored = localStorage.getItem('ss-theme')
// 默认深色（炭黑高对比为主视觉）；用户手动切换后记忆其选择
const isDark = ref(stored ? stored === 'dark' : true)

function applyTheme(dark) {
  const name = dark ? 'dark' : 'light'
  if (typeof vTheme.change === 'function') vTheme.change(name)
  else vTheme.global.name.value = name
  document.documentElement.dataset.theme = name
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', dark ? '#0A0A0D' : '#ECEEF2'))
}
watch(isDark, (v) => {
  applyTheme(v)
  localStorage.setItem('ss-theme', v ? 'dark' : 'light')
})
applyTheme(isDark.value)

const filter = ref('all') // all | Coles | Woolworths
const deck = ref(null)
const sheet = ref(false) // 移动端购物清单抽屉

/* ---- 主题强调色：随门店切换（全部=暖橙 / Coles=红 / Woolies=绿）---- */
const ACCENTS = {
  all:        { c: '#F2740C', c2: '#FF9D44' },
  Coles:      { c: '#E5231B', c2: '#FF5A4D' },
  Woolworths: { c: '#178841', c2: '#3FB36B' },
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
function applyAccent(store) {
  const { c, c2 } = ACCENTS[store] || ACCENTS.all
  const rgb = hexToRgb(c)
  const root = document.documentElement.style
  root.setProperty('--accent', c)
  root.setProperty('--accent-grad', `linear-gradient(135deg, ${c2} 0%, ${c} 100%)`)
  root.setProperty('--accent-glow', `0 8px 22px rgba(${rgb}, 0.34)`)
  root.setProperty('--accent-soft', `rgba(${rgb}, 0.18)`)
}

// 商品数据：先用内置快照秒开，再异步换成「每周定时抓取」的实时特价
const allProducts = ref(fallbackProducts)
const dataUpdatedAt = ref(null)
const dataLive = ref(false)
const loading = ref(true)

onMounted(async () => {
  const { products, updatedAt, live } = await loadProducts()
  allProducts.value = products
  dataUpdatedAt.value = updatedAt
  dataLive.value = live
  loading.value = false
})

const updatedLabel = computed(() => {
  if (!dataUpdatedAt.value) return ''
  const d = new Date(dataUpdatedAt.value)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

// PWA 全面屏：测量顶部安全区高度，把顶栏整体下移，避免被系统状态栏/灵动岛遮挡。
// 用探针元素读取已解析的 px 值（env() 写进 CSS 变量后用 getComputedStyle 读取并不可靠）。
const safeTop = ref(0)
function measureSafeTop() {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'
  document.body.appendChild(probe)
  safeTop.value = Math.round(parseFloat(getComputedStyle(probe).paddingTop)) || 0
  probe.remove()
}
onMounted(() => {
  measureSafeTop()
  // 首帧 env() 偶尔尚未稳定（尤其 iOS 加入主屏后），下一帧再量一次；旋转/尺寸变化也重量
  requestAnimationFrame(measureSafeTop)
  window.addEventListener('resize', measureSafeTop)
  window.addEventListener('orientationchange', measureSafeTop)
})
// 在安全区之外再留一点呼吸间距，避免品牌/按钮紧贴状态栏与灵动岛（仅在有刘海/全面屏时生效）
const TOP_BREATHING = 10
const topInset = computed(() => (safeTop.value > 0 ? safeTop.value + TOP_BREATHING : 0))
const barHeight = computed(() => 64 + topInset.value)

const filtered = computed(() => {
  if (filter.value === 'all') return allProducts.value
  return allProducts.value.filter((p) => p.store === filter.value)
})

const cart = ref([])
const cartTotal = computed(() => cart.value.reduce((s, p) => s + p.now, 0))
const cartSaved = computed(() => cart.value.reduce((s, p) => s + p.saved, 0))

function addToCart(p) {
  if (!cart.value.find((x) => x.id === p.id)) cart.value.push(p)
}
function removeFromCart(p) {
  cart.value = cart.value.filter((x) => x.id !== p.id)
}
function clearCart() {
  cart.value = []
}
function setFilter(v) {
  filter.value = v
  applyAccent(v)
  // 切换数据源后重置卡堆
  requestAnimationFrame(() => deck.value?.reset())
}

applyAccent(filter.value)
</script>

<template>
  <v-app>
    <!-- 顶栏 -->
    <v-app-bar
      flat
      color="transparent"
      class="topbar"
      :height="barHeight"
      :style="{ paddingTop: topInset + 'px' }"
    >
      <div class="brand">
        <span class="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 4h2l2.4 12.3a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6" />
            <circle cx="9.5" cy="20" r="1.3" fill="#fff" stroke="none" />
            <circle cx="18" cy="20" r="1.3" fill="#fff" stroke="none" />
          </svg>
        </span>
        <span class="brand-name">Swipe<b>Specials</b></span>
      </div>
      <v-spacer />
      <div class="filter-pills">
        <button :class="{ on: filter === 'all' }" @click="setFilter('all')">全部</button>
        <button :class="{ on: filter === 'Coles', coles: true }" @click="setFilter('Coles')">Coles</button>
        <button :class="{ on: filter === 'Woolworths', woolies: true }" @click="setFilter('Woolworths')">Woolies</button>
      </div>
      <button
        class="theme-toggle"
        :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
        :aria-pressed="isDark"
        @click="isDark = !isDark"
      >
        <v-icon size="20">{{ isDark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
      </button>
    </v-app-bar>

    <v-main class="main">
      <div class="layout" :class="{ desktop: !mobile }">
        <!-- 滑卡区 -->
        <section class="deck-col">
          <p class="data-status" :class="{ live: dataLive && !loading, offline: !dataLive && !loading }">
            <span class="status-dot"></span>
            <template v-if="loading">正在加载实时特价…</template>
            <template v-else-if="dataLive">实时特价 · 更新于 {{ updatedLabel }}</template>
            <template v-else>离线快照</template>
          </p>
          <SwipeDeck
            ref="deck"
            :key="filter + ':' + allProducts.length"
            :products="filtered"
            @like="addToCart"
            @nope="() => {}"
          />
        </section>

        <!-- 桌面端：右侧购物清单 -->
        <aside v-if="!mobile" class="list-col">
          <ShoppingList :items="cart" @remove="removeFromCart" @clear="clearCart" />
        </aside>
      </div>
    </v-main>

    <!-- 移动端：底部结算条 -->
    <div v-if="mobile" class="mobile-bar" @click="sheet = true">
      <div class="mb-left">
        <v-icon>mdi-cart</v-icon>
        <span class="mb-count">{{ cart.length }}</span>
      </div>
      <div class="mb-mid">
        <div class="mb-total">${{ cartTotal.toFixed(2) }}</div>
        <div class="mb-saved">已省 ${{ cartSaved.toFixed(2) }}</div>
      </div>
      <v-btn class="mb-cta" variant="flat" rounded>查看清单</v-btn>
    </div>

    <!-- 移动端：购物清单抽屉 -->
    <v-bottom-sheet v-model="sheet">
      <div class="sheet">
        <ShoppingList :items="cart" @remove="removeFromCart" @clear="clearCart" />
        <v-btn block class="sheet-cta mt-3" @click="sheet = false">继续滑</v-btn>
      </div>
    </v-bottom-sheet>
  </v-app>
</template>

<style scoped>
/* 顶栏：半透明毛玻璃，悬浮在渐变背景之上 */
.topbar {
  background: color-mix(in srgb, var(--surface) 72%, transparent) !important;
  backdrop-filter: saturate(160%) blur(16px);
  -webkit-backdrop-filter: saturate(160%) blur(16px);
  border-bottom: 1px solid var(--border);
}
/* 顶部加了安全区 padding 后，内容行保持标准高度并贴在底部，确保可点击 */
.topbar :deep(.v-toolbar__content) { height: 64px !important; }

.brand { display: flex; align-items: center; gap: 10px; padding-left: 16px; }
.logo {
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: var(--accent-grad);
  box-shadow: var(--shadow-pop), inset 0 1px 0 rgba(255,255,255,.35);
}
.brand-name {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.6px;
  color: var(--text);
}
.brand-name b {
  font-weight: 700;
  background: var(--accent-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.filter-pills { display: flex; gap: 6px; }
.filter-pills button {
  font-family: var(--font-display);
  border: 1.5px solid var(--border-strong);
  background: var(--surface-2);
  border-radius: 10px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: var(--text-muted);
  cursor: pointer;
  transition: transform .15s ease, background .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease;
}
.filter-pills button:hover { border-color: var(--text-faint); transform: translateY(-1px); }
.filter-pills button:active { transform: scale(.92); }
.filter-pills button.on:hover { transform: translateY(-1px); }
.filter-pills button.on {
  background: var(--accent-grad);
  color: #fff;
  border-color: transparent;
  box-shadow: var(--shadow-pop);
}
.filter-pills button.coles.on { background: var(--coles); box-shadow: 0 8px 20px rgba(229,35,27,.35); }
.filter-pills button.woolies.on { background: var(--woolies); box-shadow: 0 8px 20px rgba(23,136,65,.35); }

/* 主题切换按钮 */
.theme-toggle {
  margin: 0 16px 0 10px;
  width: 38px; height: 38px;
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 10px;
  border: 1.5px solid var(--border-strong);
  background: var(--surface-2);
  color: var(--text-muted);
  cursor: pointer;
  transition: transform .15s ease, color .2s ease, border-color .2s ease;
}
.theme-toggle:hover { color: var(--text); border-color: var(--text-faint); }
.theme-toggle:active { transform: scale(.9) rotate(18deg); }

.main { background: transparent; position: relative; z-index: 1; }
.layout {
  max-width: 1080px;
  margin: 0 auto;
  padding: 18px 16px 24px;
}
.layout.desktop {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 28px;
  align-items: start;
  padding-top: 30px;
}
.deck-col { display: flex; flex-direction: column; align-items: center; }
.hint {
  font-family: var(--font-display);
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 6px;
  animation: hint-fade .5s ease both;
}
@keyframes hint-fade {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.data-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 4px 12px;
  margin: 0 0 16px;
  letter-spacing: .2px;
  transition: opacity .3s ease;
}
.status-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--text-faint);
  flex-shrink: 0;
}
.data-status.live .status-dot {
  background: var(--like);
  box-shadow: 0 0 0 0 rgba(18,184,119,.5);
  animation: dot-pulse 2s ease-in-out infinite;
}
.data-status.offline .status-dot { background: var(--save-text); }
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(18,184,119,.45); }
  50%      { box-shadow: 0 0 0 5px rgba(18,184,119,0); }
}
@media (prefers-reduced-motion: reduce) {
  .logo, .data-status.live .status-dot, .mobile-bar { animation: none; }
}
.list-col { height: calc(100vh - 64px - 56px); position: sticky; top: 92px; }

/* 移动端结算条 */
.mobile-bar {
  position: fixed;
  left: 12px; right: 12px;
  /* 适配底部安全区（home 指示条 / 手势条） */
  bottom: calc(12px + var(--safe-bottom, 0px));
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: saturate(160%) blur(14px);
  -webkit-backdrop-filter: saturate(160%) blur(14px);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-card);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px 10px 16px;
  z-index: 50;
  cursor: pointer;
  animation: bar-rise .35s cubic-bezier(.18,.89,.32,1.28) both;
  transition: transform .15s ease;
}
.mobile-bar:active { transform: scale(.985); }
@keyframes bar-rise {
  from { opacity: 0; transform: translateY(120%); }
  to   { opacity: 1; transform: translateY(0); }
}
.mb-left { position: relative; display: flex; align-items: center; color: var(--text); }
.mb-count {
  position: absolute; top: -8px; right: -12px;
  background: var(--accent-grad); color: #fff; font-size: 11px; font-weight: 800;
  border-radius: 999px; padding: 0 6px; min-width: 18px; text-align: center;
  box-shadow: var(--shadow-pop);
}
.mb-mid { flex: 1; }
.mb-total {
  font-family: var(--font-display);
  font-weight: 700; font-size: 20px; line-height: 1; color: var(--text);
  font-variant-numeric: tabular-nums;
}
.mb-saved { color: var(--like); font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
.mb-cta {
  font-family: var(--font-display) !important;
  font-weight: 600 !important;
  background: var(--accent-grad) !important;
  color: #fff !important;
  box-shadow: var(--shadow-pop);
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.sheet {
  padding: 14px;
  padding-bottom: calc(14px + var(--safe-bottom, 0px));
  max-height: 80vh;
  background: var(--surface);
  border-radius: 24px 24px 0 0;
}
.sheet-cta {
  font-family: var(--font-display) !important;
  font-weight: 600 !important;
  background: var(--accent-grad) !important;
  color: #fff !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

/* ---- 移动端字体与间距优化 ---- */
@media (max-width: 600px) {
  /* 去掉 v-app-bar 默认左右 16px 内边距，把空间让给品牌名 + 筛选按钮，避免顶栏溢出 */
  .topbar :deep(.v-toolbar__content) { padding: 0 !important; }
  .brand { padding-left: 12px; }
  .brand-name { font-size: 16px; }
  .logo { font-size: 22px; }
  .filter-pills {
    gap: 5px;
    padding-right: 12px;
    flex-shrink: 0;        /* 筛选按钮不被压缩 */
  }
  .filter-pills button { padding: 5px 10px; font-size: 12px; white-space: nowrap; }

  .layout { padding: 14px 12px 96px; }  /* 给底部结算条留出空间 */
  .hint { font-size: 14px; margin-bottom: 12px; }

  .mb-total { font-size: 19px; }
  .mb-saved { font-size: 13px; }
  .mb-count { font-size: 12px; }
}

/* 超窄屏（小手机）：隐藏品牌文字，仅留购物车图标，确保筛选按钮完整显示 */
@media (max-width: 380px) {
  .brand-name { display: none; }
}
</style>
