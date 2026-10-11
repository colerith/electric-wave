#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
sha=${1:?Commit SHA required}
archive=${2:?Image archive required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid SHA'; exit 1; }
[[ -f "$archive" ]] || { echo 'Image archive missing'; exit 1; }
cd "${EW_DEPLOY_DIR:-/opt/electric-wave}"
[[ -f .env && -f compose.yaml && -d data ]] || { echo 'Existing installation required'; exit 1; }
exec 9>.deploy.lock
flock -w 600 9
override=compose.override.yaml
if [[ -f "$override" ]] && ! grep -q '^# Managed by electric-wave deployment$' "$override"; then
  echo 'Existing custom compose.override.yaml needs manual review'; exit 1
fi
compose=(docker compose -p electric-wave -f compose.yaml)
[[ ! -f "$override" ]] || compose+=(-f "$override")
container=$("${compose[@]}" ps -q electric-wave)
[[ -n "$container" ]] || { echo 'Current service must be running for backup and rollback'; exit 1; }
previous=$(docker inspect --format '{{.Image}}' "$container")
[[ "$previous" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
image="electric-wave-release:$sha"
gzip -dc "$archive" | docker load
docker image inspect "$image" >/dev/null
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_name="before-deploy-$stamp-$sha.sqlite"
# Consistent online SQLite snapshot; uploaded files are never modified by this script.
docker exec -e EW_BACKUP_NAME="$backup_name" "$container" node --input-type=module -e '
  import { DatabaseSync, backup } from "node:sqlite";
  import { mkdirSync } from "node:fs";
  const dir = process.env.DATA_DIR || "/app/data";
  mkdirSync(dir + "/deploy-backups", { recursive: true });
  const db = new DatabaseSync(dir + "/content.sqlite");
  await backup(db, dir + "/deploy-backups/" + process.env.EW_BACKUP_NAME);
  db.close();'
candidate=$(mktemp "$PWD/.deploy-candidate.XXXXXX")
write_override() {
  printf '# Managed by electric-wave deployment\nservices:\n  electric-wave:\n    image: %s\n' "$1" > "$candidate"
}
healthy() {
  local cid status
  for ((n=0; n<60; n++)); do
    cid=$(docker compose -p electric-wave -f compose.yaml -f "$candidate" ps -q electric-wave)
    if [[ -n "$cid" ]]; then
      status=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")
      if [[ "$status" == healthy ]]; then
        docker exec "$cid" node -e 'fetch("http://127.0.0.1:3000/api/content").then(async r=>{const d=await r.json();if(!r.ok||!Array.isArray(d.content?.posts))process.exit(1)}).catch(()=>process.exit(1))' && return 0
      fi
      [[ "$status" != exited && "$status" != unhealthy ]] || return 1
    fi
    sleep 2
  done
  return 1
}
changed=0
rollback() {
  code=$?
  trap - EXIT INT TERM
  if [[ "$changed" == 1 ]]; then
    echo 'Deployment failed; restoring previous image (database is preserved).'
    write_override "$previous"
    if docker compose -p electric-wave -f compose.yaml -f "$candidate" up -d --no-build --pull never --no-deps electric-wave && healthy; then
      mv "$candidate" "$override"
      echo 'Previous image restored.'
    else
      echo "Rollback failed. Database backup: data/deploy-backups/$backup_name"
    fi
  fi
  [[ ! -f "$candidate" ]] || rm -f "$candidate"
  exit "$code"
}
trap rollback EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
write_override "$image"
changed=1
docker compose -p electric-wave -f compose.yaml -f "$candidate" up -d --no-build --pull never --no-deps electric-wave
healthy
mv "$candidate" "$override"
changed=0
printf '%s\n' "$previous" > .deploy-previous-image
printf '%s\n' "$sha" > .deploy-current-commit
echo "Deployment healthy: $sha"
