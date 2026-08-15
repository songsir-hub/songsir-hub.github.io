+++
title = "让 WorkBuddy 跟着你满世界跑：配置多机同步与告别明文 PAT"
author = '松朗'
date = "2026-08-15"
draft = false
description = "换电脑最怕丢的是那些只长在这一台机器上的积淀：调教好的 WorkBuddy 技能、记住你习惯的记忆、历史任务。本文讲两件事——如何用 workbuddy-backup 做多机同步抓回，以及为什么该用 gh 登录态替代明文 PAT、具体怎么做。"
tags = ["WorkBuddy", "效率工具", "备份", "GitHub", "安全", "多机同步"]
categories = ["效率工具"]
+++

## 引言

换电脑、重装系统，最怕的不是软件重装，而是那些"只长在这一台机器上"的积淀：你调教好的 WorkBuddy 技能、它记住的你工作习惯、还有那一堆任务记录。这些东西不像代码乖乖躺在 GitHub 上，它们静默地待在 `~/.workbuddy` 里，机器一没，就全没了。

好在，只要把 `~/.workbuddy` 整体备份到一个私有仓库，再写两个小脚本，就能让 WorkBuddy 的配置"跟着你满世界跑"。本文讲两件事：**如何用 workbuddy-backup 做多机同步抓回**，以及**为什么该用 gh 登录态替代明文 PAT、具体怎么做**。

![多台设备通过发光的数据流同步到云端配置仓库](/images/workbuddy-sync-cover.png)

## 一、为什么值得备份 WorkBuddy 配置

WorkBuddy 的"本领"大多是文件：

- **技能（`skills/`）**：你或助手沉淀的可复用工作流，比如我这里的 `gh-file-push`（沙箱里 `git` 推不动时，改用 `gh` 内容 API 上传文件的技能）。
- **记忆（`MEMORY.md` / `memory/`）**：跨会话记住的你的账号体系、项目约定、踩过的坑。
- **任务库（`tasks/`、`workbuddy.db`）**：历史任务与上下文。

它们默认只在本机 `~/.workbuddy`。换电脑、重装、磁盘损坏，都会让这些"新本领"归零。而 WorkBuddy 启动时会自动扫描 `skills/`、读取记忆文件——所以"备份"的本质，就是让另一台机器也能拿到这份目录。

## 二、workbuddy-backup：你的配置保险箱

我用一个私有仓库 `songsir-hub/workbuddy-backup` 来镜像 `~/.workbuddy`。核心是仓库里的两个脚本：

- `workbuddy-sync.py`：**推送**端，把本机配置增量同步到仓库。
- `workbuddy-restore.py`：**抓回**端，把仓库配置一键拉回本机。

鉴权走三路回退：`gh auth token` → 环境变量 `WORKBUDDY_GITHUB_TOKEN` → `~/.workbuddy/MEMORY.md` 里的 PAT。这样无论你用 gh 登录态还是传统 PAT，脚本都能跑起来。

## 三、明文 PAT 的隐患

![明文 PAT 如同一把裸露的钥匙从笔记本裂缝中泄露，暗处有手伸来](/images/pat-plaintext-risk.png)

很多人图省事，把 GitHub PAT 直接写进 `MEMORY.md` 或 `.mcp.json`，比如当作某个 MCP 服务的 API Key。这有三个坑：

1. **长期有效、权限宽泛**：PAT 一旦签发，过期前都能用，且常带 `repo` 等 broad 权限。
2. **明文即泄露**：写进文件、又跟着备份推上仓库（哪怕私有库），等于把钥匙放在人人可翻的抽屉里。Git 历史更难清除——哪怕你后来改掉，旧提交里依然躺着原值。
3. **难以及时止血**：泄露往往悄无声息，等你发现，别人可能已用你的身份跑了一圈。

> **真实教训**：我曾在另一台机器的备份里发现 `.mcp.json` 明文 `AGNES_API_KEY`、`MEMORY.md` 里两个 GitHub PAT 全部明文——其中一个还是别的账号、且仍有效。那种"钥匙散落一地"的感觉，谁遇到谁知道。处理办法只有三条：到 GitHub 后台**撤销**对应 token、轮换仍有效的 key、**不要再写明文**。

## 四、用 gh 登录态替代明文 PAT

![通过浏览器设备码登录，令牌被盾牌包裹、始终不以明文出现](/images/gh-token-secure.png)

更好的做法是**根本不持有明文 PAT**。GitHub 官方 CLI（`gh`）的登录态就是为此设计的：

- `gh auth login` 走**浏览器 / 设备码**，token 存进系统钥匙串（Keychain / 凭据管理器），**不落文件、不进记忆**。
- 脚本需要 token 时，调 `gh auth token` 现取现用，用完即弃。
- 想作废？`gh auth logout`，或到 GitHub 后台撤掉授权即可——**没有明文可泄露**。

把 `workbuddy-sync.py` 的鉴权改成优先 `gh auth token` 后，本机彻底告别了明文 PAT。其他仍用 PAT 的电脑，脚本也兼容——三路回退里保留了读取 `MEMORY.md` PAT 的兜底（仅当本机无 gh 登录态时启用）。

**优点小结**：无明文、可随时撤销、token 与系统账号绑定、不污染备份。

## 五、抓回教程：让新电脑"学会"你的本领

![三台不同形态的设备把配置同步到中央仓库立方体](/images/multi-machine-arch.png)

新电脑（或重置后的旧电脑）想获得你的技能与记忆，只需四步：

**第 1 步：准备备份库**
```bash
gh repo clone songsir-hub/workbuddy-backup   # 私有库，先确保已授权
```

**第 2 步：配置鉴权（二选一）**
- 推荐：安装 `gh` 后执行 `gh auth login`（浏览器登录，无明文）；
- 或：设环境变量 `WORKBUDDY_GITHUB_TOKEN=ghp_xxx`。

**第 3 步：取一次 restore 脚本并运行**
首次需手动从仓库网页或 `gh api` 取一次 `workbuddy-restore.py` 到本机，然后：
```bash
python workbuddy-restore.py
```
脚本会把 `skills/`、`memory/`、`MEMORY.md`、`tasks/` 等**全部拉回** `~/.workbuddy`，覆盖前自动备份为 `.bak`，不会误删你现有的东西。

**第 4 步：重启 WorkBuddy**
重启后，技能与记忆即时生效——"新本领"就到位了。

> **进阶**：把 `workbuddy-sync.py` 也放进去，以后在本机改了技能 / 记忆，一条命令即可增量同步回仓库，多机之间永远一致。

## 六、换电脑前，记住这几条

- ✅ **云端无忧**：博客（`songsir-hub.github.io`）、书稿备份（`laiguoshi-beifen`）、配置备份（`workbuddy-backup`）都在 GitHub，换电脑直接 clone。
- ⚠️ **本机工具要重装**：Hugo、gh CLI；若用 WorkBuddy 捆绑的 PortableGit，记得把凭据助手改回 `!/d/tools/gh/gh.exe auth git-credential`，否则 `git push` 会卡在弹窗。
- ⚠️ **项目记忆随工作目录走**：当前工作区的 `memory/` 不在同步脚本范围内，换电脑要连同整个工作目录一起迁移。
- 🔑 **gh 登录态要重做**：旧机器钥匙串里的 token 不会跟着你走，新机器 `gh auth login` 一次即可。

## 结语

把 `~/.workbuddy` 当作"可版本化的资产"来对待，是让 AI 助手真正跨设备连贯的关键一步。配合"gh 登录态替代明文 PAT"，你既拿到了多机同步的便利，又守住了安全的底线。下次换电脑，别再从头调教——抓回备份，继续干。

仓库与脚本见 [songsir-hub/workbuddy-backup](https://github.com/songsir-hub/workbuddy-backup)。
