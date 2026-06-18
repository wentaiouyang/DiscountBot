<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import allProducts from './data/products.js'
import SwipeDeck from './components/SwipeDeck.vue'
import ShoppingList from './components/ShoppingList.vue'

const { mobile } = useDisplay()

const filter = ref('all') // all | Coles | Woolworths
const deck = ref(null)
const sheet = ref(false) // 移动端购物清单抽屉

const filtered = computed(() => {
  if (filter.value === 'all') return allProducts
  return allProducts.filter((p) => p.store === filter.value)
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
    <v-app-bar flat color="surface" class="topbar">
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
          <SwipeDeck
            ref="deck"
            :key="filter"
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
.brand { display: flex; align-items: center; gap: 8px; padding-left: 16px; }
.logo { font-size: 24px; }
.brand-name { font-size: 19px; font-weight: 500; }
.brand-name b { font-weight: 800; }

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
  transition: all .15s;
}
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
.hint { color: #999; font-size: 13px; margin-bottom: 14px; }
.list-col { height: calc(100vh - 64px - 56px); position: sticky; top: 84px; }

/* 移动端结算条 */
.mobile-bar {
  position: fixed;
  left: 12px; right: 12px; bottom: 12px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0,0,0,.16);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  z-index: 50;
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

.sheet { padding: 14px; max-height: 80vh; }
</style>
