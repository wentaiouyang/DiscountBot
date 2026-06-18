<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  product: { type: Object, required: true },
  // 是否是最顶层可拖拽的卡片
  active: { type: Boolean, default: false },
  // 叠放层级（用于轻微缩放/位移营造卡堆效果）
  depth: { type: Number, default: 0 },
})

const emit = defineEmits(['swiped'])

const THRESHOLD = 110 // 触发滑动的位移阈值(px)

const dragging = ref(false)
const dx = ref(0)
const dy = ref(0)
const leaving = ref(false)
let startX = 0
let startY = 0
let pointerId = null

const imgError = ref(false)

const storeColor = computed(() =>
  props.product.store === 'Coles' ? '#E5231B' : '#178841'
)

// 拖动时卡片的变换（含旋转）
const cardStyle = computed(() => {
  if (leaving.value) return {} // 离场动画由 class 控制
  const rot = dx.value / 18
  const base = props.active ? 0 : props.depth
  if (!props.active) {
    return {
      transform: `translateY(${base * 10}px) scale(${1 - base * 0.04})`,
      transition: 'transform .25s ease',
    }
  }
  return {
    transform: `translate(${dx.value}px, ${dy.value}px) rotate(${rot}deg)`,
    transition: dragging.value ? 'none' : 'transform .35s cubic-bezier(.18,.89,.32,1.28)',
  }
})

const likeOpacity = computed(() => (dx.value > 0 ? Math.min(dx.value / THRESHOLD, 1) : 0))
const nopeOpacity = computed(() => (dx.value < 0 ? Math.min(-dx.value / THRESHOLD, 1) : 0))

function onPointerDown(e) {
  if (!props.active) return
  dragging.value = true
  startX = e.clientX
  startY = e.clientY
  pointerId = e.pointerId
  e.target.setPointerCapture?.(pointerId)
}

function onPointerMove(e) {
  if (!dragging.value) return
  dx.value = e.clientX - startX
  dy.value = e.clientY - startY
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  if (dx.value > THRESHOLD) return fly('right')
  if (dx.value < -THRESHOLD) return fly('left')
  // 回弹
  dx.value = 0
  dy.value = 0
}

// 飞出动画后通知父组件
function fly(dir) {
  leaving.value = true
  const offX = (dir === 'right' ? 1 : -1) * (window.innerWidth + 200)
  dx.value = offX
  setTimeout(() => emit('swiped', { dir, product: props.product }), 280)
}

// 暴露给父组件，让按钮也能触发滑动
defineExpose({ fly })
</script>

<template>
  <div
    class="swipe-card"
    :class="{ leaving }"
    :style="cardStyle"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- 图片 / 占位 -->
    <div class="card-media" :style="{ background: imgError || !product.image ? `linear-gradient(135deg, ${storeColor}22, ${storeColor}66)` : '#fff' }">
      <img
        v-if="product.image && !imgError"
        :src="product.image"
        :alt="product.name"
        draggable="false"
        @error="imgError = true"
      />
      <span v-else class="emoji">{{ product.emoji }}</span>

      <!-- 门店徽标 -->
      <div class="store-badge" :style="{ background: storeColor }">
        {{ product.store }}
      </div>

      <!-- 折扣角标 -->
      <div class="discount-badge">-{{ product.percentOff }}%</div>

      <!-- 滑动提示 -->
      <div class="stamp like" :style="{ opacity: likeOpacity }">加入 ❤</div>
      <div class="stamp nope" :style="{ opacity: nopeOpacity }">跳过 ✕</div>
    </div>

    <!-- 信息区 -->
    <div class="card-body">
      <div class="name">{{ product.name }}</div>
      <div class="size">{{ product.size }}</div>
      <div class="price-row">
        <span class="now">${{ product.now.toFixed(2) }}</span>
        <span class="was">${{ product.was.toFixed(2) }}</span>
        <span class="save">省 ${{ product.saved.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.swipe-card {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  user-select: none;
  touch-action: none;
  will-change: transform;
}
.swipe-card.leaving {
  transition: transform .3s ease-out, opacity .3s ease-out;
  opacity: 0;
}
.card-media {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  pointer-events: none;
}
.emoji {
  font-size: 110px;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.15));
}
.store-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 999px;
  letter-spacing: .5px;
}
.discount-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: #111;
  color: #ffd84d;
  font-weight: 800;
  font-size: 16px;
  padding: 6px 12px;
  border-radius: 12px;
}
.stamp {
  position: absolute;
  top: 26px;
  font-size: 26px;
  font-weight: 900;
  padding: 6px 16px;
  border-radius: 12px;
  border: 4px solid;
  transform: rotate(-15deg);
  pointer-events: none;
}
.stamp.like {
  right: 18px;
  color: var(--like, #2ecc71);
  border-color: var(--like, #2ecc71);
}
.stamp.nope {
  left: 18px;
  color: var(--nope, #ff4d6d);
  border-color: var(--nope, #ff4d6d);
  transform: rotate(15deg);
}
.card-body {
  padding: 14px 18px 20px;
  background: #fff;
}
.name {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.3;
  color: #1c1c1c;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.size {
  color: #888;
  font-size: 13px;
  margin: 2px 0 8px;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.now {
  font-size: 26px;
  font-weight: 800;
  color: #E5231B;
}
.was {
  font-size: 15px;
  color: #aaa;
  text-decoration: line-through;
}
.save {
  margin-left: auto;
  background: #fff0d6;
  color: #b26a00;
  font-weight: 700;
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
}

/* ---- 移动端字体优化：略微收紧，避免窄屏拥挤 ---- */
@media (max-width: 600px) {
  .card-body { padding: 12px 16px 18px; }
  .name { font-size: 16px; }
  .size { font-size: 12.5px; }
  .now { font-size: 24px; }
  .was { font-size: 14px; }
  .save { font-size: 12.5px; }
  .store-badge { font-size: 12px; padding: 4px 10px; }
  .discount-badge { font-size: 15px; padding: 5px 11px; }
  .emoji { font-size: 96px; }
}
</style>
