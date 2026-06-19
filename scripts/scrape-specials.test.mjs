// 回归测试：纯解析/映射函数（不启动浏览器、不联网）
// 运行：node --test scripts/scrape-specials.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseMoney, splitColesTitle, emojiFor, topByDiscount } from './scrape-specials.mjs'

test('parseMoney 从各种文本里取价格', () => {
  assert.equal(parseMoney('$3.75'), 3.75)
  assert.equal(parseMoney('| Was $12.00'), 12)
  assert.equal(parseMoney('$2'), 2)
  assert.equal(parseMoney(5.5), 5.5)
  assert.ok(Number.isNaN(parseMoney('无价格')))
  assert.ok(Number.isNaN(parseMoney(null)))
})

test('splitColesTitle 拆分名称与规格', () => {
  assert.deepEqual(splitColesTitle('Coles Hass Avocados | 1 Each'), { name: 'Coles Hass Avocados', size: '1 Each' })
  assert.deepEqual(splitColesTitle('Denada Triple Choc No Added Sugar | 473mL'), { name: 'Denada Triple Choc No Added Sugar', size: '473mL' })
  assert.deepEqual(splitColesTitle('No Pipe Here'), { name: 'No Pipe Here', size: '' })
})

test('emojiFor 按关键词匹配，未命中给购物车兜底', () => {
  assert.equal(emojiFor('Cadbury Dairy Milk Chocolate'), '🍫')
  assert.equal(emojiFor('Pepsi Max Cola Soft Drink'), '🥤')
  assert.equal(emojiFor('Hendrick\'s Gin 700ml'), '🍷')
  assert.equal(emojiFor('Something Unmatched 123'), '🛒')
})

test('topByDiscount 按折扣降序、截断到上限、剔除内部字段', () => {
  const items = Array.from({ length: 45 }, (_, i) => ({
    store: 'Coles', name: `p${i}`, was: 10, now: 10 - (i % 9) - 1, // 折扣 10%..90%
  }))
  const out = topByDiscount(items)
  assert.equal(out.length, 40) // PER_STORE 截断
  // 第一名折扣 >= 最后一名
  const pct = (p) => (p.was - p.now) / p.was
  assert.ok(pct(out[0]) >= pct(out[out.length - 1]))
  // 内部排序字段已剔除
  assert.equal('_pct' in out[0], false)
})

test('topByDiscount 不足上限时全部保留', () => {
  const items = [
    { store: 'Woolworths', name: 'a', was: 4, now: 2 }, // 50%
    { store: 'Woolworths', name: 'b', was: 10, now: 9 }, // 10%
  ]
  const out = topByDiscount(items)
  assert.equal(out.length, 2)
  assert.equal(out[0].name, 'a') // 折扣大的在前
})
