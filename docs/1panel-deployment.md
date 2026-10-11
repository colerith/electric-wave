# 在已有网站的 1Panel 服务器部署

本方案增加一个独立 Docker Compose 项目和一个域名站点。容器提供前端与 API，1Panel 的 OpenResty 负责 HTTPS 和反向代理。不要覆盖现有站点配置或重装 OpenResty。本文未在你的服务器执行。

## 1. 准备项目和目录

在 1Panel 文件管理器建立 `/opt/electric-wave`，上传本项目源码。必须包含 Dockerfile、compose.yaml、package*.json、App.tsx、components、services、server、public、types.ts 及构建配置；不上传 node_modules、dist、.git、本机 .env、data。

上传前确认本地 `types.ts` 就是要迁移的已发布内容。如果旧网站还有未同步的浏览器修改，先在旧版完成同步或导出备份。首次导入只读取项目文件，不读取浏览器缓存。

在该目录使用 1Panel 终端执行：

```bash
cd /opt/electric-wave
cp .env.example .env
mkdir -p data
chown 1000:1000 data
chmod 700 data
chmod 600 .env
ss -ltn | grep ':3088 '
```

最后一条若有输出，说明端口可能已被占用，请换一个空闲端口，并同步修改下面配置。不要停止占用端口的现有网站。

通过文件管理器编辑 `.env`：

```dotenv
PUBLIC_ORIGIN=https://electricwave.wiki
ADMIN_PASSWORD='这里换成至少12位的独立随机密码'
HOST_PORT=3088
```

密码必须替换，不使用示例文字或旧前端密钥；若包含 `$`，保留单引号，避免 Compose 插值。`PUBLIC_ORIGIN` 是浏览器地址的协议、域名和可选端口，不带路径和末尾斜线；若先使用测试子域名，此处也必须填测试子域名。

## 2. 构建并启动

在上述目录运行：

```bash
docker compose -p electric-wave up -d --build
docker compose -p electric-wave ps
docker compose -p electric-wave logs --tail=100
curl http://127.0.0.1:3088/api/health
```

健康检查应返回 `{"ok":true}`。初次构建需要下载 Node 镜像和 npm 依赖。日志如显示数据库只读或 EACCES，检查 `data` 目录所有者是否为 UID 1000。SQLite 实验性提示不等于启动失败。

也可以通过 1Panel「容器 → 编排」创建本地编排，但必须以 `/opt/electric-wave/compose.yaml` 为文件并确认工作目录；不要把相对路径模板粘贴到另一个目录运行。不同面板版本入口名称可能略有区别，终端命令的工作目录最明确。

容器默认只绑定宿主机 `127.0.0.1:3088`，无需开放公网 3088，也不占用其他站点的 80/443。

## 3. 增加反向代理网站

在 1Panel「网站 → 创建网站」中选择反向代理：

- 域名：`electricwave.wiki`（或先使用测试子域名）。
- 代理地址：`http://127.0.0.1:3088`。
- 代理整个 `/` 路径，前端、`/api/`、`/uploads/` 都走该服务。
- 给这个站点申请/绑定证书并启用 HTTPS，确认正常后启用 HTTP 跳转 HTTPS。
- 在该站点配置设置 `client_max_body_size 12m;`，不修改其他站点。
- 关闭这个站点的代理缓存，特别是 `/api/*`。若用了 CDN，不缓存 `/api/*` 和首页 HTML；图片可缓存。

同一域名若已经在面板中存在，就修改这个域名的目标，不重复建冲突站点。保留旧配置供回滚。

**先核对 OpenResty 的网络模式：** 在 1Panel 容器详情查看。上面的回环地址适用于 OpenResty 使用宿主机网络（host）的情况。若 OpenResty 使用 bridge，容器内的 127.0.0.1 不指向宿主机。此时让新服务加入 OpenResty 所在的 Docker 网络，代理目标用 `http://electric-wave:3000`，不要为此更改已有 OpenResty 的网络模式。

bridge 情况可在 compose.yaml 的 `services.electric-wave` 下增加：

```yaml
    networks:
      - panel-web
```

在文件顶层增加以下定义，把名称换成面板中查到的实际网络名（不是容器名）：

```yaml
networks:
  panel-web:
    external: true
    name: 实际的OpenResty网络名
```

再运行 `docker compose -p electric-wave up -d`，并使用容器名代理地址。可在 OpenResty 容器终端请求该地址的 `/api/health` 验证连接。

## 4. 验证后切换域名

先使用测试子域名，或修改自己电脑的 hosts 将 electricwave.wiki 指到服务器 IP；HTTPS 必须使用有效证书（切换 DNS 前可用 DNS 验证申请证书）。

1. 打开网站，确认原有文章、公告和图片正常。
2. 从原来的登录入口输入 `.env` 中的新密码。
3. 编辑一篇文章，点击“保存条目”，等待一两秒让自动保存完成。
4. 使用无痕窗口读取更新，确认不是当前浏览器的草稿。
5. 上传一张图片，发布并在无痕窗口验证。
6. 执行 `docker compose -p electric-wave restart`，确认内容和图片仍在；重新登录属于预期行为。
7. 验证其他原有网站仍正常。

完成后，把域名 DNS 从 GitHub Pages 指向服务器。若已有 AAAA 记录，也要更新到正确 IPv6 或删除旧记录。若使用测试子域名验证，将 `.env` 中 PUBLIC_ORIGIN 改回正式 HTTPS 域名并运行 `docker compose -p electric-wave up -d`。已有浏览器页面需刷新。旧的 `#/post/...` 路由保持不变。

## 5. 更新代码和备份

日常文章更新在网站保存后自动同步。升级网站代码时上传新源码，保留 `.env` 和整个 `data` 目录，然后：

```bash
cd /opt/electric-wave
docker compose -p electric-wave up -d --build
```

`data/content.sqlite` 保存内容，`data/uploads` 保存新上传图片；SQLite 还可能产生 `-wal` / `-shm` 文件。代码重建不会重新导入种子内容。

推荐在 1Panel 计划任务里做每日备份。以下简单方案短暂停止**这个编排的服务**，保证 SQLite 与图片一致，不停止其他网站：

```bash
#!/bin/bash
set -euo pipefail
cd /opt/electric-wave
mkdir -p backups
chmod 700 backups
trap 'docker compose -p electric-wave start' EXIT
docker compose -p electric-wave stop
tar -czf "backups/electric-wave-$(date +%Y%m%d-%H%M%S).tar.gz" data
```

将备份同步到另一台设备或对象存储，并单独安全保管 `.env`。网站目录备份未必覆盖 `/opt/electric-wave/data`，需明确配置此路径。数据库内额外保留最近 50 次发布前的内容快照，但它不是异机备份，也没有提供网页历史恢复界面。

恢复时只停止这个编排，将当前 data 改名保留，解压选定备份到 `/opt/electric-wave`，执行 `chown -R 1000:1000 data` 后启动；确认后再处理旧目录。不要直接在运行中的数据库上覆盖文件。

## 常见问题

- **403 请求来源无效**：检查 PUBLIC_ORIGIN 与实际浏览器协议、域名、端口完全一致；修改后 `docker compose up -d`。
- **401 请重新登录**：会话过期或服务重启，重新登录；未发布草稿可先下载备份。
- **409 内容冲突**：另一个设备先发布了。下载当前草稿，刷新加载新内容后手动合并；直接导入旧草稿会替换整个编辑区。
- **502**：先检查容器健康状态、3088 端口，再检查 OpenResty 是否采用 bridge 网络。
- **413 上传失败**：图片限制 10MB，内容限制 12MB；检查站点和 CDN 的请求大小限制。
- **登录尝试过多**：十分钟窗口内最多 10 次失败尝试。反向代理后的登录限流可能由全部访客共享；系统不信任外部伪造的转发 IP 头。
- **旧 GitHub 图片仍依赖外部访问**：外部链接没有自动下载。需要迁移时在编辑器重新上传对应图片。

参考：[1Panel 网站配置](https://docs.fit2cloud.com/1panel/user_manual/websites/website-config-basic/)、[1Panel 编排模板](https://proxy.1panel.cn/docs/v2/user_manual/containers/compose_template/)、[Node.js 24 SQLite](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html)。
