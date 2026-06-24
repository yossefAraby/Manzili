#!/usr/bin/env bash
#
# Push the local .env file to the EC2 instance and restart the container so
# it picks up the new values.
#
# The .NET API reads configuration straight from these env vars (the
# `Manzili__*`, `ConnectionStrings__Default`, double-underscore form), so the
# same /etc/manzili.env file the systemd unit feeds via --env-file just works —
# no translation needed.
#
# When to run it:
#   - First-time setup (once).
#   - Any time you change .env and want those values live on the box.
#
# For pure image updates (no env change), use ./deploy.sh — it's faster.

set -euo pipefail

# ─── CONFIG ──────────────────────────────────────────────────────────────────
EC2_HOST="${EC2_HOST:-63.185.144.255}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
ENV_FILE="${ENV_FILE:-.env}"
REMOTE_ENV_PATH="${REMOTE_ENV_PATH:-/etc/manzili.env}"

# ─── HELPERS ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log() { printf '\033[1;34m[update-env]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[update-env] %s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "${SCRIPT_DIR}/${ENV_FILE}" ]] || die "${ENV_FILE} not found in ${SCRIPT_DIR}"
command -v ssh >/dev/null 2>&1 || die "ssh not found"
command -v scp >/dev/null 2>&1 || die "scp not found"

# ─── 1. Upload to a staging path, move into place atomically ────────────────
log "Uploading ${ENV_FILE} to ${EC2_USER}@${EC2_HOST}:${REMOTE_ENV_PATH}"
scp -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new \
  "${SCRIPT_DIR}/${ENV_FILE}" \
  "${EC2_USER}@${EC2_HOST}:/tmp/manzili.env.new"

ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new \
  "${EC2_USER}@${EC2_HOST}" \
  "sudo install -m 600 -o root -g root /tmp/manzili.env.new ${REMOTE_ENV_PATH} \
     && rm -f /tmp/manzili.env.new"

# ─── 2. Restart so the new env is picked up ─────────────────────────────────
log "Restarting manzili service"
ssh -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new \
  "${EC2_USER}@${EC2_HOST}" \
  "sudo systemctl restart manzili && sleep 2 && sudo systemctl is-active manzili"

log "Done. New env is live."
log "Tail logs:"
echo "    ssh ${EC2_USER}@${EC2_HOST} 'sudo docker logs -f manzili'"
