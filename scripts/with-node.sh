#!/usr/bin/env bash
# Run a command with the Node version pinned in .nvmrc.
# Sources nvm, installs the pinned version if missing, and execs the command
# without permanently changing the caller's active Node.
#
# Usage: scripts/with-node.sh <command> [args...]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVMRC="$REPO_ROOT/.nvmrc"

if [ ! -f "$NVMRC" ]; then
  echo "scripts/with-node.sh: .nvmrc not found at $NVMRC" >&2
  exit 1
fi

NODE_VERSION="$(cat "$NVMRC")"
: "${NVM_DIR:=$HOME/.nvm}"

if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "scripts/with-node.sh: nvm not found at $NVM_DIR." >&2
  echo "Install nvm (https://github.com/nvm-sh/nvm) or set NVM_DIR." >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$NVM_DIR/nvm.sh" >/dev/null

nvm install "$NODE_VERSION" >/dev/null
nvm use "$NODE_VERSION" >/dev/null
exec "$@"
