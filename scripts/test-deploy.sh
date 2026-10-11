#!/usr/bin/env bash
# Exercise deployment failure paths without touching a Docker daemon or live installation.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
temp=$(mktemp -d)
trap 'rm -rf -- "$temp"' EXIT
mkdir -p "$temp/bin"
export PATH="$temp/bin:$PATH"
export EW_TEST_ROOT="$temp"
cat > "$temp/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$EW_TEST_ROOT/calls"
if [[ "$1" == compose ]]; then
  if [[ " $* " == *' ps -q '* ]]; then echo test-container; exit 0; fi
  candidate=''
  while [[ $# -gt 0 ]]; do
    if [[ "$1" == -f ]]; then candidate=$2; shift; fi
    shift
  done
  awk '/image:/ { print $2 }' "$candidate" > "$EW_TEST_ROOT/active-image"
  if [[ "${EW_TEST_MODE:-}" == up-fails ]] && grep -q electric-wave-release "$EW_TEST_ROOT/active-image"; then exit 1; fi
  exit 0
fi
if [[ "$1" == inspect ]]; then
  if [[ "$3" == '{{.Image}}' ]]; then printf 'sha256:%064d\n' 1
  elif [[ "${EW_TEST_MODE:-}" == health-fails ]] && grep -q electric-wave-release "$EW_TEST_ROOT/active-image"; then echo unhealthy
  else echo healthy; fi
elif [[ "$1" == load ]]; then cat >/dev/null
elif [[ "$1" == exec ]] && [[ " $* " == *' --input-type=module '* ]] && [[ "${EW_TEST_MODE:-}" == backup-fails ]]; then exit 1
fi
MOCK
printf '#!/usr/bin/env bash\nexit 0\n' > "$temp/bin/flock"
chmod +x "$temp/bin/docker" "$temp/bin/flock"
sha=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
printf 'mock image' | gzip > "$temp/image.tar.gz"
for mode in success health-fails up-fails backup-fails; do
  export EW_TEST_MODE="$mode" EW_DEPLOY_DIR="$temp/$mode"
  mkdir -p "$EW_DEPLOY_DIR/data"
  printf 'ADMIN_PASSWORD=unchanged\n' > "$EW_DEPLOY_DIR/.env"
  printf 'services: {}\n' > "$EW_DEPLOY_DIR/compose.yaml"
  printf 'database sentinel' > "$EW_DEPLOY_DIR/data/content.sqlite"
  : > "$temp/calls"
  if bash "$script_dir/deploy-server.sh" "$sha" "$temp/image.tar.gz" > "$temp/$mode.log" 2>&1; then result=0; else result=$?; fi
  [[ $(cat "$EW_DEPLOY_DIR/.env") == 'ADMIN_PASSWORD=unchanged' ]]
  [[ $(cat "$EW_DEPLOY_DIR/data/content.sqlite") == 'database sentinel' ]]
  if [[ "$mode" == success ]]; then
    [[ "$result" == 0 ]]
    grep -q "electric-wave-release:$sha" "$EW_DEPLOY_DIR/compose.override.yaml"
    [[ $(cat "$EW_DEPLOY_DIR/.deploy-current-commit") == "$sha" ]]
  else
    [[ "$result" != 0 ]]
    [[ ! -f "$EW_DEPLOY_DIR/.deploy-current-commit" ]]
    if [[ "$mode" == backup-fails ]]; then
      ! grep -q ' up -d ' "$temp/calls"
    else
      grep -q 'image: sha256:' "$EW_DEPLOY_DIR/compose.override.yaml"
      grep -q 'Previous image restored' "$temp/$mode.log"
    fi
  fi
  echo "PASS: $mode"
done
