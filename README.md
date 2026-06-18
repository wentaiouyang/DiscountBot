# Swipe Specials · 滑一滑省钱 🛒

约会软件式的左滑 / 右滑卡片，浏览 **Coles** 和 **Woolworths** 本周打折商品。
**右滑** 把商品加入购物清单并自动计算总价与节省金额，**左滑** 跳过。

基于 **Vue 3 + Vite + Vuetify 3** 构建，支持移动端，并可作为 **PWA 添加到桌面/主屏幕**离线使用。

## 功能

- 🃏 Tinder 风格滑动卡片（支持鼠标拖拽、触摸滑动、按钮操作）
- ❤️ 右滑加入购物清单，✕ 左滑跳过，带 LIKE / NOPE 印章动画
- 🧮 实时计算合计金额、原价、节省金额与折扣百分比
- 🏪 按门店筛选（全部 / Coles / Woolies）
- 📱 移动端自适应：底部结算条 + 购物清单抽屉
- 📲 PWA：可“添加到主屏幕/桌面”，Service Worker 离线缓存

## 运行

```bash
npm install
npm run dev      # 本地开发，自动打开 http://localhost:5173
```

构建生产版本：

```bash
npm run build    # 输出到 dist/
npm run preview  # 预览构建产物
```

> PWA 的“添加到桌面”能力需要在 **https 或 localhost** 下生效；`npm run preview` 或部署后即可在浏览器菜单中看到“安装 / 添加到主屏幕”。

## 数据来源

`src/data/products.js` 内为 **2026-06-17 ~ 06-23 当周真实特价数据**，抓取并整理自：

- Woolworths / Coles 官方周特价目录（含官方商品图 `cdn0.woolworths.media`）
- Grocerize 比价数据（Coles vs Woolworths 当周最大折扣）

由于 Coles / Woolworths 没有公开 API 且有反爬限制，数据为抓取当周快照。
要更新数据，直接编辑 `src/data/products.js` 中的 `raw` 数组即可（`saved` 与 `percentOff` 会自动计算）。

## 目录结构

```
discountBot/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── manifest.webmanifest   # PWA 清单
│   ├── sw.js                  # Service Worker
│   └── icons/                 # 应用图标
└── src/
    ├── main.js                # 入口 + Vuetify + SW 注册
    ├── App.vue                # 布局 / 筛选 / 购物车状态
    ├── data/products.js       # 打折商品数据
    └── components/
        ├── SwipeCard.vue      # 单张滑动卡片
        ├── SwipeDeck.vue      # 卡堆 + 操作按钮
        └── ShoppingList.vue   # 购物清单 + 价格计算
```
