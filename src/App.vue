<script setup>
import { ref, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { loadProducts, fallbackProducts } from './data/products.js'
import SwipeDeck from './components/SwipeDeck.vue'
import ShoppingList from './components/ShoppingList.vue'

const { mobile } = useDisplay()

const filter = ref('all') // all | Coles | Woolworths
const deck = ref(null)
const sheet = ref(false) // 移动端购物清单抽屉

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
onMounted(() => {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)'
  document.body.appendChild(probe)
  safeTop.value = Math.round(parseFloat(getComputedStyle(probe).paddingTop)) || 0
  probe.remove()
})
const barHeight = computed(() => 64 + safeTop.value)

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
  // 切换数据源后重置卡堆
  requestAnimationFrame(() => deck.value?.reset())
}
</script>

<template>
  <v-app>
    <!-- 顶栏 -->
    <v-app-bar
      flat
      color="surface"
      class="topbar"
      :height="barHeight"
      :style="{ paddingTop: safeTop + 'px' }"
    >
      <div class="brand">
        <span class="logo">🛒</span>
        <span class="brand-name">Swipe<b>Specials</b></span>
      </div>
      <v-spacer />
      <div class="filter-pills">
        <button :class="{ on: filter === 'all' }" @click="setFilter('all')">全部</button>
        <button :class="{ on: filter === 'Coles', coles: true }" @click="setFilter('Coles')">Coles</button>
        <button :class="{ on: filter === 'Woolworths', woolies: true }" @click="setFilter('Woolworths')">Woolies</button>
      </div>
    </v-app-bar>

    <v-main class="main">
      <div class="layout" :class="{ desktop: !mobile }">
        <!-- 滑卡区 -->
        <section class="deck-col">
          <p class="hint">👈 左滑跳过　·　右滑加入清单 👉</p>
          <p class="data-status">
            <template v-if="loading">⏳ 正在加载实时特价…</template>
            <template v-else-if="dataLive">🟢 实时特价 · 更新于 {{ updatedLabel }}</template>
            <template v-else>📦 离线快照</template>
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
      <v-btn color="primary" variant="flat" rounded>查看清单</v-btn>
    </div>

    <!-- 移动端：购物清单抽屉 -->
    <v-bottom-sheet v-model="sheet">
      <div class="sheet">
        <ShoppingList :items="cart" @remove="removeFromCart" @clear="clearCart" />
        <v-btn block color="primary" class="mt-3" @click="sheet = false">继续滑</v-btn>
      </div>
    </v-bottom-sheet>
  </v-app>
</template>

<style scoped>
.topbar { border-bottom: 1px solid #ececec; }
/* 顶部加了安全区 padding 后，内容行保持标准高度并贴在底部，确保可点击 */
.topbar :deep(.v-toolbar__content) { height: 64px !important; }
.brand { display: flex; align-items: center; gap: 8px; padding-left: 16px; }
.logo { font-size: 24px; }
.brand-name { font-size: 19px; font-weight: 500; }
.brand-name b { font-weight: 800; }
.logo { display: inline-block; animation: cart-bob 2.6s ease-in-out infinite; }
@keyframes cart-bob {
  0%, 100% { transform: translateY(0) rotate(0); }
  50%      { transform: translateY(-2px) rotate(-6deg); }
}

.filter-pills { display: flex; gap: 6px; padding-right: 16px; }
.filter-pills button {
  border: 1.5px solid #ddd;
  background: #fff;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: transform .15s ease, background .2s ease, color .2s ease, border-color .2s ease;
}
.filter-pills button:active { transform: scale(.92); }
.filter-pills button.on { background: #111; color: #fff; border-color: #111; }
.filter-pills button.coles.on { background: #E5231B; border-color: #E5231B; }
.filter-pills button.woolies.on { background: #178841; border-color: #178841; }

.main { background: #f3f1ec; }
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
  padding-top: 28px;
}
.deck-col { display: flex; flex-direction: column; align-items: center; }
.hint {
  color: #999;
  font-size: 13px;
  margin-bottom: 14px;
  animation: hint-fade .5s ease both;
}
@keyframes hint-fade {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.data-status {
  font-size: 12px;
  color: #aaa;
  margin: -8px 0 14px;
  letter-spacing: .2px;
  transition: opacity .3s ease;
}
.list-col { height: calc(100vh - 64px - 56px); position: sticky; top: 84px; }

/* 移动端结算条 */
.mobile-bar {
  position: fixed;
  left: 12px; right: 12px;
  /* 适配底部安全区（home 指示条 / 手势条） */
  bottom: calc(12px + var(--safe-bottom, 0px));
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0,0,0,.16);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
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
.mb-left { position: relative; }
.mb-count {
  position: absolute; top: -6px; right: -10px;
  background: #E5231B; color: #fff; font-size: 11px; font-weight: 700;
  border-radius: 999px; padding: 0 6px; min-width: 18px; text-align: center;
}
.mb-mid { flex: 1; }
.mb-total { font-weight: 800; font-size: 18px; line-height: 1; }
.mb-saved { color: #178841; font-size: 12px; font-weight: 700; }

.sheet {
  padding: 14px;
  padding-bottom: calc(14px + var(--safe-bottom, 0px));
  max-height: 80vh;
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
