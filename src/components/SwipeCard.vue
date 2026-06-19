<script setup>
import { ref, computed } from 'vue'
import { t } from '../i18n.js'

const props = defineProps({
  product: { type: Object, required: true },
  // 是否是最顶层可拖拽的卡片
  active: { type: Boolean, default: false },
  // 叠放层级（用于轻微缩放/位移营造卡堆效果）
  depth: { type: Number, default: 0 },
  // 是否已被追踪（收藏）
  tracked: { type: Boolean, default: false },
})

const emit = defineEmits(['swiped', 'track'])

const THRESHOLD = 110 // 触发滑动的位移阈值(px)

const dragging = ref(false)
const dx = ref(0)
const dy = ref(0)
const leaving = ref(false)
let startX = 0
let startY = 0
let pointerId = null

const imgError = ref(false)
const imgLoaded = ref(false)

const storeColor = computed(() =>
  props.product.store === 'Coles' ? '#E5231B' : '#178841'
)

// 媒体区底色：始终用「浅色」门店色晕染的舞台（不随深浅色主题变化），
// 这样商品图用 mix-blend-mode: multiply 抠掉白底后，能干净地「悬浮」在这层柔色上。
const mediaBg = computed(() => {
  const c = storeColor.value
  if (imgError.value || !props.product.image) {
    return `radial-gradient(circle at 50% 38%, ${c}26, ${c}0a 70%)`
  }
  return `linear-gradient(170deg, color-mix(in srgb, ${c} 6%, #ffffff) 0%, color-mix(in srgb, ${c} 16%, #ffffff) 100%)`
})

// 拖动时卡片的变换（含旋转）。z-index 让「当前可操作卡片」始终位于卡堆最上层，
// 否则后渲染的背景预览卡会覆盖在上面、拦截指针事件，导致无法拖动。
const cardStyle = computed(() => {
  const rot = dx.value / 18
  // 离场：保持顶层并带方向地飞出屏幕
  if (leaving.value) {
    return {
      transform: `translate(${dx.value}px, ${dy.value}px) rotate(${rot}deg)`,
      transition: 'transform .32s ease-out, opacity .32s ease-out',
      zIndex: 40,
    }
  }
  if (!props.active) {
    const base = props.depth
    return {
      transform: `translateY(${base * 13}px) scale(${1 - base * 0.05})`,
      transition: 'transform .3s ease, opacity .3s ease',
      opacity: 1 - base * 0.14,
      zIndex: 20 - base,
    }
  }
  return {
    transform: `translate(${dx.value}px, ${dy.value}px) rotate(${rot}deg)`,
    transition: dragging.value ? 'none' : 'transform .35s cubic-bezier(.18,.89,.32,1.28)',
    zIndex: 30,
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
    <div class="card-media" :style="{ background: mediaBg }">
      <!-- 图片加载前的骨架微光，避免空白闪烁 -->
      <div v-if="product.image && !imgError && !imgLoaded" class="media-skeleton" aria-hidden="true"></div>
      <img
        v-if="product.image && !imgError"
        :src="product.image"
        :alt="product.name"
        draggable="false"
        :class="{ ready: imgLoaded }"
        @load="imgLoaded = true"
        @error="imgError = true"
      />
      <span v-else class="emoji">{{ product.emoji }}</span>

      <!-- 门店徽标 -->
      <div class="store-badge" :style="{ background: storeColor }">
        {{ product.store }}
      </div>

      <!-- 折扣角标 -->
      <div class="discount-badge">-{{ product.percentOff }}%</div>

      <!-- 追踪（收藏）按钮：只在顶层卡片显示；阻止指针冒泡，避免触发滑动 -->
      <button
        v-if="active"
        class="track-btn"
        :class="{ on: tracked }"
        :aria-label="tracked ? t('trackOff') : t('trackOn')"
        :aria-pressed="tracked"
        @pointerdown.stop
        @click.stop="emit('track')"
      >
        <v-icon size="20">{{ tracked ? 'mdi-bell' : 'mdi-bell-outline' }}</v-icon>
      </button>

      <!-- 滑动提示 -->
      <div class="stamp like" :style="{ opacity: likeOpacity }">{{ t('stampAdd') }} ♥</div>
      <div class="stamp nope" :style="{ opacity: nopeOpacity }">{{ t('stampSkip') }} ✕</div>
    </div>

    <!-- 信息区 -->
    <div class="card-body">
      <div class="name">{{ product.name }}</div>
      <div class="size">{{ product.size }}</div>
      <div class="price-row">
        <span class="now">${{ product.now.toFixed(2) }}</span>
        <span class="was">${{ product.was.toFixed(2) }}</span>
        <span class="save">{{ t('save') }} ${{ product.saved.toFixed(2) }}</span>
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-card), var(--card-sheen);
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
  isolation: isolate; /* 把 multiply 混合限制在媒体区内，只与本层柔色舞台混合 */
}
/* 顶部柔光：一层从上而下的高光，给媒体区一点曲面质感 */
.card-media::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, transparent 22%);
}
[data-theme='dark'] .card-media::after {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, transparent 22%);
}
.card-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 22px;
  pointer-events: none;
  /* 抠掉商品图的白底：白 ×柔色舞台 = 柔色，商品本体保留 → 悬浮效果 */
  mix-blend-mode: multiply;
  opacity: 0;
  transform: scale(0.96);
  transition: opacity .35s ease, transform .45s cubic-bezier(.18,.89,.32,1.28);
}
.card-media img.ready { opacity: 1; transform: scale(1); }
/* 图片加载骨架：斜向流光 */
.media-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 30%,
    color-mix(in srgb, var(--surface-sunken) 60%, transparent) 50%,
    transparent 70%
  );
  background-size: 220% 100%;
  animation: media-shimmer 1.25s ease-in-out infinite;
}
@keyframes media-shimmer {
  from { background-position: 180% 0; }
  to   { background-position: -60% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .media-skeleton { animation: none; }
  .card-media img { transition: opacity .2s ease; transform: none; }
}
.emoji {
  font-size: 110px;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.15));
}
.store-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 2;
  color: #fff;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  padding: 5px 11px;
  border-radius: 8px;
  letter-spacing: 1px;
  box-shadow: 0 6px 16px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.3);
}
.discount-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 2;
  background: var(--accent-grad);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.4px;
  padding: 6px 12px;
  border-radius: 10px;
  box-shadow: var(--shadow-pop), inset 0 1px 0 rgba(255,255,255,.4);
  font-variant-numeric: tabular-nums;
}
/* 追踪按钮：玻璃质感小圆钮，置于媒体区右下角 */
.track-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 3;
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(6px);
  color: var(--text-muted);
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(20, 30, 50, 0.16);
  transition: transform .15s cubic-bezier(.18,.89,.32,1.28), color .2s ease, background .2s ease;
}
.track-btn:active { transform: scale(.86); }
.track-btn.on {
  color: var(--accent);
  background: #fff;
}
@media (prefers-reduced-motion: reduce) {
  .track-btn:active { transform: none; }
}

.stamp {
  position: absolute;
  top: 28px;
  z-index: 3;
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 700;
  padding: 6px 18px;
  border-radius: 14px;
  border: 4px solid;
  transform: rotate(-15deg);
  pointer-events: none;
  background: rgba(255,255,255,.86);
  box-shadow: 0 6px 18px rgba(0,0,0,.12);
  backdrop-filter: blur(2px);
}
.stamp.like {
  right: 18px;
  color: var(--like);
  border-color: var(--like);
}
.stamp.nope {
  left: 18px;
  color: var(--nope);
  border-color: var(--nope);
  transform: rotate(15deg);
}
.card-body {
  padding: 16px 18px 20px;
  background: var(--surface);
  border-top: 1px solid var(--border);
}
.name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.4px;
  color: var(--text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.size {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .2px;
  margin: 4px 0 12px;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.now {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -1.4px;
  line-height: 1;
}
.was {
  font-size: 15px;
  color: var(--text-faint);
  text-decoration: line-through;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.save {
  margin-left: auto;
  background: var(--like);
  color: #06140C;
  font-weight: 800;
  font-size: 12.5px;
  letter-spacing: .2px;
  padding: 5px 11px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 4px 12px -2px rgba(18,184,119,.5);
}

/* ---- 移动端字体优化：略微收紧，避免窄屏拥挤 ---- */
@media (max-width: 600px) {
  .card-body { padding: 14px 16px 18px; }
  .name { font-size: 16px; }
  .size { font-size: 12px; }
  .now { font-size: 31px; letter-spacing: -1.2px; }
  .was { font-size: 14px; }
  .save { font-size: 12px; }
  .store-badge { font-size: 10.5px; padding: 4px 10px; }
  .discount-badge { font-size: 15px; padding: 5px 11px; }
  .emoji { font-size: 96px; }
}
</style>
