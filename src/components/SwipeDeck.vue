<script setup>
import { ref, computed } from 'vue'
import SwipeCard from './SwipeCard.vue'

const props = defineProps({
  products: { type: Array, required: true },
  // 已追踪商品的 id 集合
  trackedIds: { type: Object, default: () => new Set() },
})
const emit = defineEmits(['like', 'nope', 'finished', 'track'])

const index = ref(0)

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
          :product="p"
          :active="i === 0"
          :depth="i"
          :tracked="trackedIds.has(p.id)"
          @swiped="handleSwiped"
          @track="emit('track', p)"
        />
      </template>

      <div v-else class="empty">
        <div class="empty-emoji">🎉</div>
        <div class="empty-title">全部看完啦！</div>
        <div class="empty-sub">看看右边的购物清单，结算省下的钱吧</div>
      </div>
    </div>

    <!-- 滑动提示 + 剩余计数（左滑跳过 / 右滑加入） -->
    <div v-if="!done" class="swipe-hint">
      <span class="hint-side nope">← 跳过</span>
      <span class="counter">还剩 {{ remaining }} 件</span>
      <span class="hint-side like">加入 →</span>
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
.swipe-hint {
  display: flex;
  align-items: center;
  gap: 14px;
  animation: deck-in .5s .08s cubic-bezier(.18,.89,.32,1.28) both;
}
/* 纯文字提示，不带边框/背景，避免被误当作可点击按钮 */
.hint-side {
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: .2px;
}
.hint-side.nope { color: var(--nope); }
.hint-side.like { color: var(--like); }
.counter {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: center;
  font-variant-numeric: tabular-nums;
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
  .deck, .swipe-hint, .empty, .empty-emoji { animation: none; }
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
