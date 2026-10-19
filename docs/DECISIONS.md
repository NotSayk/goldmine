# Décisions d'implémentation

Ce fichier recense tout ce que le livret ne tranche pas, les écarts assumés et les hypothèses provisoires. La source de vérité des règles reste [`REGLES.md`](REGLES.md).

## 1. Cas non précisés par le livret (section 8 de `REGLES.md`)

Chaque cas est isolé dans une fonction nommée et documentée de [`packages/engine/src/rules/houseRules.ts`](../packages/engine/src/rules/houseRules.ts) : changer le comportement tient en une ligne.

| #   | Cas                                                          | Choix implémenté                                                                                        | Fonction                                |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Nain juste à gauche du dragon qui pioche une « porte rouge » | Il reste sur place, l'or est quand même pris                                                            | `resolveMoveTowardDragon`               |
| 2   | « Échange » avec un nain déjà sur la Sortie                  | Interdit : seuls les nains encore sur la piste sont ciblables                                           | `isSwapTargetAllowed`                   |
| 3   | « Tous ensemble » et nains déjà sortis                       | Seuls les nains sur la piste avancent                                                                   | `isMovedByAllTogether`                  |
| 4   | Pioche Extraction vide en cours de manche                    | Fin immédiate de la manche, décompte normal                                                             | `endsRoundWhenExtractionDeckEmpty`      |
| 5   | Aucun nain sorti avec de l'or (manches 1 et 2)               | Pas de Grosses pépites ; la manche suivante commence par le joueur qui suit le précédent premier joueur | `nextFirstPlayerWithoutWinner`          |
| 6   | Égalité en manche 3 entre un joueur sorti et un éliminé      | Le joueur sorti l'emporte                                                                               | `compareExitedWithEliminatedOnFinalTie` |
| 7   | Égalité en manche 3 entre deux éliminés                      | Victoire partagée                                                                                       | `compareEliminatedOnFinalTie`           |
| 8   | Cartes Bonus d'or d'un nain éliminé                          | Défaussées dans la défausse Exit (elles reviendront après un remélange)                                 | `bonusCardsOfEliminatedGoTo`            |
| 9   | Place sur l'échelle de la Sortie                             | Jamais saturée (6 nains au plus) ; vérifiée par une assertion                                           | `assertLadderHasRoom`                   |
| 10  | Répartition des cartes                                       | Composition provisoire, voir section 3                                                                  | `config/decks.ts`                       |

## 2. Autres décisions

**Règles**

- **Carte Extraction avec déplacement** : la carte rejoint la pile d'or _avant_ le déplacement. Un nain qui sort grâce à une « porte bleue » emporte donc cette carte (`addsGoldBeforeMoving`). Sans effet en partie normale ; dans la variante, l'équipier ne la récupère pas dans sa nouvelle pile.
- **Échange avec une seule cible possible** : appliqué directement, sans demander de choix (`swapNeedsExplicitTarget`). Échanger avec un nain sur la même carte est autorisé (sans effet).
- **Carte Exit dont aucune action n'est jouable** (« Échange » seul alors qu'aucun autre nain n'est dans la mine) : défaussée sans effet, le tour se termine.
- **Carte à deux actions identiques** : jouée sans demander de choix.
- **Ordre des cartes fixé à l'avance** : les deux pioches sont mélangées une fois, à la mise en place de chaque manche ; ensuite, les cartes sortent uniquement par le dessus, dans cet ordre. Quand la pioche Exit se vide, la défausse est remélangée **dès la fin de l'action qui l'a vidée**, jamais au moment où un joueur pioche. Un test de propriété le vérifie sur des centaines de parties. Si la pioche et la défausse sont vides (toutes les cartes gardées comme Bonus), piocher une carte Exit est refusé (`EXIT_DECK_EMPTY`).
- **Le Wagon** est traité comme une Mine quand le dragon le dépasse : il passe côté rouge et les nains présents sont éliminés.
- **Nains encore dans la mine quand la pioche Extraction s'épuise** (cas 4) : ils ne sont pas sortis, ils sont traités comme éliminés (or perdu, pas de classement).
- **Fin par le dragon** : quand il arrive devant la Sortie, tous les nains encore dans la mine ont forcément déjà été rattrapés (ils sont toujours à gauche du dragon).
- **Premier joueur de la manche 1** : « le plus jeune » ne peut pas être deviné en ligne. L'hôte le désigne dans le salon, ou laisse le tirage au sort (par défaut).

**Variante « Double pioche »**

- Proposée uniquement à 2 joueurs (le moteur refuse sinon), désactivée par défaut, conseillée dans le salon.
- Ordre de jeu : les deux nains du premier joueur, puis ceux du second, toujours dans le même ordre.
- Manche suivante : elle commence par le premier nain du joueur vainqueur.
- Arrivées simultanées (« Tous ensemble ») : ordre de jeu des nains en partant du nain actif.
- Les cartes Bonus d'or font partie de la pile commune et partent avec le nain qui sort.
- Manches 1 et 2 : chaque nain sorti est classé séparément (un joueur peut prendre plusieurs places). Manche 3 : le score d'un joueur additionne l'or de ses nains sortis et toutes ses Grosses pépites ; le départage utilise la meilleure place de ses nains sur l'échelle.
- L'« Échange » peut cibler l'équipier.

**Informations cachées et réseau**

- **L'or de chaque joueur est visible de tous** (demande du commanditaire, écart assumé par rapport au livret où les cartes sont posées face cachée et où il faut s'en souvenir). Réglage en une ligne : `pileValuesArePublic` dans `houseRules.ts` ; s'il renvoie `false`, le serveur n'envoie plus que le nombre de cartes des piles adverses.
- **La pioche Extraction est face cachée** (demande du commanditaire, écart assumé : le livret la pose face visible, on voit la carte avant de la prendre). On découvre la carte en la piochant et elle est montrée à tous à ce moment-là. Le mécanisme du dragon est inchangé : après chaque carte creusée, si la carte suivante est un dragon, elle est retournée devant tout le monde et le dragon avance. Seul le nombre total de cartes restantes est envoyé, jamais le détail par type. Réglage en une ligne : `extractionTopIsPublic` dans `houseRules.ts`.
- **Nain éliminé** : son disque reste sur la galerie où il est tombé (celle que le dragon vient de brûler et de faire passer à sa droite), pour que chacun voie où il est mort. L'événement `DwarfEliminated` indique cette carte et l'or perdu (`goldLost`, masqué pour les autres joueurs si les piles sont cachées).
- Le nombre de cartes Bonus d'or gardées par chaque joueur est public (on voit qu'il garde la carte, et sa valeur est fixe).
- Une carte Exit à deux actions en attente de choix n'est visible que de son auteur ; elle devient publique quand l'action est jouée.
- Les résultats de manche (or de chaque nain sorti) sont révélés au décompte.
- Le serveur mélange avec un générateur **HMAC-SHA256 à clé secrète** (déterministe, donc rejouable côté serveur, mais imprévisible pour un client qui observe les cartes révélées). Les tests et les simulations utilisent un générateur à graine (sfc32).

**Temps de jeu** (demande du commanditaire, hors règles)

- Chaque joueur humain a **45 secondes** par tour (`TURN_TIME_MS`, `0` pour désactiver). Le chrono est tenu par le serveur ; les clients affichent un compte à rebours.
- Temps écoulé : le serveur lance une pièce. Pile, il creuse ; face, il fuit. Si une seule action est possible (pioche Exit vide), elle est jouée sans tirage. Tous les écrans montrent la pièce, puis le coup joué.
- Carte Exit à deux actions piochée en fin de chrono : le joueur garde au moins 15 secondes pour la lire ; ensuite, pile ou face entre les deux actions. Cible d'un échange non choisie : tirée au hasard.
- Les bots (et les joueurs remplacés par un bot) ne sont pas chronométrés. Le chrono repart de zéro à chaque nouveau tour.

**Salons et connexions** (choix hors règles)

- Un joueur qui quitte une partie en cours est remplacé définitivement par un bot.
- Après le délai de grâce (30 s par défaut), l'hôte peut **remplacer** un joueur déconnecté par un bot (il reprend la main à sa reconnexion) ou **passer son tour** (action système `skipTurn` du moteur ; une carte Exit en attente de choix est alors défaussée sans effet).
- Si l'hôte reste déconnecté au-delà du délai de grâce, le premier humain connecté devient hôte.
- Seul l'hôte lance les manches suivantes et la partie.

## 3. Composition des paquets : PROVISOIRE

Le livret ne donne pas la répartition des cartes. Composition utilisée, définie uniquement dans [`packages/engine/src/config/decks.ts`](../packages/engine/src/config/decks.ts) et marquée `PROVISIONAL` :

| Cartes Extraction (58)                  | Nombre |
| --------------------------------------- | ------ |
| Dragon                                  | 8      |
| Porte rouge (2 pépites, vers le dragon) | 20     |
| Porte bleue (1 pépite, vers la Sortie)  | 20     |
| Sans porte (1 pépite, sur place)        | 10     |

| Cartes Exit (16, une seule action chacune) | Nombre |
| ------------------------------------------ | ------ |
| Petit pas                                  | 4      |
| Double pas                                 | 3      |
| Tous ensemble                              | 3      |
| Échange                                    | 3      |
| Bonus d'or                                 | 3      |

Le moteur gère aussi les cartes à deux actions (choix, repli forcé si une action est impossible), testées avec une composition dédiée.

Dans l'interface, les cartes portent des noms propres à cette version (« Filon profond », « Galerie de sortie », « Petite veine », « Un pas », « Deux pas », « En avant tous ! », « Échange de places », « Trésor caché ») au lieu des intitulés imprimés de l'édition originale.

## 4. Résultats de simulation

Commande : `npm run simulate` (1 000 parties, soit 3 000 manches, par configuration). Bots « heuristique » : ils creusent tant que le risque reste faible au regard du gain, puis fuient. Bots « aléatoire » : choix uniforme entre les deux actions. Simulation refaite avec la pioche Extraction cachée (les bots raisonnent alors sur une carte moyenne de la boîte) : les chiffres ne bougent pas de plus de 0,3 point.

**Composition provisoire (8 dragons), bots heuristiques**

| Configuration        | Tours / manche | Cartes Extraction / manche | Cartes Exit / manche | Pas du dragon / manche | Fin par le dragon | Fin : mine vide | Manches sans vainqueur |
| -------------------- | -------------- | -------------------------- | -------------------- | ---------------------- | ----------------- | --------------- | ---------------------- |
| 2 joueurs            | 21,1           | 13,3                       | 7,8                  | 2,25                   | 0,0 %             | 100 %           | 1,6 %                  |
| 2 joueurs (variante) | 31,4           | 19,8                       | 11,5                 | 3,38                   | 0,1 %             | 99,9 %          | 0,4 %                  |
| 3 joueurs            | 27,2           | 17,4                       | 9,8                  | 2,95                   | 0,0 %             | 100 %           | 1,2 %                  |
| 4 joueurs            | 30,8           | 20,1                       | 10,7                 | 3,46                   | 0,2 %             | 99,8 %          | 1,5 %                  |
| 5 joueurs            | 33,3           | 22,2                       | 11,1                 | 3,84                   | 0,1 %             | 99,9 %          | 1,3 %                  |
| 6 joueurs            | 34,8           | 23,5                       | 11,3                 | 4,12                   | 0,1 %             | 99,9 %          | 2,3 %                  |

| Configuration        | Nain éliminé par manche | Or d'un nain sorti (moy. / médiane / p90 / max) | Score final (moy. / max) | Victoires par place autour de la table |
| -------------------- | ----------------------- | ----------------------------------------------- | ------------------------ | -------------------------------------- |
| 2 joueurs            | 7,6 %                   | 11,9 / 12 / 17 / 27                             | 16,1 / 32                | 49 % · 51 %                            |
| 2 joueurs (variante) | 11 %                    | 9,3 / 10 / 16 / 25                              | 22,9 / 45                | 50 % · 50 %                            |
| 3 joueurs            | 12 %                    | 10,4 / 10 / 15 / 24                             | 13,3 / 28                | 31 % · 32 % · 38 %                     |
| 4 joueurs            | 17 à 20 %               | 9,2 / 9 / 14 / 24                               | 10,5 / 27                | 25 % · 25 % · 27 % · 25 %              |
| 5 joueurs            | 23 à 25 %               | 8,3 / 8 / 13 / 23                               | 8,7 / 25                 | 19 à 21 % chacun                       |
| 6 joueurs            | 28 à 31 %               | 7,5 / 7 / 12 / 22                               | 7,3 / 25                 | 16 à 18 % chacun                       |

Bots aléatoires (8 dragons) : 16 à 30 tours par manche, 4 à 6 % d'éliminations par manche, fin par le dragon dans moins de 0,3 % des manches.

**Comparaison avec plus de dragons** (bots heuristiques, total de 58 cartes conservé en retirant des portes rouges et bleues ; `npm run simulate -- --dragons N`) :

| Dragons        | Tours / manche (2 → 6 joueurs) | Nain éliminé par manche (2 → 6 joueurs) | Fin par le dragon | Manches sans vainqueur (2 → 6 joueurs) |
| -------------- | ------------------------------ | --------------------------------------- | ----------------- | -------------------------------------- |
| 8 (provisoire) | 21 → 35                        | 8 % → 30 %                              | ≤ 0,2 %           | 1,6 % → 2,3 %                          |
| 10             | 20 → 29                        | 12 % → 43 %                             | ≤ 1 %             | 2,8 % → 5,8 %                          |
| 12             | 19 → 24                        | 17 % → 55 %                             | ≤ 2,2 %           | 5,4 % → 13,6 %                         |

**Constats**

- Le dragon peut atteindre la Sortie (il faut 7 déplacements, la pioche contient 8 dragons) ; en pratique, la manche se termine presque toujours parce que tous les nains sont sortis ou éliminés, ce qui est cohérent avec le livret (le dragon « arrivé devant la Sortie » est une fin de secours).
- Les manches ne sont ni triviales ni interminables : 20 à 35 tours, dont 13 à 24 cartes creusées ; aucune partie bloquée sur plus de 70 000 manches simulées.
- La tension monte avec le nombre de joueurs (plus de cartes creusées entre deux tours, donc plus de dragons) : de 8 % d'éliminations par manche à 2 joueurs jusqu'à 30 % à 6 joueurs.
- Pas d'avantage marqué selon la place autour de la table.

**Proposition** : garder 8 dragons tant que la composition réelle n'est pas connue. Si le jeu paraît trop sûr à 2 ou 3 joueurs, 10 dragons rendent le dragon nettement plus menaçant sans rendre les manches à 6 joueurs punitives. **Rien n'est figé** : la composition doit être confirmée par un comptage des cartes d'une vraie boîte.

## 5. Écarts par rapport au prompt de départ

- Branche : le prompt mentionne `claude/beautiful-brown-lly20m`, mais la session imposait `claude/modest-planck-m4h6hp` ; tout le travail y est poussé.
- Déploiement : pas de Dockerfile, à la demande de l'utilisateur (pas de Docker disponible). Le déploiement se fait avec Node.js et npm (`npm ci`, `npm run build`, `npm start`), voir le README.
- `npm install` utilise `legacy-peer-deps` (fichier `.npmrc`) : le résolveur de npm 10 plante sur des dépendances pair optionnelles de Vite ; les dépendances pair nécessaires sont déclarées explicitement.
