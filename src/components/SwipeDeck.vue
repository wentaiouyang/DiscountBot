<script setup>
import { ref, computed } from 'vue'
import SwipeCard from './SwipeCard.vue'

const props = defineProps({
  products: { type: Array, required: true },
})
const emit = defineEmits(['like', 'nope', 'finished'])

const index = ref(0)

// 卡片实例按商品 id 索引，避免 v-for 函数 ref 在重排时拿到错误/失效的实例
const cardRefs = new Map()
function setCardRef(id, el) {
  if (el) cardRefs.set(id, el)
  else cardRefs.delete(id)
}

// 只渲染顶部 3 张，营造卡堆
const visible = computed(() =>
  props.products.slice(index.value, index.value + 3)
)

// 当前最顶层（可操作）的商品——唯一权威来源
const topProduct = computed(() => props.products[index.value] || null)

const remaining = computed(() => props.products.length - index.value)
const done = computed(() => index.value >= props.products.length)

// 不信任事件里携带的 product，统一以 topProduct 为准，杜绝「加错商品」
function handleSwiped({ dir }) {
  const product = topProduct.value
  if (!product) return
  if (dir === 'right') emit('like', product)
  else emit('nope', product)
  index.value++
  if (index.value >= props.products.length) emit('finished')
}

// 按钮触发：按 id 找到当前顶层卡片并执行飞出动画
function buttonSwipe(dir) {
  const top = topProduct.value
  if (top) cardRefs.get(top.id)?.fly?.(dir)
}

function reset() {
  index.value = 0
}
defineExpose({ reset })
</script>

<template>
  <div class="deck-wrap">
    <div class="deck">
      <template v-if="!done">
        <SwipeCard
          v-for="(p, i) in visible"
          :key="p.id"
          :ref="(el) => setCardRef(p.id, el)"
          :product="p"
          :active="i === 0"
          :depth="i"
          @swiped="handleSwiped"
        />
      </template>

      <div v-else class="empty">
        <div class="empty-emoji">🎉</div>
        <div class="empty-title">全部看完啦！</div>
        <div class="empty-sub">看看右边的购物清单，结算省下的钱吧</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!done" class="actions">
      <v-btn icon size="x-large" class="btn-nope" elevation="4" @click="buttonSwipe('left')">
        <v-icon size="32">mdi-close-thick</v-icon>
      </v-btn>
      <div class="counter">还剩 {{ remaining }} 件</div>
      <v-btn icon size="x-large" class="btn-like" elevation="4" @click="buttonSwipe('right')">
        <v-icon size="32">mdi-cart-plus</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.deck-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
}
.deck {
  position: relative;
  width: 100%;
  max-width: 360px;
  aspect-ratio: 3 / 4.4;
  animation: deck-in .45s cubic-bezier(.18,.89,.32,1.28) both;
}
@keyframes deck-in {
  from { opacity: 0; transform: translateY(14px) scale(.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.actions {
  display: flex;
  align-items: center;
  gap: 22px;
  animation: deck-in .5s .08s cubic-bezier(.18,.89,.32,1.28) both;
}
.actions :deep(.v-btn) { transition: transform .16s cubic-bezier(.18,.89,.32,1.28), box-shadow .2s ease; }
.actions :deep(.v-btn:active) { transform: scale(.88); }
/* 方向性手感：悬停时朝各自语义方向轻抬 */
.btn-nope:hover { transform: translateX(-3px) translateY(-2px); }
.btn-like:hover { transform: translateX(3px) translateY(-2px); }
@media (prefers-reduced-motion: reduce) {
  .btn-nope:hover, .btn-like:hover { transform: none; }
}
/* 加入按钮轻微呼吸，引导用户点击 */
.btn-like { animation: like-pulse 2.4s ease-in-out infinite; }
@keyframes like-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(18, 184, 119, .0); }
  50%      { box-shadow: 0 0 0 10px rgba(18, 184, 119, .14); }
}
.counter {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 68px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.btn-like {
  background: var(--grad-like) !important;
  color: #fff !important;
  box-shadow: 0 10px 24px -6px rgba(18,184,119,.5), inset 0 1.5px 0 rgba(255,255,255,.4) !important;
}
.btn-nope {
  background: var(--grad-nope) !important;
  color: #fff !important;
  box-shadow: 0 10px 24px -6px rgba(255,61,94,.45), inset 0 1.5px 0 rgba(255,255,255,.4) !important;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 26px;
  box-shadow: var(--shadow-card);
  padding: 24px;
}
.empty { animation: deck-in .45s cubic-bezier(.18,.89,.32,1.28) both; }
.empty-emoji { font-size: 64px; animation: pop-bounce .6s cubic-bezier(.18,.89,.32,1.28) both; }
.empty-title { font-family: var(--font-display); font-size: 23px; font-weight: 700; margin-top: 8px; color: var(--text); }
.empty-sub { color: var(--text-muted); margin-top: 6px; font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .btn-like, .deck, .actions, .empty, .empty-emoji { animation: none; }
}
@keyframes pop-bounce {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@media (max-width: 600px) {
  .counter { font-size: 14px; }
  .empty-title { font-size: 20px; }
  .empty-sub { font-size: 14px; }
}
</style>
