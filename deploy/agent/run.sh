#!/usr/bin/env bash
# Un cycle quotidien. Le conteneur s'arrête ensuite (lancé par cron avec « docker compose run --rm »).
set -uo pipefail
mkdir -p ~/workspace ~/data/reports
cd ~/workspace
if [ ! -d game/.git ]; then
  git clone "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git" game
fi
cd game
git config user.name "Agent de maintenance"
git config user.email "agent@sayk.fr"
git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git"
cd ~
echo "=== $(date -Is) : début ==="
# < /dev/null : sinon, lancé à la main, claude attend une entrée sur stdin.
claude -p "$(cat ~/prompt.md)" --max-turns "${AGENT_MAX_TURNS:-200}" < /dev/null || echo "Cycle en erreur (code $?)"
echo "=== $(date -Is) : fin ==="
