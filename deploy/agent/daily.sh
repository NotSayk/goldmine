#!/usr/bin/env bash
# Lancé chaque jour par cron, en tant que « sayk », depuis ~/apps/agent :
# 1) exporte les journaux du jeu, 2) lance l'agent (un cycle), 3) envoie le rapport par mail.
set -uo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a
mkdir -p data/reports feed
TODAY="$(date +%F)"

# 1) Journaux et statistiques de production : l'agent les lit en lecture seule, sans accès à Docker.
docker logs --since 24h goldmine-goldmine-1 2>&1 | grep -v healthz | tail -n 5000 > feed/goldmine.log
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' > feed/stats.txt
docker logs --since 24h caddy-caddy-1 2>&1 | grep -iE '"level":"(error|warn)"' | tail -n 500 > feed/caddy-errors.log

# 2) Un cycle de l'agent, avec un délai maximum.
timeout 2h docker compose run --rm -T agent > "data/run-$TODAY.log" 2>&1

# 3) Envoi du rapport (ou d'un avertissement s'il n'a pas été écrit).
REPORT="data/reports/$TODAY.md"
if [ ! -s "$REPORT" ]; then
  printf "L'agent n'a pas produit de rapport aujourd'hui. Fin du journal :\n\n" > "$REPORT"
  tail -n 40 "data/run-$TODAY.log" >> "$REPORT"
fi
{
  echo "From: Agent Pepite Rush <$MAIL_FROM>"
  echo "To: $MAIL_TO"
  echo "Subject: =?UTF-8?B?$(printf 'Rapport quotidien %s' "$TODAY" | base64 -w0)?="
  echo "MIME-Version: 1.0"
  echo "Content-Type: text/plain; charset=UTF-8"
  echo "Content-Transfer-Encoding: 8bit"
  echo
  cat "$REPORT"
} > data/mail.txt
curl -sS --ssl-reqd --url "$SMTP_URL" --user "$SMTP_USER:$SMTP_PASS" \
  --mail-from "$MAIL_FROM" --mail-rcpt "$MAIL_TO" --upload-file data/mail.txt \
  || echo "Envoi du mail échoué (voir SMTP_* dans .env)" >&2
