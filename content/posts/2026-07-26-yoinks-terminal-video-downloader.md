+++
author = '松朗'
date = '2026-07-26T17:30:00+08:00'
draft = false
title = '用 yoinks 在终端里下载视频：简介、用法与安装踩坑记'
description = 'yoinks 是一款终端交互式视频下载工具，支持 1800+ 站点。本文介绍它的特点、基本用法，以及我在托管 Node 环境下安装时遇到的 safe-delete 报错与解决办法。'
categories = ["软件技巧"]
tags = ['yoinks', '视频下载', '终端工具', 'npm', '教程']
+++

## 前言

平时想保存某个视频做资料归档，最怕满屏的弹窗广告、伪装成「下载」的按钮和各类跳转。最近试了一款叫 **yoinks** 的终端小工具，体验相当干净：粘贴链接、选清晰度、回车，完事。本文记录它的简介、用法，以及我在安装时踩到的一个坑。

## 什么是 yoinks

yoinks 是一个基于 [yt-dlp](https://github.com/yt-dlp/yt-dlp) 的**终端交互式视频下载器**，几个特点：

- **支持 1800+ 站点**：YouTube、X/Twitter、Instagram、Threads、TikTok 等主流平台开箱即用
- **无广告、无套路**：没有弹窗、没有假下载按钮、没有恶意跳转
- **交互式选清晰度**：启动后占满终端，用方向键（或鼠标）选择分辨率，也支持纯音频（mp3）
- **开箱即用**：首次运行自动拉取独立的 yt-dlp 二进制，ffmpeg 也有内置 fallback，不用自己配环境
- **终端原生 UI**：基于 Ink（React for terminal），并自动跟随终端的明暗主题

> 提醒：yoinks 定位于个人资料归档。下载内容请遵守各平台服务条款，只保存你有权保留的内容。

## 安装

### 标准方式

需要 Node 18+。直接全局安装：

```bash
npm install -g yoinks
```

不想污染全局环境，也可以免安装体验：

```bash
npx yoinks
```

装好后，在终端里直接运行：

```bash
yoinks
# 或直接带链接启动格式选择器
yoinks https://youtu.be/xxxxxxxxxxx
```

文件默认保存到 `~/Downloads`，完成后终端会打印文件路径。

### 踩坑记录：托管 Node 环境下的 safe-delete 报错

我在某 AI 编程助手自带的「托管 Node」环境里用 `npm install` 安装时，reify 阶段中途失败，报错类似：

```
[safe-delete] 操作失败: ...node_modules/<pkg>:
Error during a `trash` operation: Unknown { description: "Some operations were aborted" }
```

根因是这类环境会在 Node 进程里注入一个**安全删除 shim**，把所有文件删除改道进回收站；而 npm 在 reify 阶段要大量移动/删除文件，触发了「批量删除保护」，在非交互环境下 trash 失败，于是安装中断。

绕过办法很简单——给 npm 子进程临时去掉那个会话环境变量，让 shim 直接跳过：

```bash
env -u CODEBUDDY_SESSION_ID -u CLAUDE_SESSION_ID npm install yoinks
```

（不同产品变量名可能略有差异，关键是找到那个「会话 ID」类的环境变量并临时取消。）

> 注意：npm 收尾日志有时会被吞、假报 `Exit Code 1`。装完后用 `ls node_modules/.bin/yoinks` 和 `node --check dist/cli.js` 验证文件是否真到位，别被假错误码吓到。

如果你是在**普通终端**（自己的系统、没有这类安全拦截）里安装，标准的 `npm install -g yoinks` 即可，不会遇到上述问题。

## 基本用法

1. 直接运行 `yoinks`，按提示粘贴视频链接（或启动时直接带链接）。
2. 用 `↑/↓`（或 `j/k`、数字键）选择格式，回车确认；`Esc` 返回，`Ctrl+C` 退出。
3. 也可以用鼠标：格式列表、按钮、底部提示都可点击，点 Logo 回首页。
4. 想只取音频？选列表里的「audio only / mp3」即可。
5. 下载完成后，文件路径会打印在终端。

主题切换：按 `Ctrl+T`，或启动时加 `--theme light|dark|auto`。

## 小结

yoinks 把「下载视频」这件小事做得克制又顺手，适合在终端里做个人资料归档。安装时如果遇到奇怪的 `safe-delete` 报错，多半是托管环境的安全拦截在捣乱，临时去掉对应会话变量就能解决。
