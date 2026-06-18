<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, required: true },
})
const emit = defineEmits(['remove', 'clear'])

const total = computed(() => props.items.reduce((s, p) => s + p.now, 0))
const totalWas = computed(() => props.items.reduce((s, p) => s + p.was, 0))
const totalSaved = computed(() => props.items.reduce((s, p) => s + p.saved, 0))
const savedPct = computed(() =>
  totalWas.value ? Math.round((totalSaved.value / totalWas.value) * 100) : 0
)
</script>

<template>
  <div class="list-panel">
    <div class="list-head">
      <div class="title">
        <v-icon>mdi-cart</v-icon>
        购物清单
        <span class="count">{{ items.length }}</span>
      </div>
      <v-btn v-if="items.length" variant="text" size="small" color="grey" @click="emit('clear')">
        清空
      </v-btn>
    </div>

    <div class="list-body">
      <div v-if="!items.length" class="list-empty">
        右滑商品即可加入这里 👉
      </div>

      <transition-group v-else name="list" tag="div">
        <div v-for="p in items" :key="p.id" class="row">
          <div class="row-emoji" :class="p.store">
            <img v-if="p.image" :src="p.image" :alt="p.name" />
            <span v-else>{{ p.emoji }}</span>
          </div>
          <div class="row-info">
            <div class="row-name">{{ p.name }}</div>
            <div class="row-meta">
              <span class="r-now">${{ p.now.toFixed(2) }}</span>
              <span class="r-was">${{ p.was.toFixed(2) }}</span>
              <span class="r-store" :class="p.store">{{ p.store }}</span>
            </div>
          </div>
          <v-btn icon variant="text" size="small" @click="emit('remove', p)">
            <v-icon size="20">mdi-trash-can-outline</v-icon>
          </v-btn>
        </div>
      </transition-group>
    </div>

    <div class="totals">
      <div class="t-row">
        <span>合计</span>
        <span class="t-total">${{ total.toFixed(2) }}</span>
      </div>
      <div class="t-row sub">
        <span>原价 <s>${{ totalWas.toFixed(2) }}</s></span>
        <span class="t-saved">共省 ${{ totalSaved.toFixed(2) }} ({{ savedPct }}%)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  background: var(--accent-grad);
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  box-shadow: var(--shadow-pop), inset 0 1px 0 rgba(255,255,255,.4);
}
.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}
.list-empty {
  color: var(--text-muted);
  text-align: center;
  padding: 44px 12px;
  font-size: 14px;
  font-weight: 600;
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
.row-emoji {
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
.row-emoji.Coles { background: rgba(229, 35, 27, 0.10); }
.row-emoji.Woolworths { background: rgba(23, 136, 65, 0.10); }
.row-emoji img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
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
.r-was { color: var(--text-faint); text-decoration: line-through; font-size: 12px; font-variant-numeric: tabular-nums; }
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
.totals {
  border-top: 1px solid var(--border);
  padding: 15px 16px;
  background: var(--surface-2);
}
.t-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 800;
  color: var(--text);
}
.t-total {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.t-row.sub { font-weight: 600; font-size: 13px; color: var(--text-muted); margin-top: 5px; }
.t-row.sub s { color: var(--text-faint); }
.t-saved { color: var(--like); font-weight: 800; font-variant-numeric: tabular-nums; }

.list-enter-active, .list-leave-active { transition: all .3s ease; }
.list-enter-from { opacity: 0; transform: translateX(20px); }
.list-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
