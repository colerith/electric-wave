# 恢复文章并更新为自动保存版

此更新根据用户提供的 types.ts 恢复 26 篇文章（原包 17 篇），移除顶部发布栏和设置页同步说明。编辑器点“保存条目”后自动提交；分类、公告、友链、设置、每日电波等修改停止操作约 600ms 后自动提交。保存请求按顺序发送，保存期间继续修改会随后提交。只有失败时显示重试、下载本地备份和重新登录入口。关闭页面前有未完成保存会触发浏览器提醒。

## 上传更新

1. 关闭正在编辑网站的浏览器标签页。
2. 将 electric-wave-autosave-recovery-2026-10-11.zip 上传到服务器 `/opt`。
3. 解压到 `/opt`，允许覆盖 `/opt/electric-wave` 下同名源码。压缩包不包含 `.env`、`data` 或 `compose.yaml`，保留服务器密码、数据库、图片和端口配置。
4. 在 1Panel 终端执行：

```bash
cd /opt/electric-wave
docker compose -p electric-wave up -d --build
docker compose -p electric-wave logs --tail=60
curl --resolve electricwave.wiki:443:127.0.0.1 https://electricwave.wiki/api/health
```

无需删除数据库、重新建站、修改 DNS 或重新申请证书。

## 自动恢复规则

新容器第一次启动时，在同一数据库事务中导入 `server/recovery/articles-2026-10-11.json` 的文章。同 ID 的文章以用户提供文件为准，服务器独有文章保留；分类合并。现有公告、友链、站点设置、每日电波、上传图片保留。首次安装的新站使用更新后的 types.ts 作为初始数据。

写入前先把原内容完整备份到 `/opt/electric-wave/data/recovery-backups/`（JSON，含旧版本号与完整内容），数据库 history 也记录旧版本。迁移标记与内容一起提交；后续重启或再次部署同一包不会再次导入，不会覆盖之后的网站编辑。恢复失败会阻止服务启动并在日志中报错，不会静默跳过。

## 验证

刷新首页（Ctrl+F5），确认最新文章出现。登录后顶部没有发布栏。用编辑器保存一处小修改，等一两秒，再用无痕窗口读取；修改设置同样无需发布按钮。若仍出现旧界面，清除 Cloudflare 对首页 HTML 的缓存，并检查是否配置了“缓存所有内容”：`/api/*` 必须绕过缓存。

生产更新尚需在你的服务器执行；本地恢复、后端接口和浏览器自动保存测试不代表服务器已经更新。
