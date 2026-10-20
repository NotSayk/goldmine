#!/usr/bin/env bash
# Lancé chaque jour par cron, en tant que « sayk », depuis ~/apps/agent :
# 1) exporte les journaux du jeu, 2) lance l'agent (un cycle), 3) envoie le rapport par mail.
# « ./daily.sh --mail » renvoie seulement le rapport du jour (pour tester l'envoi).
set -uo pipefail
cd "$(dirname "$0")"

# Lecture littérale de .env (un « source » casserait les mots de passe contenant $, !, espaces…).
while IFS= read -r line || [ -n "$line" ]; do
  line="${line%$'\r'}"
  [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
  key="${line%%=*}"
  val="${line#*=}"
  if [ "${#val}" -ge 2 ] && { [[ "$val" == \"*\" ]] || [[ "$val" == \'*\' ]]; }; then
    val="${val:1:${#val}-2}"
  fi
  export "$key=$val"
done < .env

mkdir -p data/reports feed
TODAY="$(date +%F)"
REPORT="data/reports/$TODAY.md"

if [ "${1:-}" != "--mail" ]; then
  # 1) Journaux et statistiques de production : l'agent les lit en lecture seule, sans accès à Docker.
  docker logs --since 24h goldmine-goldmine-1 2>&1 | grep -v healthz | tail -n 5000 > feed/goldmine.log
  docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' > feed/stats.txt
  docker logs --since 24h caddy-caddy-1 2>&1 | grep -iE '"level":"(error|warn)"' | tail -n 500 > feed/caddy-errors.log

  # 2) Un cycle de l'agent, avec un délai maximum.
  echo "Cycle de l'agent en cours (journal : data/run-$TODAY.log)…"
  timeout 2h docker compose run --rm -T agent < /dev/null > "data/run-$TODAY.log" 2>&1
fi

# 3) Envoi du rapport (ou d'un avertissement s'il n'a pas été écrit).
if [ ! -s "$REPORT" ]; then
  printf "L'agent n'a pas produit de rapport aujourd'hui. Fin du journal :\n\n" > "$REPORT"
  tail -n 40 "data/run-$TODAY.log" >> "$REPORT" 2>/dev/null
fi
# Date et Message-ID sont exigés par Gmail (sinon le mail est rejeté après avoir été accepté par le SMTP) ;
# le corps est en base64 pour ne jamais dépasser la longueur de ligne autorisée.
{
  printf 'From: Agent Pepite Rush <%s>\r\n' "$MAIL_FROM"
  printf 'To: %s\r\n' "$MAIL_TO"
  printf 'Subject: =?UTF-8?B?%s?=\r\n' "$(printf 'Rapport quotidien %s' "$TODAY" | base64 -w0)"
  printf 'Date: %s\r\n' "$(LC_ALL=C date -R)"
  printf 'Message-ID: <%s.%s@%s>\r\n' "$(date +%s)" "$$" "${MAIL_FROM#*@}"
  printf 'MIME-Version: 1.0\r\n'
  printf 'Content-Type: text/plain; charset=UTF-8\r\n'
  printf 'Content-Transfer-Encoding: base64\r\n'
  printf '\r\n'
  base64 -w76 "$REPORT" | sed 's/$/\r/'
} > data/mail.txt
if curl -sS --ssl-reqd --url "$SMTP_URL" --user "$SMTP_USER:$SMTP_PASS" \
  --mail-from "$MAIL_FROM" --mail-rcpt "$MAIL_TO" --upload-file data/mail.txt 2> data/mail.log; then
  echo "Rapport envoyé à $MAIL_TO"
else
  echo "Envoi du mail échoué (voir SMTP_* dans .env) :" >&2
  cat data/mail.log >&2
fi
