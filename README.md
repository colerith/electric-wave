# 电波FM · Electric Wave

电波系的作品与使用指南小站。这里整理了 SillyTavern 相关的预设、世界书、扩展介绍、使用教程和更新日志，也留了一小块地方，放下每天想分享的文字。

**[📻 进入电波FM](https://electricwave.wiki/#/)**

## 🌙 在这里可以找到

| 分区 | 内容 |
| --- | --- |
| 预设 | 日月西、月读（Tsukuyomi）、象牙塔（Ivory Tower）的介绍、答疑与版本更新 |
| 小手机 | 电波手机的功能介绍和使用说明 |
| 世界书 | 极光小剧场世界书及相关内容 |
| 教程 | 预设助手使用指南、变量 COT 缝合教学等 |
| 每日电波 | 手动分享的文字，或从 ONE 自动获取的每日一句 |

想了解作品怎么用、最近更新了什么，可以直接从网站的分区或搜索进入。各作品的使用与转载要求，请以对应文章的说明为准。

本仓库是**电波FM网站的源码**，作品介绍与教程在网站中阅读。

## ✨ 网站功能

- **浏览与查找**：文章分区、搜索、标签筛选、精选置顶和更新日志。
- **阅读体验**：适配手机的页面，支持浅色、深色和自动主题。
- **在线编辑**：管理员登录后使用 Markdown 编辑器，支持图片上传；保存文章后自动同步到服务器。
- **内容管理**：管理文章、公告、分区、友链、站点设置和每日电波；后台拖拽置顶文章，可调整首页展示顺序。
- **每日电波**：支持手动填写与 ONE 自动获取。当天的手动内容优先，仅展示文字和作者。
- **自动保存**：管理表单修改后自动保存，失败时可重试或下载本地备份；遇到多设备编辑冲突会暂停保存。

## 🛠️ 本地运行

使用 **Node.js 24 或更高版本**。前端为 React + TypeScript + Vite + Tailwind CSS，后端使用 Node.js 和内置 SQLite，无需另装 MySQL。

先安装依赖，将 `.env.example` 复制为 `.env`：

```bash
npm ci
```

在 `.env` 中设置独立的管理员密码（至少 12 位），并按运行方式填写 `PUBLIC_ORIGIN`。不要将 `.env` 提交到仓库。

### 开发模式

设置 `PUBLIC_ORIGIN=http://localhost:5173`，在两个终端分别运行：

```bash
npm run dev:server
```

```bash
npm run dev
```

打开 `http://localhost:5173`。

### 构建后运行

设置 `PUBLIC_ORIGIN=http://localhost:3000`，然后执行：

```bash
npm run build
npm start
```

打开 `http://localhost:3000`。运行测试：

```bash
npm test
```

## 🚀 部署与维护

网站通过 Docker Compose 运行，可使用 1Panel / OpenResty 配置 HTTPS 反向代理。

- [1Panel 部署、迁移、备份与恢复](docs/1panel-deployment.md)
- [GitHub Actions：推送 main 自动上线](docs/github-auto-deploy.md)

配置完成后，推送到 `main` 会自动执行测试、构建镜像、上传服务器、备份数据库并更新容器，最后检查服务健康状态。部署失败时会尝试回退旧镜像。

**网站内容与网站代码分别管理：**日常文章和设置直接在网页后台修改，保存到服务器数据库；修改网站代码则通过 GitHub 推送自动部署。网页编辑不需要再提交 GitHub。

## 💾 数据与登录

- 文章、站点配置和登录会话存放在 `data/content.sqlite`，上传图片位于 `data/uploads`。备份时请保留整个 `data` 目录。
- 新数据库首次启动从 `types.ts` 和 `public/daily-wave-config.json` 初始化内容，日常内容以服务器数据库为准。
- 仓库包含一次性历史文章恢复迁移，执行前会保存备份；重复部署不会重复导入。
- 管理员密码通过服务器环境变量配置。登录使用 HttpOnly Cookie，会话有效期为 12 小时，刷新页面与服务重启不会主动清除有效会话；退出登录会立即注销。
- 图片上传支持 PNG、JPEG、GIF、WebP，单张最大 10 MB；内容保存请求上限为 12 MB。

完整网站需要后端服务，不能仅将 `dist` 作为静态文件部署到 GitHub Pages。

---

📻 [电波FM](https://electricwave.wiki/#/) · 作品、教程，以及每天的一点电波。
