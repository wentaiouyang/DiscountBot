<script setup>
import { computed } from 'vue'
import { t } from '../i18n.js'

const props = defineProps({
  // 每项：{ id, name, store, size, image, emoji, was, now, onSale, current }
  items: { type: Array, required: true },
})
const emit = defineEmits(['remove', 'add'])

// 在售的排前面
const sorted = computed(() =>
  [...props.items].sort((a, b) => Number(b.onSale) - Number(a.onSale)),
)
const onSaleCount = computed(() => props.items.filter((i) => i.onSale).length)

function pct(p) {
  return p && p.was > 0 ? Math.round((1 - p.now / p.was) * 100) : 0
}
</script>

<template>
  <div class="track-panel">
    <div class="track-head">
      <div class="title">
        <v-icon>mdi-bell-outline</v-icon>
        {{ t('tracked') }}
        <span v-if="onSaleCount" class="count">{{ t('onSaleCount', { n: onSaleCount }) }}</span>
      </div>
    </div>

    <div class="track-body">
      <div v-if="!items.length" class="track-empty">
        {{ t('trackedEmpty') }}
      </div>

      <transition-group v-else name="list" tag="div">
        <div v-for="p in sorted" :key="p.id" class="row" :class="{ off: !p.onSale }">
          <div class="row-thumb" :class="p.store">
            <img v-if="p.image" :src="p.image" :alt="p.name" />
            <span v-else>{{ p.emoji }}</span>
          </div>
          <div class="row-info">
            <div class="row-name">{{ p.name }}</div>
            <div class="row-meta">
              <template v-if="p.onSale">
                <span class="r-now">${{ p.current.now.toFixed(2) }}</span>
                <span class="r-off">-{{ pct(p.current) }}%</span>
                <span class="r-store" :class="p.store">{{ p.store }}</span>
              </template>
              <template v-else>
                <span class="r-rest">{{ t('notOnSale') }}</span>
                <span class="r-store" :class="p.store">{{ p.store }}</span>
              </template>
            </div>
          </div>
          <button
            v-if="p.onSale"
            class="row-add"
            :aria-label="t('addToList')"
            @click="emit('add', p.current)"
          >
            <v-icon size="20">mdi-cart-plus</v-icon>
          </button>
          <button class="row-del" :aria-label="t('untrack')" @click="emit('remove', p)">
            <v-icon size="20">mdi-bell-off-outline</v-icon>
          </button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.track-panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
.track-head {
  padding: 15px 16px;
  border-bottom: 1px solid var(--border);
}
.title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  color: var(--text);
}
.count {
  margin-left: auto;
  background: var(--save-bg);
  color: var(--save-text);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
}
.track-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  max-height: 56vh;
}
.track-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 40px 12px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.8;
}
.row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 8px;
  border-radius: 14px;
  transition: background .15s ease;
}
.row:hover { background: var(--surface-2); }
.row.off { opacity: 0.6; }
.row-thumb {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  background: var(--surface-sunken);
  overflow: hidden;
}
.row-thumb.Coles { background: rgba(229, 35, 27, 0.10); }
.row-thumb.Woolworths { background: rgba(23, 136, 65, 0.10); }
.row-thumb img { width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; }
.row-info { flex: 1; min-width: 0; }
.row-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; }
.r-now { color: var(--text); font-weight: 800; font-size: 14px; font-variant-numeric: tabular-nums; }
.r-off {
  background: var(--save-bg);
  color: var(--save-text);
  font-weight: 800;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.r-rest { color: var(--text-faint); font-size: 12.5px; font-weight: 700; }
.r-store {
  margin-left: auto;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
  letter-spacing: .3px;
}
.r-store.Coles { background: var(--coles); }
.r-store.Woolworths { background: var(--woolies); }
.row-add, .row-del {
  flex-shrink: 0;
  width: 34px; height: 34px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background .15s ease, color .15s ease;
}
.row-add:hover { color: var(--like); background: var(--surface-sunken); }
.row-del:hover { color: var(--nope); background: var(--surface-sunken); }

.list-enter-active, .list-leave-active { transition: all .3s ease; }
.list-enter-from { opacity: 0; transform: translateX(20px); }
.list-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
