# Agent de maintenance quotidien

Un agent Claude Code tourne **une fois par jour** dans un conteneur isolé : il lit les journaux du jeu, vérifie les mises à jour, lance les tests, mesure la latence, pousse ses corrections sur une branche `agent/AAAA-MM-JJ`, puis écrit un rapport. Le **serveur** (pas l'agent) envoie ce rapport par mail.

## Garde-fous

- Conteneur dédié : aucun accès à Docker, au réseau interne du jeu ni à Caddy ; seuls `data/` (rapports) et `feed/` (journaux, lecture seule) sont montés.
- Permissions strictes (`settings.json`) : pas de `sudo`, pas de push sur `main`, pas de `--dangerously-skip-permissions`. Une commande non listée est refusée.
- Il ne déploie jamais : tu relis la branche, tu la fusionnes, puis tu lances `~/apps/goldmine/update.sh`.
- Les identifiants SMTP ne sont jamais donnés à l'agent (ils restent dans `daily.sh`).
- Le jeton GitHub, lui, est lisible par l'agent : limite-le à ce dépôt et active la **protection de `main`** (pull request obligatoire).

## Installation sur le VPS (en tant que `sayk`)

```bash
mkdir -p ~/apps/agent && cd ~/apps/agent
cp -r ~/apps/goldmine/src/deploy/agent/. .
cp .env.example .env && chmod 600 .env && nano .env
docker compose build
./daily.sh                       # premier essai à la main
(crontab -l 2>/dev/null; echo "17 7 * * * /home/sayk/apps/agent/daily.sh >> /home/sayk/apps/agent/cron.log 2>&1") | crontab -
```
