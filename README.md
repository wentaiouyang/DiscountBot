# Swipe Specials · 滑一滑省钱 🛒

约会软件式的左滑 / 右滑卡片，浏览 **Coles** 和 **Woolworths** 本周打折商品。
**右滑** 把商品加入购物清单并自动计算总价与节省金额，**左滑** 跳过。

基于 **Vue 3 + Vite + Vuetify 3** 构建，支持移动端，并可作为 **PWA 添加到桌面/主屏幕**离线使用。

## 功能

- 🃏 Tinder 风格滑动卡片（支持鼠标拖拽、触摸滑动、按钮操作）
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

## 数据来源（每周实时抓取）

商品数据为 **每周定时抓取** 的当周真实特价（澳洲商超每周三上新特价），运行时由前端从 `public/products.json` 拉取：

抓取用带 **stealth 插件的无头浏览器（Puppeteer）** 驱动官网：浏览器会运行 Akamai
反爬的传感器 JS、拿到有效 cookie，从而绕过「直接 fetch 被挂起」的问题。

- **Woolworths** — 访问首页拿 cookie 后，在页面内 `fetch` 内部搜索接口
  `POST /apis/ui/Search/products`（按品类关键词搜索 + `IsOnSpecial` 过滤）
- **Coles** — 访问特价页 `on-special`，抓取已渲染的商品卡 DOM（含 `Was` 原价），翻页累计

抓取脚本：[`scripts/scrape-specials.mjs`](scripts/scrape-specials.mjs)，本地手动跑一次：

```bash
npm run scrape    # 重新生成 public/products.json
```

每周自动更新由 GitHub Action [`update-specials.yml`](.github/workflows/update-specials.yml) 负责
（每周三早上定时运行脚本并提交 `products.json`，也可在 Actions 页面手动触发）。

### 住宅代理（可选 · `SCRAPE_PROXY`）

Woolworths / Coles 前置 **Akamai 反爬**：除了校验传感器 cookie（已由无头浏览器解决），
还会按 **IP 信誉**打分。住宅 IP（本地）通过；GitHub Actions 的数据中心 IP 风险分较高，
**可能**被拦。无头浏览器 + stealth 通常足以通过，若 CI 仍抓不到数据，再加住宅代理：

1. 取一个住宅代理 **代理模式** 地址，如 ScraperAPI（免费档约 1000 次/月，本项目每周约百次内）。
   格式 `http://user:pass@proxy-host:port`。
2. 仓库 **Settings → Secrets and variables → Actions** 新建 secret `SCRAPE_PROXY` = 该地址。
   浏览器会经 `--proxy-server` 出站（带认证时自动 `page.authenticate`）。
3. 日志出现 `使用住宅代理：<host>` 即生效。本地可临时验证：
   `SCRAPE_PROXY="http://user:pass@host:port" npm run scrape`

> 代理出站较慢，脚本在代理模式下自动放宽导航超时到 90s（可用 `SCRAPE_TIMEOUT_MS` 覆盖）。

**容错设计**：

- 两个门店相互独立，任一抓取失败不影响另一个；两边都失败时保留旧数据不覆盖。
- 前端拉取失败 / 离线时，自动回退到 `src/data/products.js` 内置的精选快照，保证永远有内容可滑。
- Service Worker 对 `products.json` 采用 **网络优先**（每周刷新），其余静态资源缓存优先。

> 由于 Coles / Woolworths 没有公开 API 且有反爬限制，以上为其前端自用的内部接口，可能随官网改版失效；
> 失效时前端会自动回退到内置快照，修复抓取脚本即可恢复实时数据。

## 目录结构

```
discountBot/
├── index.html
├── vite.config.js
├── package.json
├── scripts/
│   └── scrape-specials.mjs    # 每周抓取 Woolworths/Coles 特价
├── .github/workflows/
│   └── update-specials.yml    # 定时运行抓取脚本并提交数据
├── public/
│   ├── products.json          # 抓取产物：实时特价数据（前端运行时拉取）
│   ├── manifest.webmanifest   # PWA 清单
│   ├── sw.js                  # Service Worker（products.json 网络优先）
│   └── icons/                 # 应用图标
└── src/
    ├── main.js                # 入口 + Vuetify + SW 注册
    ├── App.vue                # 布局 / 筛选 / 购物车 / 异步加载数据
    ├── data/products.js       # loadProducts() 拉取实时数据 + 内置兜底快照
    └── components/
        ├── SwipeCard.vue      # 单张滑动卡片
        ├── SwipeDeck.vue      # 卡堆 + 操作按钮
        └── ShoppingList.vue   # 购物清单 + 价格计算
```
