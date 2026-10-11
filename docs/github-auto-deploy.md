# main 推送自动上线

流程：推送 main → npm 测试 → 按服务器 CPU 架构构建 Docker 镜像 → SSH 上传镜像 → SQLite 在线备份 → 替换 electric-wave 容器 → 健康检查。失败时尝试回退旧镜像，工作流仍标红。只更新此 Compose 服务，不重启 OpenResty 或其他站点。

镜像直接通过 SSH 传输，无需 GHCR / Docker Hub 私有仓库账号。首次配置需要 GitHub Secrets 和服务器 SSH 公钥，此仓库文件本身不会自动获得服务器访问权限。

## 1. 服务器准备（1Panel 终端）

现有安装必须位于 `/opt/electric-wave`，有 `.env`、`compose.yaml`、`data` 和运行中的 electric-wave 容器。使用已有 root SSH 账号及一把仅用于此发布流程的密钥。此密钥具有服务器管理员权限，私钥仅存 GitHub Actions Secret，不能提交仓库或发送到聊天。

执行下面命令创建专用密钥；如果提示目标已存在，停止并使用已有密钥，不覆盖：

```bash
install -d -m 700 /root/.ssh
ssh-keygen -t ed25519 -C electric-wave-actions -f /root/.ssh/electric-wave-actions -N ''
cat /root/.ssh/electric-wave-actions.pub >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

确认腾讯云安全组及系统防火墙允许 GitHub 执行器通过 SSH 端口连接，且 sshd 允许 root 使用公钥登录。若当前策略禁止 root SSH，请使用已有可免 sudo 操作 Docker 且可写项目目录的部署用户，并把公钥安装到该用户；不要为部署开放密码登录。Docker 组本身有接近 root 的权限。

## 2. GitHub Secrets

打开仓库 `colerith/electric-wave` → Settings → Secrets and variables → Actions → New repository secret，添加：

| 名称 | 值 |
|---|---|
| DEPLOY_HOST | 腾讯云服务器公网 IPv4，不能填橙云代理的站点域名 |
| DEPLOY_PORT | SSH 端口，通常 22；不是 1Panel 端口。省略则默认 22 |
| DEPLOY_USER | 上面配置密钥的账号，例如 root |
| DEPLOY_SSH_KEY | `/root/.ssh/electric-wave-actions` 的完整私钥，包括 BEGIN/END 行 |
| DEPLOY_KNOWN_HOSTS | 下面生成的服务器主机公钥记录 |

在服务器可信的 1Panel 终端生成主机记录，把示例 IP 和端口换成上面的真实值：

```bash
deploy_host='你的服务器公网IPv4'
deploy_port='22'
if [ "$deploy_port" = 22 ]; then
  host_label="$deploy_host"
else
  host_label="[$deploy_host]:$deploy_port"
fi
awk -v host="$host_label" '{print host " " $1 " " $2}' /etc/ssh/ssh_host_ed25519_key.pub
```

把输出的一整行填入 DEPLOY_KNOWN_HOSTS。若服务器没有该主机密钥文件，请查看 sshd 实际启用的 host key 后使用对应 `.pub` 文件；不要关闭主机指纹校验。

可在 1Panel 文件编辑器中查看专用部署私钥并直接复制到 GitHub Secret，避免把密钥截图发给任何人。

## 3. 推送代码并验证

将本次完整后端、文章恢复、自动保存和发布流程改动提交并推送到 main。不要只上传工作流文件，确保 Dockerfile、server、services、scripts、types.ts 等也已提交。`.env`、data、上传的新数据、部署压缩包及运行时 override 均已排除。

仓库 Actions 中查看 **Deploy website to server**。首次推送若 Secrets 尚未配置，会明确失败，不会更改服务器；配置完成后可在 main 上手动 Run workflow 重试。其他分支不会部署。

成功后查看 `https://electricwave.wiki/api/health` 和首页，验证登录、编辑保存、图片正常。当前部署的 Git 提交保存在 `/opt/electric-wave/.deploy-current-commit`。

构建不在服务器执行。首次可能需要几分钟，上传镜像需要足够带宽和磁盘空间。并发推送会串行部署，不打断已开始的部署；中间等待的提交可能被更新的提交替代。手动取消/断网/机器重启可能中断流程，需检查 Actions 日志与当前容器，不能保证这类中断自动回退。

## 4. 后续维护

- 日常文章修改走网站自动保存，与代码推送无关。
- 服务器源码目录不会被自动更新；实际运行的是 GitHub 构建的镜像。自动生成 `compose.override.yaml` 固定当前镜像。日常重启用 `docker compose -p electric-wave restart`，不要再用服务器旧源码 `up --build`，它会把旧代码构建到当前镜像标签。
- `.env`、原 compose.yaml、端口、data 绑定目录都保留。更改部署拓扑、环境变量名称等需要另行更新服务器配置。
- 每次部署在 `data/deploy-backups/` 生成 SQLite 一致性快照，图片原地保留；建议另做整个 data 的异机备份。脚本不自动清理历史镜像和数据库备份，定期检查磁盘空间并保留近期回退版本。
- 回退只回退程序镜像，不回滚数据库，以免丢掉部署期间新内容。以后若引入不兼容数据库迁移，必须单独规划迁移/恢复；此版文章恢复迁移兼容现有表结构。
- 自动检查容器健康和文章接口，不等同于验证 Cloudflare、DNS、证书、登录和全部页面。
- 原 GitHub Pages 工作流已替换。现有 Worker 和 Pages 项目不由此流程修改。

参考：[Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/)、[GitHub 并发执行](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)。
