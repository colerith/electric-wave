# 电波系的个人主页

React + Node.js 24 + SQLite。保留原有界面和 Markdown 编辑器，文章、分类、公告、友链、站点设置、每日电波均由后端统一发布。

- [1Panel 部署、迁移、备份与恢复](docs/1panel-deployment.md)
- [推送 main 自动部署：首次配置](docs/github-auto-deploy.md)
- 本地开发：复制 `.env.example` 为 `.env`，设置独立管理员密码，将 `PUBLIC_ORIGIN` 设为 `http://localhost:5173`。分别运行 `npm run dev:server` 和 `npm run dev`，从 `http://localhost:5173` 访问。
- 本地完整运行：`npm ci`、`npm run build`，设置 `PUBLIC_ORIGIN=http://localhost:3000` 后 `npm start`。
- 验证：`npm test`、`npm run build`。

Node 版本必须为 24 或更高，使用内置 SQLite，无需安装 MySQL。新数据库首次启动自动导入 `types.ts` 和 `public/daily-wave-config.json`；之后升级代码不会覆盖数据库中的内容。

日常操作：管理员登录 → 编辑文章 → 保存条目，系统自动同步到服务器。其他管理表单修改停止约 600ms 后自动保存，无需发布按钮。保存失败会显示重试和本地备份入口；多设备冲突时暂停保存，避免覆盖另一设备的修改。

此次文章恢复与更新部署步骤见 [自动保存版更新说明](docs/update-autosave.md)。

图片直接上传到服务器（PNG/JPEG/GIF/WebP，最大 10MB），发布内容总大小上限 12MB。上传成功即保存文件，未引用图片暂不自动清理。旧的外部图片链接保持原样。现有编辑器只提供图片上传，没有新增通用附件界面。

管理员密码只配置在服务器环境变量中；浏览器使用 HttpOnly 会话 Cookie。会话有效期 12 小时，重启服务后需重新登录。生产环境配置 HTTPS 来源会启用 Secure Cookie。旧版前端密钥不再有效。

原 GitHub Pages 部署工作流目前仅允许手动触发；完整网站必须运行后端，不能只把 dist 发布到 Pages。
