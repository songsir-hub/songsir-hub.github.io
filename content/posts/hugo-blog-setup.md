+++
date = '2026-06-20T09:00:00+08:00'
draft = false
title = '用 Hugo 搭建个人博客：从零到上线的完整记录'
description = '详细记录如何在 Windows 上安装 Hugo，配置 Ananke 主题，并部署到 GitHub Pages'
categories = ['技术笔记']
tags = ['Hugo', 'GitHub Pages', '建站', '教程']
+++

## 前言

静态博客的方案有很多，我最终选择了 Hugo + GitHub Pages 的组合。理由很简单：

- **完全免费**：GitHub Pages 提供免费托管，域名可选
- **极快构建**：Hugo 号称最快的静态站点生成器，毫秒级完成
- **版本控制**：博客内容用 Git 管理，永远不丢失
- **Markdown 写作**：专注内容，无需操心排版

这篇文章记录完整的搭建过程，包括我踩过的坑。

## 环境准备

**系统：** Windows 11  
**必需工具：** Git（从 [git-scm.com](https://git-scm.com) 下载）

## 安装 Hugo

Hugo 提供 Extended 版本（支持 Sass/SCSS），建议安装这个版本。

**方式一：winget（网络条件好时推荐）**

```bash
winget install Hugo.Hugo.Extended
```

**方式二：手动下载（国内网络推荐）**

1. 打开 [Hugo Releases](https://github.com/gohugoio/hugo/releases)，下载最新的 `hugo_extended_*_windows-amd64.zip`
2. 解压到 `C:\Users\你的用户名\AppData\Local\Hugo\`
3. 将该目录加入系统 PATH 环境变量

验证安装：
```bash
hugo version
# 输出类似：hugo v0.162.1+extended windows/amd64
```

## 创建站点

```bash
hugo new site my-blog --format=toml
cd my-blog
git init
git branch -m main
```

## 添加 Ananke 主题

```bash
git submodule add --depth=1 https://github.com/gohugo-ananke/ananke.git themes/ananke
```

> **注意**：国内访问 GitHub 可能较慢，可开启代理后执行。

## 配置 hugo.toml

```toml
baseURL = 'https://你的用户名.github.io/'
locale = 'zh-cn'
title = '我的博客'
theme = 'ananke'

[params]
  author = '你的名字'
  description = '博客简介'
  background_color_class = 'bg-dark-gray'
```

## 创建第一篇文章

```bash
hugo new content posts/my-first-post.md
```

编辑文件，将 `draft = true` 改为 `draft = false`，然后添加内容。

## 本地预览

```bash
hugo server -D
```

打开浏览器访问 `http://localhost:1313`，即可实时预览。

## 部署到 GitHub Pages

**1. 在 GitHub 创建仓库**

仓库名必须为 `你的用户名.github.io`，设为 Public。

**2. 创建 GitHub Actions 工作流**

新建 `.github/workflows/hugo.yml`（内容见[官方文档](https://gohugo.io/hosting-and-deployment/hosting-on-github/)）。

**3. 推送代码**

```bash
git add .
git commit -m "初始化博客"
git remote add origin https://github.com/你的用户名/你的用户名.github.io.git
git push -u origin main
```

**4. 开启 Pages**

进入仓库 Settings → Pages → Source，选择 **GitHub Actions**。

等待 1-2 分钟，访问 `https://你的用户名.github.io` 即可！

## 后续维护

写新文章只需：

```bash
hugo new content posts/新文章.md
# 编辑文章
git add . && git commit -m "新增文章" && git push
```

GitHub Actions 会自动构建并部署，全程无需手动操作。

---

整个搭建过程大约半天，主要时间花在等待网络下载上。内容本身并不复杂，欢迎按照这篇教程尝试。
