+++
date = '2026-07-23T10:00:00+08:00'
draft = false
title = '让博客被搜索引擎收录：Bing / Google / 百度 实操指南'
description = '手把手教你把 Hugo + GitHub Pages 搭建的博客提交到三大搜索引擎，含 github.io 子域名的特殊限制与避坑要点。'
author = '松朗'
categories = ['技术笔记']
tags = ['SEO', 'Hugo', 'GitHub Pages', '博客建设', '教程']
+++

写博客的人，大抵都期望有人读到。但文章发出去，搜索引擎并不知道它的存在——除非你主动“报个到”。这篇指南用我在「博雅小筑」上的实操，讲清楚怎么把站点提交给 Bing、Google、百度三家，并标出 `github.io` 子域名特有的几个坑。照着做，半小时内能跑完。

## 一、原理：搜索引擎怎么“发现”你的站

说穿了就三步：

1. **验证你拥有这个站点**（证明你不是随便填了个别人的域名）；
2. **提交站点地图 `sitemap.xml`**（告诉引擎全站有哪些页面）；
3. **引擎派爬虫来抓取、建索引**。

`sitemap.xml` 不用你手写——Hugo 每次构建都会自动生成，列出全站所有文章的链接。你要做的，只是把“门牌号”递给三家引擎。

## 二、两个先天限制（先知道，少走弯路）

> ⚠️ 以下两点针对 **`xxx.github.io` 这类 GitHub 提供的子域名**，独立域名不受影响。

- **不能做 DNS 验证。** 子域名你加不了 TXT 记录，所以三家都只能用「meta 标签验证」或「HTML 文件验证」，不能用 DNS 方式。
- **百度收录偏慢。** 百度对“无备案 + 非独立域名”的 `github.io` 子站本就不积极，这是平台特性，不是你配置错了。Google、Bing 对 `github.io` 则很友好。心态放平，能搜到是 bonus，搜不到也别急。

## 三、动手前，这些已经帮你备好了

本站（Hugo + Ananke 主题）已经内置了收录所需的基础设施，你无需从零配：

| 已就绪项 | 作用 |
|---|---|
| `layouts/robots.txt` | 向爬虫声明 `Sitemap: https://songsir-hub.github.io/sitemap.xml`，访问 `/robots.txt` 时自动发现地图 |
| `layouts/partials/head-additions.html` | 内含三个**生效的**验证 meta 标签占位符，将来替换 `content` 即可 |
| `static/` 目录 | 放验证用的 HTML 文件（如 Bing 的 `BingSiteAuth.xml`）会直接生效到站点根 |

`head-additions.html` 里就这三行占位（注意必须保持为生效元素，**不能包在 `<!-- -->` 注释里**，否则被 `hugo --minify` 剥离导致验证失败）：

```html
<meta name="google-site-verification" content="GOOGLE_VERIFICATION_CODE">
<meta name="msvalidate.01" content="BING_VERIFICATION_CODE">
<meta name="baidu-site-verification" content="BAIDU_VERIFICATION_CODE">
```

## 四、四步完成提交

### Step 1 — 三平台各添加站点

分别用各自的平台账号登录（Google 用 Google 账号、Bing 用 Microsoft 账号、百度用百度账号），添加「URL 前缀」属性 `https://songsir-hub.github.io/`：

| 平台 | 入口 |
|---|---|
| Google Search Console | https://search.google.com/search-console |
| Bing Webmaster Tools | https://www.bing.com/webmasters |
| 百度搜索资源平台 | https://ziyuan.baidu.com/site |

> 小技巧：Bing 支持「用 Google 账号导入站点」，可省一次手动添加。

### Step 2 — 拿到验证 code

每个平台在你“添加站点”后会给出一串验证字符串，通常长这样：

- **Google** → `google-site-verification` 的 `content` 值
- **Bing** → `msvalidate.01` 的 `content` 值（也可选「XML 文件验证」，把 `BingSiteAuth.xml` 放到站点根）
- **百度** → `baidu-site-verification` 的 `content` 值

### Step 3 — 把 code 填进主题

**办法 A（让我帮你）：** 把三家 code 发给我，我替换 `head-additions.html` 里的占位符并推上线，你回平台点“验证”即可。

**办法 B（自己改）：** 编辑 `layouts/partials/head-additions.html`，把上面三行的 `GOOGLE_VERIFICATION_CODE` 等占位换成真实 code，提交即可。改完**必须重新部署一次**才会生效。

> 验证标签是“生效元素”，部署后可在浏览器按 `Ctrl+U` 看网页源码确认已变成真实 code。没有本地 Git 环境也不用愁——直接在 GitHub 网页上编辑 `head-additions.html`、或新建验证文件，提交即触发部署。

### Step 4 — 各平台提交一次 sitemap

在三个平台后台找到「站点地图 / Sitemaps」入口，提交：

```
https://songsir-hub.github.io/sitemap.xml
```

提交后引擎把全站 URL 加入抓取队列。各家时效大致是：

| 引擎 | 收录速度 | 备注 |
|---|---|---|
| Google | 数小时 ~ 数天 | 对 `github.io` 友好 |
| Bing | 3 ~ 7 天 | 同时喂给 Yandex / ChatGPT / Copilot |
| 百度 | 数天 ~ 数周 | 对 `github.io` 子站偏慢，属正常 |

## 五、验证与自查

- **确认 meta 生效：** 部署后访问首页，按 `Ctrl+U` 看源码，搜 `site-verification`，应看到真实 code 而非占位。
- **查是否收录：** 在搜索引擎直接搜 `site:songsir-hub.github.io`；有结果即已收录，无结果就再等几天。
- **后台看进度：** 各平台「覆盖率 / URL 检查」能看已收录的具体页面数与状态。

## 六、以后发新文章，还要再做一遍吗？

**不用。** 每次推送到 `main` 分支，GitHub Actions 会重新构建，`sitemap.xml` 自动包含新文章。你只需在**首次**做 Step 1（添加站点）和 Step 4（提交 sitemap）这两件平台侧的一次性动作。

## 七、常见问题

**Q：浏览器里看不到 meta 标签？**
先 `Ctrl+Shift+R` 强刷排除缓存，再 `Ctrl+U` 看源码。确认标签没被包在注释里，且 `content` 与平台给的完全一致（区分大小写、无多余空格）。

**Q：百度一直没收录？**
`github.io` + 无备案，百度本就消极。可多管齐下：① 在百度平台「链接提交 → 手动提交」补交几篇重点文章 URL；② 在别的已备案/独立域名站点做友链引蜘蛛；③ 见下方“进阶”启用主动推送。

**Q：验证总失败？**
最常见是 `content` 抄错（多了空格、大小写不对），或改完忘了重新部署。逐项核对即可。

**Q：以后换自有域名？**
换域名后，验证、sitemap、robots.txt 里的 URL 都要改；并在各平台“添加新站点”重新验证。旧 `.github.io` 的 meta 可保留作回链。

## 八、进阶：部署后自动推送（可选）

如果想让“发文章 = 自动通知引擎”，可以补一个独立的 `notify.yml` 工作流：部署后向百度主动推送 API、向 Bing 发 IndexNow（覆盖 Yandex / ChatGPT / Copilot）。**注意：这个文件默认没有放进仓库**（需要的话告诉我，我给你补上并接线），所以不要以为开箱就有。

启用总共三步：

1. 在仓库根建 `.github/workflows/notify.yml`（内容向我索取，或参考官方 IndexNow / 百度主动推送示例）；
2. 在仓库 **Settings → Secrets → Actions** 添加 `BAIDU_PUSH_TOKEN`（百度 API token）和 `INDEXNOW_KEY`（Bing IndexNow 密钥）；
3. 让它在 hugo.yml 部署成功后触发（用 `workflow_run` 或合入同一条工作流）。

> 没配这两个 Secret、也没加 `notify.yml`，完全不影响站点正常部署，只是少了“即时推送”这层加速。默认我是求稳不接的；想要随时说一声。

---

收个尾：收录不是目的，被读到才是。把站点报给三家引擎，剩下的就交给内容本身了。祝「博雅小筑」常被光顾。
