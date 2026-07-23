+++
author = '松朗'
title = "在 Windows 上部署 FastGithub 踩坑记录"
date = '2026-07-09T19:30:00+08:00'
draft = false
categories = ["软件技巧"]
tags = ["Windows", "FastGithub", "GitHub", "网络加速", "排障"]
+++

## 背景

受够了 GitHub 相关站点的访问稳定性长期不稳定，也试过修改 host 文件等办法，麻烦又效果差，最终下决心试试 FastGithub。由于 GitHub 站点基本上不去，原版 `dotnetcore/FastGithub` 仓库已不可用、Gitee 镜像只提供源码而无现成二进制，在 AI 建议下，最终采用仍在维护的 `creazyboyone/FastGithub` v2.1.5——其工作机制与原版一致。本文记录在本机及第二台电脑上部署、排障、并沉淀可复用资产的全过程。

## 一、获取与解包

通过 `ghproxy.net` 这类镜像拉取 `fastgithub-win-x64.zip`，避免直接连接 GitHub。下载后校验 SHA256，解包得到自包含的 `app\` 目录：其中的 `fastgithub.exe` 自带 .NET 运行时，无需另装环境。部署目录最终统一为 `D:\tools\FastGithub`，所有电脑共用同一份。

## 二、运行机制的要点

FastGithub v2.1.5 在 Windows 上**不依赖系统代理**，而是用 WinDivert 驱动做 DNS 透明拦截：把 `github.com` 等域名的解析结果改写为 `127.0.0.1`，再由本地 MITM 代理接管 TLS 并回源。这一点决定了后续的排障方向——系统代理应当为空，证书必须被系统信任。

![dns](/images/dns-interception.svg)

## 三、踩坑与对应处理

### 坑 1：前台进程需管理员且窗口常开；批处理文件须纯英文

双击启动脚本时窗口一闪而过。原因是核心以前台进程方式运行，必须**右键以管理员身份运行**，且窗口需保持打开，加速才生效；关闭窗口即停止加速。

另一个隐性问题是编码：在中文 Windows 下，若 `.bat` 文件中含中文字符，GBK 编码会把 UTF-8 中文读成乱码，导致命令解析失败。因此所有脚本一律使用纯英文文件名与内容，避免中文标点。

### 坑 2：杀软拦截 WinDivert 驱动

核心启动时报 `Win32Exception (5) 拒绝访问`。异常来源并非权限不足，而是杀毒软件（如火绒）将 WinDivert 驱动判定为可疑并阻止加载。将 `D:\tools\FastGithub` 整个目录加入杀软白名单后，驱动正常加载，日志出现 `启动完成 V2.1.5`，DNS 拦截生效。

![antivirus](/images/antivirus-whitelist.jpg)

> 火绒设置路径：安全设置 → 系统防护 → 漏洞驱动拦截 → 例外驱动 → 添加 `D:\tools\FastGithub` 目录。加入白名单后，WinDivert 驱动即可正常加载。

> 排查顺序：遇到"拒绝访问(5)"，先查杀软/EDR 是否拦截驱动，不要直接去动安全启动、HVCI 等。

### 坑 3：系统不信任自签 CA，浏览器报证书错误

核心运行后，浏览器访问 GitHub 仍提示证书不受信任。因为前台模式不会自动把 FastGithub 的自签根 CA 导入系统信任库。为此增加 `install_cert.bat`，以管理员身份运行一次，将 `app\cacert\fastgithub.cer` 导入"当前用户"（及可选本机）信任库，证书即长期有效。

![cert](/images/cert-chain.svg)

信任链的覆盖范围有两类例外：Firefox 使用自有证书库，需单独导入；Git 自带的 OpenSSL 版 `curl` 不读取 Windows 证书库，验证时需用 `-k` 或显式指定 CA。浏览器（Edge/Chrome）走系统证书库，导入后即正常。

### 坑 4：第二台电脑残留的系统代理

第二台电脑验证时，`[1]` 项显示系统代理被设为 `62.60.xxx.xxx:6133`（公网 IP，非 FastGithub 设置）。透明模式本就不需要系统代理，这个残留代理会把 GitHub 流量引向别处，使加速形同虚设。增加 `clear_proxy.bat`（关闭 WinINet 代理 + `netsh winhttp reset`）一键清除后，验证恢复正常。

## 四、验证脚本的演进

为让两台电脑的状态一目了然，我让助手（WorkBuddy）编写了 `verify.bat`，检查四项：`[1]` 系统代理、`[2]` 核心进程、`[3]` GitHub 连通、`[4]` 证书信任。

![flow](/images/verify-flow.svg)

脚本本身的实现过程也暴露了几类典型问题：

1. **`cmd /k` 自重启守卫失效**：早期为避免闪退加了重开自身的守卫，反而因畸形引号在打印标题后即报 `此时不应有 .` 崩溃。该守卫属多余，删除后由末尾 `pause` 兜底即可。
2. **括号块内 `echo` 含圆括号导致闪退**：写成 `if (...) else (...)` 块时，块内 `echo` 文本中的 `)` 会被 cmd 当作块结束符，造成语法错误与闪退。改为 `goto` 标签结构后彻底解决。
3. **中文名与英文名脚本分家**：同时存在中文 `验证.bat` 与英文 `verify.bat`，修改只落在英文版，双击中文版仍跑旧逻辑，造成反复误判。统一为单一英文脚本。
4. **curl 假阴性**：PATH 中的 `curl` 是 Git 自带的 OpenSSL 版，不读系统证书库，证书已安装仍握手失败；而浏览器走另一套信任链反而正常。验证改用系统 `curl`（`%SystemRoot%\System32\curl.exe`）并按需配合 `--cacert` 或 `-k`。

最关键的一处修正来自"直连假绿"：第二台电脑能直连 GitHub，核心未启动时 `curl` 也返回 200，验证脚本一度"假报"全绿。最终改为检测响应头中的 `Server: FastGithub` 标记——**只有 FastGithub 真正做了透明拦截，响应头里才会出现这一行**。

![proof](/images/server-header-proof.svg)

双 `Server` 头（`server: github.com` + `server: FastGithub`）成为隧道是否真的生效的可靠判据，能排除"能直连便误报全绿"的情况。

## 五、收工状态

两台电脑的验证脚本最终均为：`[1] none / [2] FOUND / [3] Server: FastGithub header seen / [4] cert TRUSTED`，输出中明确出现双 `Server` 头。最终多次打开 GitHub 及部署其中的个人主页均快速稳定，证明部署成功。

## 六、成果沉淀

本次过程沉淀为两份可复用资产：

- **部署清单文档**（`部署到其他电脑.md`）：新电脑照七步操作即可，无需重复排障。
- **可复用技能**（`windows-fastgithub-setup`）：记录全部坑点与已修正的脚本（含被替换的 `cmd /k` 守卫），避免旧 bug 复现。

并定下规范：**所有电脑统一使用 `D:\tools\FastGithub` 这一份**，不再维护其他副本。

---

小结：这类工具真正的难点从来不在拉包与启动，而在于操作系统角落里的细节——杀软拦驱动、残留代理、证书库的多套信任链，以及 Windows 批处理那套解析规则。逐一理顺后，GitHub 访问即稳定可用。
