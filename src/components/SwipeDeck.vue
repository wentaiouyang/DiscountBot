<script setup>
import { ref, computed } from 'vue'
import SwipeCard from './SwipeCard.vue'

const props = defineProps({
  products: { type: Array, required: true },
})
const emit = defineEmits(['like', 'nope', 'finished'])

const index = ref(0)
const topCardRef = ref(null)

// 只渲染顶部 3 张，营造卡堆
const visible = computed(() =>
  props.products.slice(index.value, index.value + 3)
)

const remaining = computed(() => props.products.length - index.value)
const done = computed(() => index.value >= props.products.length)

function handleSwiped({ dir, product }) {
  if (dir === 'right') emit('like', product)
  else emit('nope', product)
  index.value++
  if (index.value >= props.products.length) emit('finished')
}

function setTopRef(el) {
  topCardRef.value = el
}

// 按钮触发：调用顶部卡片的 fly
function buttonSwipe(dir) {
  topCardRef.value?.fly?.(dir)
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
          :ref="i === 0 ? setTopRef : undefined"
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
.actions :deep(.v-btn) { transition: transform .12s ease; }
.actions :deep(.v-btn:active) { transform: scale(.88); }
/* 加入按钮轻微呼吸，引导用户点击 */
.btn-like { animation: like-pulse 2.4s ease-in-out infinite; }
@keyframes like-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, .0); }
  50%      { box-shadow: 0 0 0 8px rgba(46, 204, 113, .12); }
}
.counter {
  font-size: 13px;
  color: #888;
  min-width: 64px;
  text-align: center;
}
.btn-like {
  background: #2ecc71 !important;
  color: #fff !important;
}
.btn-nope {
  background: #ff4d6d !important;
  color: #fff !important;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
  padding: 24px;
}
.empty { animation: deck-in .45s cubic-bezier(.18,.89,.32,1.28) both; }
.empty-emoji { font-size: 64px; animation: pop-bounce .6s cubic-bezier(.18,.89,.32,1.28) both; }
.empty-title { font-size: 22px; font-weight: 800; margin-top: 8px; }
.empty-sub { color: #888; margin-top: 6px; }
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
