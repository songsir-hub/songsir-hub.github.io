# 搜索引擎收录提交指南（Google / Bing / 百度）

适用站点：`https://songsir-hub.github.io/`
技术栈：Hugo（Ananke 主题）+ GitHub Pages + GitHub Actions 自动部署
维护人：Song（松朗）
最后更新：2026-07-23

---

## 〇、背景与原理

让搜索引擎收录，本质是告诉三大引擎「我的网站有哪些页面、请来抓」。
核心入口文件是 **`sitemap.xml`**——Hugo 默认自动生成，列出全站所有文章 URL。
三家的收录流程都是：① 验证你拥有这个站点 → ② 提交 sitemap → ③ 引擎爬虫抓取并建索引。

> ⚠️ **关键限制（务必先读）**
> `.github.io` 是 GitHub 提供的**子域名**，你**无法做 DNS 验证**（不能加 TXT 记录），
> 因此全程只能用「meta 标签验证」或「HTML 文件验证」。本指南采用 meta 标签方案。
> 另外，**百度对无备案、非独立域名的 github.io 子站收录偏慢甚至不积极**，这是平台特性，不是配置问题；Google / Bing 对 github.io 很友好。

---

## 一、已经做好的基础建设（2026-07-23 已上线，无需你操作）

| 文件 | 作用 |
|---|---|
| `layouts/robots.txt`（新建） | 声明 `Sitemap: https://songsir-hub.github.io/sitemap.xml`，爬虫访问 `/robots.txt` 时自动发现站点地图 |
| `layouts/partials/head-additions.html` | 内含三个**生效的**验证 meta 标签占位符（见下），将来替换 content 即可 |
| `.github/workflows/hugo.yml` | 部署后自动推送：Bing 走 IndexNow、百度走主动推送 API；**缺密钥自动跳过，绝不阻断部署** |

`head-additions.html` 中已就位的三行占位（保持为生效元素，**不能包在 `<!-- -->` 注释里**，否则被 `hugo --minify` 剥离导致验证失败）：

```html
<meta name="google-site-verification" content="GOOGLE_VERIFICATION_CODE">
<meta name="msvalidate.01" content="BING_VERIFICATION_CODE">
<meta name="baidu-site-verification" content="BAIDU_VERIFICATION_CODE">
```

`hugo.yml` 中已加入的 `notify-search-engines` 任务：
- 从 `sitemap.xml` 收集全部 URL；
- **百度**：`curl` 推送至 `http://data.zz.baidu.com/urls?site=songsir-hub.github.io&token=${{ secrets.BAIDU_PUSH_TOKEN }}`；
- **Bing**：以 IndexNow 协议 POST 至 `https://www.bing.com/indexnow`（同时覆盖 Yandex / ChatGPT / Copilot）；
- 两个步骤均 `if: secrets.X != ''` 且 `continue-on-error: true`，无密钥时静默跳过。

---

## 二、你只需做的 4 步（需要你的账号）

### Step 1 — 三平台各添加站点

分别打开，用同一 GitHub 账号登录，添加「URL 前缀」属性 `https://songsir-hub.github.io/`：

| 平台 | 入口 |
|---|---|
| Google Search Console | https://search.google.com/search-console |
| Bing Webmaster Tools | https://www.bing.com/webmasters |
| 百度搜索资源平台 | https://ziyuan.baidu.com/site |

> 小技巧：Bing 支持「用 Google 账号导入站点」，可省一次添加。

### Step 2 — 获取验证 code

每个平台在你「添加站点」后会给出一串验证字符串：
- Google → 形如 `google-site-verification` 的 meta 标签 content
- Bing → 形如 `msvalidate.01` 的 meta 标签 content
- 百度 → 形如 `baidu-site-verification` 的 meta 标签 content

**把这些 code 发给我**（直接贴聊天里即可），我帮你替换 `head-additions.html` 里的占位符并推送上线，验证即生效。
（若你想自己改：把上面三行的 `GOOGLE_VERIFICATION_CODE` 等占位换成真实 code，提交即可。）

### Step 3 — 仓库配置两个 Secrets

在 GitHub 仓库 `songsir-hub/songsir-hub.github.io` → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名 | 值 | 用途 | 在哪获取 |
|---|---|---|---|
| `BAIDU_PUSH_TOKEN` | 百度 API token | 每次部署主动推送 URL 给百度 | 百度平台「资源提交 → API 提交」里的 token |
| `INDEXNOW_KEY` | IndexNow 密钥 | 每次部署通知 Bing；CI 会自动在站点根生成 `{key}.txt` 归属文件 | 在 https://www.bing.com/indexnow 生成（建议用随机长字符串） |

> 没有这两个 secret 也不影响站点正常部署，只是少了「自动即时推送」这层加速。

### Step 4 — 各平台手动提交一次 sitemap

在三个平台后台找到「站点地图 / Sitemaps」入口，提交：

```
https://songsir-hub.github.io/sitemap.xml
```

提交后引擎会把全站 URL 加入抓取队列（Google 数小时~数天、Bing 3~7 天、百度数天~数周）。

---

## 三、验证 code 替换上线流程（你发我 code 后的标准动作）

1. 编辑 `layouts/partials/head-additions.html`，把第 6–8 行的占位 content 换成真实 code；
2. 本地验证：`hugo --minify`（在仓库目录运行），确认无报错；
3. 推送到 GitHub（本机 `git push` 若遇证书吊销，改用下方「附录 B」的 Contents API 脚本）；
4. 等 GitHub Actions 跑完，访问 `https://songsir-hub.github.io/` 查看网页源码（Ctrl+U），确认 meta 标签已变成真实 code；
5. 回各平台点「验证」按钮 → 显示「已验证」即成功。

---

## 四、检查收录状态

在搜索引擎直接搜：

```
site:songsir-hub.github.io
```

- 有结果 = 已收录；无结果 = 待抓取，耐心等几天再查。
- 各平台后台「覆盖率 / URL 检查」也能看到已收录的具体页面数与状态。

---

## 五、发新文章后要不要手动再做？

**不需要。** 每次 `git push`（或 Merge PR）到 `main` 分支，GitHub Actions 会：
1. 重新构建（sitemap 自动包含新文章）；
2. 若配了 `BAIDU_PUSH_TOKEN` / `INDEXNOW_KEY`，自动把新 URL 推送给百度 / Bing。

唯一需要你手动的，仍是首次在三平台「添加站点 + 提交 sitemap」（Step 1 / Step 4），这是平台侧的一次性动作。

---

## 六、常见问题（FAQ）

**Q：浏览器里看不到 meta 标签？**
A：先强制刷新（Ctrl+Shift+R）排除缓存；再 Ctrl+U 看源码。注意 `hugo --minify` 会删 `<!-- -->` 注释，所以验证标签必须是生效元素——本指南 Step 2 的占位已是生效元素，替换 content 即可。

**Q：百度一直没收录？**
A：github.io 子域 + 无备案，百度本身收录消极，属平台特性。可多做：① 配 `BAIDU_PUSH_TOKEN` 走主动推送；② 在百度平台「链接提交→手动提交」补提交几篇重点文章 URL；③ 在别的已备案/独立域名站点做友链引蜘蛛。

**Q：验证总失败？**
A：确认 `head-additions.html` 里三行 meta **没有被包在注释里**，且 content 与你从平台复制的完全一致（区分大小写、无多余空格）。改完必须重新部署一次。

**Q：换新域名（如自有域名）后？**
A：换域名后所有验证、sitemap、robots.txt 里的 URL 都要改成新域名，并在各平台「添加新站点」重新验证；`.github.io` 的 meta 可保留作旧站回链。

---

## 附录 A — 三大引擎机制对照

| 引擎 | 提交方式 | 验证方式（github.io） | 收录速度 | 备注 |
|---|---|---|---|---|
| Google | Search Console 提交 sitemap | meta 标签 | 数小时~数天 | 对 github.io 友好 |
| Bing | Webmaster Tools 提交 sitemap；可关联 Google | meta 标签（`msvalidate.01`） | 3~7 天 | 同时喂 Yandex / ChatGPT / Copilot |
| 百度 | 资源平台提交 sitemap + 主动推送 API | meta 标签（`baidu-site-verification`） | 数天~数周 | 对 github.io 子站偏慢 |

---

## 附录 B — 本机 git push 证书吊销时的替代推送

本机曾遇 Windows schannel 证书吊销导致 `git push` 失败。可用 GitHub Contents API（Python）直接更新文件，由 Actions 重新构建：

```python
# push_file.py —— 替换 path 与本地文件路径后运行
import urllib.request, urllib.error, base64, json

TOKEN  = "你的_PAT_（含 repo 权限）"
REPO   = "songsir-hub/songsir-hub.github.io"
BRANCH = "main"
TARGET = "layouts/partials/head-additions.html"          # 仓库内目标路径
LOCAL  = r"C:\path\to\head-additions.html"               # 本地文件

def api(method, path, data=None):
    url = f"https://api.github.com/repos/{REPO}/contents/{path}?ref={BRANCH}"
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "seo-push")
    if data is not None:
        req.add_header("Content-Type", "application/json")
        req.data = json.dumps(data).encode("utf-8")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

with open(LOCAL, "rb") as f:
    content = base64.b64encode(f.read()).decode("ascii")
info = api("GET", TARGET)
api("PUT", TARGET, {
    "message": "chore(seo): update verification meta",
    "content": content,
    "sha": info["sha"],
    "branch": BRANCH,
})
print("pushed")
```

> 运行：`python push_file.py`。PAT 勿提交进仓库，用后及时轮换。
