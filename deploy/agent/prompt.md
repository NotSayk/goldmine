Fais le cycle quotidien de maintenance, dans cet ordre :

1. Synchronise : `cd ~/workspace/game && git fetch origin && git checkout main && git pull origin main`.
2. Lis les journaux exportés du serveur dans ~/feed/ (goldmine.log = dernières 24 h, stats.txt = mémoire/CPU). Repère erreurs, déconnexions anormales, pics de mémoire.
3. Mises à jour : `npm outdated`, `npm audit`. Note celles qui comptent (sécurité, versions majeures).
4. Qualité : `npm ci`, puis `npm run check` (lint, typecheck, tests). Note tout échec.
5. Performance : construis (`npm run build`), lance le serveur en local sur un port libre, et mesure : temps de réponse de `/healthz` (30 requêtes), temps d'établissement d'une WebSocket sur `/ws`, et un petit scénario de salons simulés. Mesure aussi la latence réelle de https://goldmine.sayk.fr/healthz (30 requêtes). Compare avec ~/data/metrics.json (valeurs de la veille), puis réécris ce fichier avec les valeurs du jour.
6. Corrections : si tu trouves un bug réel ou une optimisation mesurable, crée la branche `agent/AAAA-MM-JJ`, corrige avec un test, relance `npm run check`, commit, puis `git push origin agent/AAAA-MM-JJ`. Une seule branche par jour, des changements petits et lisibles.
7. Rapport : écris ~/data/reports/AAAA-MM-JJ.md avec : résumé en 3 lignes, état du serveur (erreurs, mémoire), latences (aujourd'hui vs hier), mises à jour disponibles, corrections poussées (nom de la branche, ce qui change, preuve), et ce que tu n'as pas pu faire.
