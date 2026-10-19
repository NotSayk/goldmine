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
- **La pioche Extraction est face cachée** (demande du commanditaire, écart assumé : le livret la pose face visible, on voit la carte avant de la prendre). On découvre la carte en la piochant et elle est montrée à tous à ce moment-là. Seul le nombre total de cartes restantes est envoyé, jamais le détail par type. Réglage en une ligne : `extractionTopIsPublic` dans `houseRules.ts`.
- **Le dragon n'agit que lorsqu'on le pioche** (demande du commanditaire, conséquence de la pioche cachée ; décision E, `dragonActsWhenDrawn`). Le livret fait avancer Dragobert dès qu'une carte dragon apparaît sur le dessus de la pioche visible, en chaîne. En ligne, c'est le joueur qui pioche la carte dragon : Dragobert avance d'une carte (Mine retournée, nains éliminés comme dans le livret), et rien d'autre : pas d'or, le nain du joueur ne bouge pas, la carte est rangée dans la boîte et le tour passe. Un dragon sur le dessus de la pioche ne fait rien tant que personne ne le pioche. Avec la pioche visible, la règle du livret s'applique (testée à part).
- **Nain éliminé** : son disque reste sur la carte Mine où il est tombé (celle que le dragon vient de retourner sur sa face rouge et de faire passer à sa droite), pour que chacun voie où il est mort. L'événement `DwarfEliminated` indique cette carte et l'or perdu (`goldLost`, masqué pour les autres joueurs si les piles sont cachées).
- Le nombre de cartes Bonus d'or gardées par chaque joueur est public (on voit qu'il garde la carte, et sa valeur est fixe).
- Une carte Exit à deux actions en attente de choix n'est visible que de son auteur ; elle devient publique quand l'action est jouée.
- Les résultats de manche (or de chaque nain sorti) sont révélés au décompte.
- Le serveur mélange avec un générateur **HMAC-SHA256 à clé secrète** (déterministe, donc rejouable côté serveur, mais imprévisible pour un client qui observe les cartes révélées). Les tests et les simulations utilisent un générateur à graine (sfc32).

**Temps de jeu** (demande du commanditaire, hors règles)

- Chaque joueur humain a **45 secondes** par tour (`TURN_TIME_MS`, `0` pour désactiver). Le chrono est tenu par le serveur ; les clients affichent un compte à rebours.
- Temps écoulé : le serveur lance une pièce. Pile, il creuse ; face, il fuit. Si une seule action est possible (pioche Exit vide), elle est jouée sans tirage. Tous les écrans montrent la pièce, puis le coup joué.
- Carte Exit à deux actions piochée en fin de chrono : le joueur garde au moins 15 secondes pour la lire ; ensuite, pile ou face entre les deux actions. Cible d'un échange non choisie : tirée au hasard.
- Les bots (et les joueurs remplacés par un bot) ne sont pas chronométrés. Le chrono repart de zéro à chaque nouveau tour, **après** les animations du coup précédent (le serveur connaît leur durée, voir section 6) : regarder une cinématique ne coûte pas de temps de jeu.

**Salons et connexions** (choix hors règles)

- **Salons publics ou privés** : un salon est public par défaut et apparaît dans la liste « Salons ouverts » de l'accueil (salons en attente et pas complets, 20 au plus, les plus récents d'abord, rafraîchie toutes les 4 s) ; l'hôte peut le rendre privé, on n'y entre alors qu'avec le code ou le lien.
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

**Depuis la décision E** (dragon pioché, `npm run simulate`, 2 000 parties par configuration, bots heuristiques) : 24 à 40 tours par manche (2 → 6 joueurs), 2,1 à 4,0 pas du dragon par manche, de 2 % à 20 % de risque pour un nain d'être éliminé dans une manche, fin par le dragon quasi nulle, au plus 1,1 % de manches sans vainqueur. Le dragon est un peu moins menaçant (un dragon pioché ne vaut qu'un pas, et coûte un tour à celui qui le pioche) : une composition à 10 dragons est à essayer si les manches paraissent trop sûres.

**Proposition** : garder 8 dragons tant que la composition réelle n'est pas connue. Si le jeu paraît trop sûr à 2 ou 3 joueurs, 10 dragons rendent le dragon nettement plus menaçant sans rendre les manches à 6 joueurs punitives. **Rien n'est figé** : la composition doit être confirmée par un comptage des cartes d'une vraie boîte.

## 5. Écarts par rapport au prompt de départ

- Branche : le prompt mentionne `claude/beautiful-brown-lly20m`, mais la session imposait `claude/modest-planck-m4h6hp` ; tout le travail y est poussé.
- Déploiement : pas de Dockerfile, à la demande de l'utilisateur (pas de Docker disponible). Le déploiement se fait avec Node.js et npm (`npm ci`, `npm run build`, `npm start`), voir le README.
- `npm install` utilise `legacy-peer-deps` (fichier `.npmrc`) : le résolveur de npm 10 plante sur des dépendances pair optionnelles de Vite ; les dépendances pair nécessaires sont déclarées explicitement.

## 6. Refonte visuelle et animations

Réalisée d'après [`PROMPT_DESIGN.md`](PROMPT_DESIGN.md), jalons 1 à 6 et réactions rapides. À la demande de l'utilisateur, **le son et la musique (jalon 7) et les scènes animées de l'accueil et du salon (jalon 8) ne sont pas faits** ; les réactions rapides (emotes) du jalon 8 le sont.

### Direction artistique

- « Fantasy sombre atmosphérique » : fonds nuit et pierre froide, or chaud pour les récompenses, braise pour le danger, cyan de cristal pour l'interface. Toutes les couleurs sont des jetons CSS ([`styles/tokens.css`](../packages/client/src/styles/tokens.css)) : thème « mine » et variante « contraste élevé » (aplats noirs, bordures blanches, sans voile décoratif), choisie automatiquement si le système demande plus de contraste. L'ancien thème clair est retiré.
- Polices auto-hébergées (sous-ensemble latin, variables) : **Cinzel** pour les titres, scores et noms de cartes, **Inter** pour le reste. Aucune requête vers un CDN.
- Matières par dégradés et bruit SVG (`feTurbulence` en image de fond statique) : grain de papier sur les cartes, roche du décor ; aucune image matricielle.
- Les emojis sont remplacés par des pictogrammes SVG originaux ([`assets/Icons.tsx`](../packages/client/src/assets/Icons.tsx)).

### Noms des cartes et illustrations

- **Noms et descriptions des cartes : ceux du livret** (demande de l'utilisateur, livret fourni) : « Un dragon aux œufs d'or », « Il est l'or, monseignor ! », « D'l'or, j'adore ! », « Un dragon ! UN DRAGON ! », « Petit pas », « Double pas », « Tous ensemble ! », « Échange inter-nain-tional », « Bonus d'or », le dragon **Dragobert**, les cartes Mine, Wagon et Sortie de la mine. Ils sont regroupés dans [`i18n/fr.ts`](../packages/client/src/i18n/fr.ts) et [`branding.ts`](../packages/shared/src/branding.ts). Le nom du jeu reste un nom de travail.
- **Illustrations : dessins originaux uniquement.** L'utilisateur a demandé de découper les illustrations du livret pour remplacer les SVG ; ce n'est pas fait, car ces dessins sont protégés (© Franckh-Kosmos / IELLO, tous droits réservés) et les copier dans le dépôt reviendrait à les redistribuer. Les SVG gardent la lecture des vraies cartes (porte rouge vers le dragon, porte bleue vers la Sortie, nombre de pépites, flèches des actions Exit).
- Toute publication (nom, textes des cartes) reste soumise à l'accord de l'éditeur.

### Dépendances : aucune ajoutée au client

Le prompt suggérait GSAP, Framer Motion, PixiJS ou tsParticles, matter.js et Howler.js. Aucune n'est utilisée :

| Besoin                        | Choix                                                                                          | Raison                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Timelines, FLIP, retournement | Web Animations API (`element.animate`) + CSS                                                   | Natif, annulable, accélérable ; 0 Ko (GSAP : ~25 Ko gzip, licence spécifique)                                                 |
| Particules                    | Moteur canvas 2D maison ([`fx/particles.ts`](../packages/client/src/fx/particles.ts)), différé | 2,3 Ko gzip pour poussière, étincelles, cendres, braises, confettis (PixiJS : ~100 Ko gzip, WebGL superflu ici)               |
| Physique des pépites          | Gravité, rebonds, chocs entre disques et attraction vers la pile, dans le même module          | Une vingtaine de corps au plus : quelques dizaines de lignes au lieu de matter.js (~25 Ko gzip)                               |
| Son                           | Non fait (demande de l'utilisateur)                                                            | Le réalisateur garde des repères `sound` dans chaque séquence : un moteur Web Audio pourra s'y brancher sans autre changement |
| Captures et mesures           | `playwright-core` **1.56.1** (développement seulement, version exacte)                         | Chromium est déjà installé ; `npm audit` : 0 vulnérabilité                                                                    |

Sont chargés à la demande (`import()`) : les particules d'ambiance, le moteur de particules et le générateur du récapitulatif.

### Architecture d'animation : le réalisateur

- `src/director/` transforme les événements filtrés du serveur en **séquences** (titre, visuel, durée, repères datés : révélation, son, tremblement, gerbe de particules, travelling, souffle de flammes, vibration) jouées une par une. Une séquence est passable (clic, bouton « Passer », Échap ; Maj+Échap ou « Tout » vide la file).
- **Deux vues** : la dernière vue du serveur pilote les actions et les fenêtres de choix (jamais retardées) ; la vue de la table la rattrape au repère `reveal` de la séquence. Passer une séquence joue sa révélation : la table finit toujours sur la vue du serveur. Si une nouvelle vue arrive au milieu d'une séquence, la table saute à l'état final de celle-ci ; un garde-fou empêche la table d'avoir plus de 14 s de retard. Jouer un coup vide la file.
- Quand un coup réveille le dragon, déplacements, sortie et poussière sont rejoués au début de sa cinématique : nains, dragon et cartes retournées bougent avec les flammes.
- **Suspense sans fuite** : la pause avant le retournement est la même pour toutes les cartes. Les séquences ne reçoivent que la vue et les événements filtrés du joueur ; un test joue des parties complètes avec les piles cachées et vérifie qu'aucune séquence ne montre l'or d'un autre joueur ni une carte Exit en attente, et que le client n'importe aucun code du moteur.

### Rythme (retour de l'utilisateur : « trop rapide »)

- Les durées sont communes au client et au serveur ([`shared/src/pacing.ts`](../packages/shared/src/pacing.ts)) : une pioche dure environ 4,3 s (vol 0,65 s, suspense 0,65 s, retournement 0,38 s, lecture 2,6 s) ; le nom et l'effet de la carte s'affichent dès le début du retournement, soit près de 3 s de lecture, le dragon 2,8 s (+0,7 s par pas en chaîne, 4,8 s au plus), une élimination 3,8 s, un bond de nain 0,44 s par carte.
- **Les coups des bots se jouent au même rythme que ceux des joueurs** : le serveur estime la durée des animations de chaque coup (`animationMs`) et un bot ne joue qu'une fois ce temps écoulé (plus 0,9 s de réflexion, et au moins `BOT_DELAY_MS`). La version courte pour les spectateurs prévue par le prompt et l'accélération quand c'est son tour sont retirées ; la file n'accélère plus que si elle déborde vraiment (×1,25 à partir de 3 séquences en attente, ×1,6 à partir de 5), par exemple après une reconnexion. `PACE_ANIMATIONS=0` désactive ce rythme côté serveur (tests, captures).
- Réglage « Vitesse des cinématiques : rapide » (×1,5) pour qui préfère.

### Accessibilité et réglages

- `prefers-reduced-motion` (ou le réglage « Animations réduites ») : les animations se figent sur leur état final mais gardent leurs délais, la carte piochée est donc montrée au même moment, en fondu ; pas de tremblement, travelling, parallaxe ni particules.
- Qualité **basse / moyenne / élevée / auto** : basse coupe particules, physique et animations de repos ; élevée ajoute la distorsion de chaleur et double la résolution des particules. « Auto » commence à « moyenne » sur écran tactile ou petite machine et baisse d'un cran si la partie passe sous 40 images/s.
- Le journal de partie (`aria-live`) reste la source pour les lecteurs d'écran ; décors et effets sont `aria-hidden` ; les boutons « Passer » restent accessibles au clavier. Cibles tactiles d'au moins 44 px, focus visible doré.
- Daltonisme : chaque nain garde sa couleur (palette Okabe-Ito) **et** son symbole, dessiné en grand sur le corps du personnage ; tous les symboles sont symétriques pour que le nain puisse regarder à droite.
- Contrastes mesurés (WCAG) : texte 14,4:1, texte secondaire 8,8:1, texte discret 5,6:1, or 12,2:1, cyan 10,0:1, braise 6,8:1, vert 10,6:1, texte des boutons or 9,2:1 et « Fuir » 5,1:1 ou plus ; contraste élevé : 21:1.

### Le plateau reste visible

- Le coup mis en scène (carte piochée, dragon, sortie, élimination) s'affiche **sur la zone des pioches, sous la piste**, jamais par-dessus la piste ni en plein écran : on voit toujours les nains bouger et le dragon avancer. L'annonce d'une élimination garde un éclair rouge sur les bords de l'écran. La carte piochée peut toujours voler jusqu'à la pile du joueur (le décor reste rogné aux bords du plateau, pas la mise en scène).
- Le choix d'une action sur une carte Exit à deux actions s'affiche sous le plateau au lieu d'ouvrir une fenêtre.
- **Échange sans menu** : pour « Échange inter-nain-tional », on touche directement le nain voulu sur le plateau. Les nains échangeables sont entourés, brillent, portent un petit badge d'échange et ont une zone de toucher plus large que le jeton ; ce sont de vrais boutons (le focus va sur le premier, on passe aux autres avec Tab). Sous le plateau, une simple consigne et le compte à rebours.
- **Cartes redessinées (sauf le dragon, inchangé)**, toujours en dessins originaux : les cartes Mine montrent une galerie boisée (montants, chapeau, lanterne, cristaux et pépite dans la paroi), en feu sur leur face rouge (bois calciné, braises, flammes) ; le Wagon porte un wagonnet plein d'or ; la Sortie s'ouvre sur une vallée au soleil. **Une voie ferrée continue** court en bas de toutes les cartes, à la même hauteur et avec des traverses espacées pour que le motif se raccorde : posées côte à côte, les cartes forment une seule voie, du dragon jusqu'au butoir de la Sortie, d'où part le chemin vers le jour ; le wagonnet roule dessus. Les cartes Extraction ont un parchemin à équerres dorées, une scène encadrée (porte rouge à droite, porte bleue à gauche, front de taille veiné d'or) avec la flèche de déplacement ou le symbole « sur place », et une plaque avec l'or gagné. Les faces Exit ont des médaillons cerclés d'argent et un « ou » encadré de filets ; les dos sont plus riches (cuir repoussé et pioches croisées, sarcelle rayonnante). Les dégradés sont déclarés une seule fois dans la page et partagés par toutes les cartes ; aucun filtre SVG, pour garder les animations fluides.
- Correction au passage : les marges des faces Exit se mesuraient sur la largeur du plateau et non sur celle de la carte (unités `cqw` sur l'élément conteneur lui-même) ; la mise en page passe dans un élément intérieur, si bien que la face tient dans la carte à toutes les tailles.
- **Les pioches ne bougent jamais** : le zoom de la caméra et les tremblements ne touchent que la piste et le décor ; les pioches sont posées dans une zone fixe sous la piste, pour qu'on puisse toujours les viser. Le nombre de cartes restantes est décalé sous la tranche de la pile, pour ne plus être caché.
- Les emplacements de l'échelle de la Sortie ont la silhouette des nains-personnages.
- **On joue en touchant les pioches** : les boutons « Creuser » et « Fuir » sont retirés ; la pioche Extraction (creuser) et la pioche Exit (fuir) sont des boutons, entourés d'un anneau doré quand c'est à vous (sans étiquette par-dessus : elle cachait la carte et n'apportait rien, le nom de chaque pioche reste lu par les lecteurs d'écran : « Creuser : … », « Fuir : … »). Un bandeau sous le plateau dit quoi faire ou pourquoi ce n'est pas possible. À votre tour, toucher la mise en scène passe d'un coup toutes les animations en attente, pour dégager les pioches.
- **Le dragon ne recule jamais** : le moteur le garantit (test de propriété sur des milliers de coups). Le recul signalé venait de la mise en scène de l'échange prévu par le livret (la carte Mine dépassée passe derrière le dragon) : elle glissait vers la droite en s'embrasant en même temps que le dragon avançait. Désormais le dragon passe par-dessus, la carte glisse dessous et ne se retourne qu'une fois l'échange fini, et le souffle part de la gueule du dragon vers la Sortie. Un garde-fou écrit une erreur dans la console si la table montrait un jour le dragon reculer dans une manche (la partie de fumée échoue alors).

### Réactions rapides et apparence

- Sept réactions (bravo, rire, oh non, ça chauffe, de l'or, salut, et « Culé ! » avec l'emoji 🫃🏿 demandé par les joueurs, seul emoji du système utilisé), envoyées comme intentions `emote`, validées par zod et **limitées par le serveur** (rafale de 3, puis une toutes les 2 s, par joueur), relayées à tout le salon. Masquables dans les réglages.
- Apparence des nains, choisie dans le salon (intention `setLook`, refusée pendant la partie), visible de tous : **couleur** (6, chacune avec son symbole pour le daltonisme), **chapeau** (casque de mineur, capuche, casque à cornes, bonnet, couronne), **barbe** (longue, tressée, courte, moustache), **couleur de barbe** (5) et **teint** (4), plus un bouton « Au hasard ». Les vignettes montrent chaque variante sur son propre nain.
- **Une couleur par joueur** : le serveur refuse une couleur déjà prise (`COLOR_TAKEN`) et les pastilles prises sont barrées et désactivées. Un nouveau venu (humain ou bot) prend la première couleur libre, avec une apparence par défaut propre à cette couleur. La couleur choisie est transmise au moteur (`PlayerInfo.color`, validée : de 0 à 5, sans doublon) ; dans la variante à 2 joueurs, le second nain prend une couleur libre.
- **Son propre nain se repère d'un coup d'œil** : un contour lumineux suit toute sa silhouette (corps, tête, chapeau, barbe), une flèche dorée flotte au-dessus de sa tête et un anneau doré reste au sol. Le contour est dessiné dans le jeton lui-même (formes repeintes en épais derrière le personnage), sans filtre CSS, donc sans coût pendant les animations. Il est aussi affiché dans la liste des joueurs et dans le salon.

### Performance (mesurée avec `npm run perf`, Chromium 141 sans écran ni carte graphique)

| Mesure                                                 | Résultat                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Chemin critique (HTML + JS + CSS, gzip)                | **115 Ko** (JS 102 Ko, CSS 13 Ko), budget 250 Ko ; + 73 Ko de polices woff2 préchargées |
| Modules différés                                       | particules 2,3 Ko, ambiance 1,0 Ko, récapitulatif 1,7 Ko (gzip)                         |
| Chargement, ordinateur (local)                         | DOM prêt en 60 ms, formulaire prêt en 110 ms                                            |
| Chargement, téléphone simulé (processeur ×4, 4G lente) | premier affichage 1,3 s, formulaire prêt en 3,0 s                                       |
| Partie de 30 s, qualité élevée, ordinateur             | 57 i/s en moyenne, 60 i/s au 5e centile, 2 % d'images sous 30 i/s                       |
| Partie de 30 s, qualité élevée, téléphone simulé (×4)  | 50 i/s en moyenne, 30 i/s au 5e centile, 5 % d'images sous 30 i/s                       |

Une première mesure donnait 36 et 28 i/s : les lueurs du décor étaient animées à l'intérieur des SVG (tout le décor redessiné à chaque image), la distorsion de chaleur recalculait son bruit à chaque image, le fond de page était en `background-attachment: fixed` et la barre d'actions floutait l'arrière-plan. Désormais seules `transform` et `opacity` sont animées sur des calques séparés. Le rendu logiciel de Chromium sans écran est plus lent qu'un vrai téléphone avec carte graphique : ces chiffres sont prudents.

### Vérifications

- `npm run smoke` : parties complètes à 2, 4 (dont deux humains) et 6 joueurs ; les humains simulés jouent dès que c'est possible, pendant les animations. Aucune erreur console.
- `npm run screenshots` : accueil, salon, table, dragon, fin de manche, fin de partie, sur téléphone (390 px), tablette (820 px) et ordinateur (1440 px), avec et sans mouvement réduit, dans [`screenshots/`](screenshots/) (JPEG pour limiter le poids du dépôt).
