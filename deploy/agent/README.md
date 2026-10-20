# Agent de maintenance quotidien

Un agent Claude Code tourne **une fois par jour** dans un conteneur isolé, en autonomie : il lit les journaux du jeu, applique les mises à jour, lance les tests, mesure la latence, **pousse ses corrections directement sur `main`**, puis écrit un rapport. Le **serveur** (pas l'agent) envoie ce rapport par mail.

## Garde-fous

- Conteneur dédié : aucun accès à Docker, au réseau interne du jeu ni à Caddy ; seuls `data/` (rapports) et `feed/` (journaux, lecture seule) sont montés.
- Permissions larges mais bornées (`settings.json`) : git, npm, npx, node, curl et les outils shell courants. Interdits : `sudo`, `push --force`, suppression de branches distantes.
- Avant chaque push sur `main`, l'agent doit faire passer en local ce que vérifie la CI (`check`, `coverage`, `build`).
- Il ne déploie jamais : pousser sur `main` ne change pas la production ; tu lances le déploiement du jeu (`~/apps/games/goldmine`) après avoir lu le rapport.
- Seules les variables Claude et GitHub entrent dans le conteneur ; les identifiants SMTP restent dans `.env`, lus par `daily.sh`.
- Le jeton GitHub est lisible par l'agent : limite-le à ce dépôt (Contents = lecture/écriture). Si `main` est protégée, autorise les pushs directs (ou retire la règle « pull request obligatoire »).

## Installation sur le VPS (en tant que `sayk`)

```bash
mkdir -p ~/apps/agent && cd ~/apps/agent
cp -r ~/apps/games/goldmine/src/deploy/agent/. .
cp .env.example .env && chmod 600 .env && nano .env
docker compose build
./daily.sh                       # premier essai à la main
(crontab -l 2>/dev/null; echo "17 7 * * * /home/sayk/apps/agent/daily.sh >> /home/sayk/apps/agent/cron.log 2>&1") | crontab -
```

## Mise à jour de l'agent

```bash
cd ~/apps/games/goldmine/src && git pull origin main
cd ~/apps/agent && cp -r ~/apps/games/goldmine/src/deploy/agent/. .   # .env, data/ et feed/ ne sont pas touchés
docker compose build
./daily.sh --mail                # renvoie le rapport du jour : teste seulement l'envoi
./daily.sh                       # cycle complet
```
