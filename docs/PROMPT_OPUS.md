# Prompt à donner à Claude Opus 5.5

> Copier tout ce qui suit la ligne `---` dans une session Claude Code ouverte sur ce dépôt (`notsayk/speedrunners`).

---

Tu es un ingénieur logiciel senior. Ta mission : construire une **version en ligne, jouable à plusieurs en temps réel**, du jeu de cartes « stop ou encore » **My Gold Mine** (2 à 6 joueurs), à partir de la spécification déjà rédigée dans ce dépôt.

## 0. Cadre et priorités

- **Source de vérité des règles : `docs/REGLES.md`.** Lis-le en entier avant toute chose. Si le code contredit ce fichier, c'est le code qui a tort. Ne réinterprète pas les règles ; si un point manque, applique le défaut proposé dans la section 8 du fichier et note-le dans `docs/DECISIONS.md`.
- Le livret original (PDF IELLO) n'est pas dans le dépôt. Ne cherche pas à le télécharger : le réseau de l'environnement bloque beaucoup de domaines.
- Travaille sur la branche `claude/beautiful-brown-lly20m` uniquement. Fais des commits petits et descriptifs, pousse régulièrement (`git push -u origin claude/beautiful-brown-lly20m`). **Ne crée pas de pull request** sauf demande explicite.
- Priorité absolue : **un moteur de règles correct et testé**, puis le multijoueur, puis l'interface. Ne passe pas à l'étape suivante tant que la précédente n'est pas verte.
- Langue : interface et documentation en **français**, code et identifiants en anglais.

## 1. Rappel du jeu (résumé, `docs/REGLES.md` fait foi)

- 3 manches. Piste de 9 cartes Mine : Sortie à gauche, Wagon au milieu (départ de tous les nains), Dragobert à droite.
- Tour : **A)** piocher une carte Extraction (visible) : or + déplacement (œufs d'or : 2 pépites, 1 vers le dragon ; porte bleue : 1 pépite, 1 vers la sortie ; sans porte : 1 pépite, sur place), ou **B)** piocher une carte Exit (cachée) : Petit pas, Double pas, Tous ensemble, Échange inter-nain-tional, Bonus d'or (+3).
- Après chaque pioche Extraction, si la nouvelle carte visible est un dragon : Dragobert recule d'une case vers la Sortie, retourne la Mine, élimine les nains dessus ; on enchaîne tant que la carte visible est un dragon. Si Dragobert arrive à côté de la Sortie, la manche s'arrête.
- Manches 1 et 2 : 3 / 2 / 1 Grosses pépites aux trois plus riches arrivés à la Sortie (égalité : position la plus haute sur l'échelle de la Sortie). Manche 3 : les Grosses pépites valent 1 or chacune, le plus riche gagne.
- Variante 2 joueurs « Double pioche » : 2 nains par joueur.

## 2. Matériel (à modéliser tel quel)

| Élément | Quantité |
|---|---|
| Cartes Extraction | 58 |
| Cartes Nain | 6 |
| Cartes Mine (1 Sortie, 1 Wagon, 1 Dragobert, 6 Mines) | 9 |
| Cartes Exit | 16 |
| Disques Nain | 6 |
| Grosses pépites | 12 |

### Répartition des cartes : inconnue, à rendre configurable

Le livret ne donne **pas** la composition exacte des 58 cartes Extraction ni des 16 cartes Exit, et l'utilisateur n'a pas fourni le détail. Donc :

1. Mets la composition dans **un seul fichier de données** (`packages/engine/src/config/decks.ts`, ou JSON), jamais en dur dans la logique. Les totaux (58 et 16) sont vérifiés par un test.
2. Utilise cette **composition provisoire** (à marquer `PROVISIONAL` dans le fichier et à signaler à l'utilisateur) :
   - Extraction (58) : 8 Dragon, 20 « Un dragon aux œufs d'or », 20 « Il est l'or, monseignor ! », 10 « D'l'or, j'adore ! ».
   - Exit (16) : 4 Petit pas, 3 Double pas, 3 Tous ensemble, 3 Échange inter-nain-tional, 3 Bonus d'or (cartes à action unique ; le moteur doit quand même gérer les cartes à 2 actions au choix, avec le repli forcé quand une action est impossible).
3. Écris un **script de simulation** (parties de bots aléatoires, quelques milliers de manches) qui affiche : longueur moyenne d'une manche, fréquence des fins par dragon, fréquence d'élimination par joueur, distribution des scores. Vérifie que le dragon peut réellement atteindre la Sortie (il faut 7 déplacements, donc au moins 7 dragons dans la pioche) et que les manches ne sont ni triviales ni interminables. Propose un ajustement si besoin, mais **demande confirmation à l'utilisateur** avant de le figer, car il peut compter les vraies cartes de sa boîte.

## 3. Stack imposée (sauf contrainte technique justifiée)

- **TypeScript strict** partout, monorepo npm workspaces (ou pnpm si disponible) :
  - `packages/engine` : moteur de règles pur (aucune dépendance réseau ni DOM).
  - `packages/server` : serveur Node (Fastify ou Express) + WebSocket (`ws`), salons par code à 4–5 caractères.
  - `packages/client` : client web (Vite + React ou Svelte) avec rendu en SVG/CSS.
  - `packages/shared` : types des messages et schémas de validation (zod).
- Tests : **Vitest**. Lint/format : ESLint + Prettier. Un script `npm run check` lance lint + typecheck + tests.
- Pas de base de données au départ : état en mémoire, avec une interface `RoomStore` pour brancher la persistance plus tard.

## 4. Étape 1 : le moteur (`packages/engine`)

Exigences :

- **Fonctions pures et déterministes** : `reduce(state, action, rng) → { state, events }`. Le mélange passe par un générateur pseudo-aléatoire **à graine** (injecté), pour rejouer n'importe quelle partie.
- Le moteur émet une liste d'**événements** (`CardDrawn`, `DwarfMoved`, `DragonMoved`, `DwarfEliminated`, `DwarfExited`, `RoundEnded`, `BigNuggetsAwarded`, `GameEnded`…) pour alimenter les animations et le journal de partie.
- **Actions validées** : tour du bon joueur, action légale, choix d'une carte Exit à 2 actions, cible d'échange valide. Toute action illégale est rejetée avec un code d'erreur explicite, sans modifier l'état.
- Couvre **tout** le périmètre de `docs/REGLES.md` : mise en place des 3 manches, premier joueur de chaque manche, chaînes de dragons, fin de manche par le dragon, entrées simultanées à la Sortie (ordre : joueur actif puis sens horaire), échelle de la Sortie, égalités, décompte manche 3, joueur éliminé en manche 3, variante 2 joueurs (équipes, pile d'or commune, transfert à la Sortie, nouvelle pile pour le nain restant).
- Les neuf cas non précisés de la section 8 de `REGLES.md` sont implémentés avec les défauts proposés, **chacun isolé dans une fonction nommée et documentée**, pour pouvoir les changer en une ligne.
- **Informations cachées** : fournis une fonction `viewFor(state, playerId)` qui retourne la vue filtrée : le contenu de la pioche Exit et la valeur des piles d'or des adversaires ne doivent **jamais** en sortir (seul le nombre de cartes est public). La carte du dessus de la pioche Extraction est publique.

Tests obligatoires (liste minimale) :

1. Totaux des paquets, mise en place correcte, relance du mélange si la première carte Extraction est un dragon.
2. Chaque carte Extraction et chaque action Exit (y compris Double pas qui dépasse la Sortie, Tous ensemble, Échange, Bonus d'or).
3. Dragon : déplacement, retournement de la Mine, élimination, chaîne de plusieurs dragons, arrêt à côté de la Sortie, retrait des cartes dragon de la pioche.
4. Fin de manche (toutes les causes), décompte 3/2/1, égalités par échelle, nain à 0 pépite exclu.
5. Manche 3 : Grosses pépites comptées comme de l'or, joueur éliminé, victoire.
6. Variante 2 joueurs, tous les scénarios d'équipe.
7. **Propriétés** (fast-check) : conservation des cartes (aucune carte perdue ni dupliquée), 12 Grosses pépites au maximum en circulation, jamais plus de 6 nains, la partie se termine toujours.
8. Rejouabilité : même graine + même suite d'actions = même état final.

## 5. Étape 2 : le serveur (`packages/server`)

- Salons : création, code de partage, rejoindre, quitter, jauge 2 à 6 joueurs, hôte qui lance la partie, pseudo.
- **Le serveur est autoritaire** : le client envoie des intentions, le serveur valide via le moteur et diffuse à chacun sa **vue filtrée** (`viewFor`). Aucun secret côté client.
- Reconnexion : un joueur qui se reconnecte (jeton de session en `localStorage`) reprend sa place. Délai de grâce, puis possibilité pour l'hôte de remplacer par un bot ou de passer le joueur.
- Un **bot simple** (heuristique raisonnable) pour compléter une partie ou jouer en solo.
- Validation de tous les messages entrants (zod), limitation de débit basique, pas de `eval`, pas de secret dans le dépôt.
- Tests d'intégration : partie complète à 2, 4 et 6 clients simulés, déconnexion/reconnexion, tentative de triche (action hors tour, lecture de la pioche Exit).

## 6. Étape 3 : le client (`packages/client`)

- Écrans : accueil (créer/rejoindre), salon d'attente, table de jeu, fin de manche (classement et Grosses pépites), fin de partie.
- La table : la **piste de 9 cartes** avec les disques des nains, Dragobert et les Mines retournées en rouge, la **pioche Extraction avec sa carte visible**, la **pioche Exit** (dos de carte), la défausse Exit, la pile d'or de chaque joueur (nombre de cartes visible, valeur masquée), l'échelle de la Sortie, les Grosses pépites, le journal des actions.
- **Aide au jeu** : règles accessibles en un clic, info-bulles sur les cartes, indication claire de qui doit jouer, de ce que fait chaque action Exit, et des raisons pour lesquelles une action est impossible.
- **Animations** pilotées par les événements du moteur (déplacement des disques, souffle du dragon, élimination), désactivables (préférence « mouvement réduit » respectée).
- **Responsive** (téléphone en priorité, car on joue à plusieurs), accessible au clavier, contrastes suffisants, textes d'alternative sur les éléments visuels.
- Aucune logique de règles dans le client : il affiche la vue reçue et envoie des intentions.

## 7. Assets : créer, ne pas copier

- **Ne télécharge et ne reproduis aucune illustration, logo, nom de personnage ou texte des éditions Kosmos/IELLO** (droits réservés). Pas de connecteur ni de clé d'API nécessaire.
- Dessine tous les visuels toi-même en **SVG/CSS** : nains (6 couleurs distinctes, lisibles aussi pour le daltonisme, avec forme ou motif en plus de la couleur), dragon, pépites, Grosses pépites, cartes Mine (recto bleu, verso rouge), Sortie, Wagon, dos des cartes. Style original, cohérent, lisible en petit.
- Mets les assets dans `packages/client/src/assets/` ou en composants, avec une palette centralisée (variables CSS) et un mode clair/sombre.
- **Nom provisoire** : n'utilise pas « My Gold Mine » ni « Dragobert » dans l'interface publique. Pour l'instant, utilise un nom de travail neutre (par exemple « Pépite Rush ») et un nom de dragon différent, tous deux faciles à changer via un fichier de constantes. Écris dans le README que l'usage du nom et du jeu original nécessite l'accord de l'éditeur avant toute publication.

## 8. Qualité, sécurité, documentation

- Couverture de tests élevée sur `engine` (vise > 90 % des lignes) ; `npm run check` doit passer avant chaque push.
- `README.md` : présentation, prérequis, installation, lancement en local (`npm run dev`), tests, structure du monorepo, déploiement possible (Dockerfile simple).
- `docs/DECISIONS.md` : chaque décision où le livret est muet, chaque écart, la composition provisoire des paquets et les résultats de simulation.
- `docs/ARCHITECTURE.md` : schéma du flux client → serveur → moteur → vues filtrées.
- Intégration continue GitHub Actions : installation, `npm run check`, build.

## 9. Méthode de travail

1. Lis `docs/REGLES.md`, puis propose un **plan court** (jalons et risques) avant d'écrire du code.
2. Avance jalon par jalon (moteur → simulation → serveur → client → finitions), avec commits atomiques.
3. À chaque jalon : lance les tests, corrige, puis pousse.
4. Si un point de règle t'empêche de continuer, applique le défaut documenté, note-le, et continue. Ne t'arrête pas pour des détails ; pose une question à l'utilisateur seulement pour : la composition réelle des paquets, le nom définitif du jeu, l'hébergement.
5. À la fin, rédige un compte rendu : ce qui est fait, ce qui est testé, ce qui reste, et les questions ouvertes.

## 10. Critères d'acceptation

- Une partie complète à 2, 3, 4 et 6 joueurs se joue du lobby jusqu'à l'écran de victoire, sans erreur.
- Toutes les règles de `docs/REGLES.md` sont couvertes par des tests qui passent.
- Un client ne peut pas obtenir une information cachée (pioche Exit, valeur des piles d'or adverses) en inspectant le trafic réseau.
- Une reconnexion en cours de manche rend la même vue qu'avant la coupure.
- Aucune ressource protégée par des droits n'est présente dans le dépôt.
- `npm run check` est vert sur la branche.
