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

- **Woolworths** — 官网内部搜索接口 `POST /apis/ui/Search/products`，按多个品类关键词抓取并过滤 `IsOnSpecial`
- **Coles** — 官网特价页 Next.js 数据 `GET /_next/data/{buildId}/en/on-special.json`（`buildId` 每次从首页动态解析）

抓取脚本：[`scripts/scrape-specials.mjs`](scripts/scrape-specials.mjs)，本地手动跑一次：

```bash
npm run scrape    # 重新生成 public/products.json
```

每周自动更新由 GitHub Action [`update-specials.yml`](.github/workflows/update-specials.yml) 负责
（每周三早上定时运行脚本并提交 `products.json`，也可在 Actions 页面手动触发）。

### ⚠️ CI 必须配置住宅代理（`SCRAPE_PROXY`）

Woolworths / Coles 前置 **Akamai 反爬会按 IP 信誉打分**：本地住宅 IP 能通过，
但 **GitHub Actions 的云端/数据中心 IP 几乎必被拦截**（请求被重置或返回验证页），
这会导致 CI 始终抓不到数据。重试、改 UA、换无头浏览器都救不了 —— 出口 IP 才是关键。

解决办法：让 CI 经 **住宅代理** 出站。脚本读取环境变量 `SCRAPE_PROXY`，
设置后所有请求都经该代理发出；未设置时按直连处理（本地开发不变）。

1. 注册一个住宅代理服务并取得 **代理模式** 地址，例如 ScraperAPI（免费档约 1000 次/月，
   本项目每周约 90 次，绰绰有余）。格式形如 `http://user:pass@proxy-host:port`。
2. 在仓库 **Settings → Secrets and variables → Actions** 新建 secret：
   - Name：`SCRAPE_PROXY`
   - Value：上面的代理地址
3. 到 **Actions** 页面手动触发 `Update specials data` 验证；日志应出现 `使用住宅代理：<host>`
   且能抓到商品。

本地也可临时用代理跑一次验证：

```bash
SCRAPE_PROXY="http://user:pass@proxy-host:port" npm run scrape
```

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
