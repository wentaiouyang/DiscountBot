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
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 17px;
}
.count {
  background: #E5231B;
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  min-width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}
.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}
.list-empty {
  color: #aaa;
  text-align: center;
  padding: 40px 12px;
  font-size: 14px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 12px;
}
.row:hover { background: #faf8f4; }
.row-emoji {
  width: 46px;
  height: 46px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  background: #f3f1ec;
  overflow: hidden;
}
.row-emoji img { width: 100%; height: 100%; object-fit: contain; }
.row-info { flex: 1; min-width: 0; }
.row-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.r-now { color: #E5231B; font-weight: 700; font-size: 14px; }
.r-was { color: #bbb; text-decoration: line-through; font-size: 12px; }
.r-store {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  color: #fff;
}
.r-store.Coles { background: #E5231B; }
.r-store.Woolworths { background: #178841; }
.totals {
  border-top: 1px solid #f0f0f0;
  padding: 14px 16px;
  background: #fffdf8;
}
.t-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-weight: 700;
}
.t-total { font-size: 24px; color: #111; }
.t-row.sub { font-weight: 500; font-size: 13px; color: #999; margin-top: 4px; }
.t-saved { color: #178841; font-weight: 800; }

.list-enter-active, .list-leave-active { transition: all .3s ease; }
.list-enter-from { opacity: 0; transform: translateX(20px); }
.list-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
