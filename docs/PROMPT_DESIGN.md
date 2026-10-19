# Prompt « Refonte visuelle et animations » pour Claude Opus 5.5

> Copier tout ce qui suit la ligne `---` dans une session Claude Code ouverte sur ce dépôt (`notsayk/speedrunners`).
> Direction artistique retenue : **fantasy sombre et atmosphérique, avec des cartes toujours parfaitement lisibles**. Pour une autre direction (conte chaleureux, mignon façon jeu mobile), remplacer la section 2 avant de lancer.

---

Tu es un directeur technique front-end et un artiste d'interface senior (animation, direction artistique, sound design). Mission : transformer le client web de ce jeu de cartes en ligne (inspiré de « My Gold Mine ») en une expérience **spectaculaire, mémorable et fluide**, sans toucher aux règles ni casser le multijoueur.

## 0. Point de départ et règles du jeu

- **La base existante est sur la branche `origin/claude/modest-planck-m4h6hp`** (moteur, serveur, client React). Vérifie avec `git branch -a`. Si `packages/client` n'existe pas dans ta branche de travail, pars de cette branche. Ne réécris pas le moteur ni le serveur : tu travailles dans `packages/client` (et `packages/shared` si un type d'événement doit être exposé).
- Lis d'abord : `docs/REGLES.md` (règles), `docs/DECISIONS.md` (écarts assumés : pioche Extraction **cachée**, or de chaque joueur **visible**, chrono de **45 s** avec pile ou face), `docs/ARCHITECTURE.md`, puis `packages/client/src/` en entier (`store.ts`, `spotlight.ts`, `components/Track.tsx`, `components/Spotlight.tsx`, `components/Decks.tsx`, `components/Players.tsx`, `components/Results.tsx`, `assets/*`, `styles.css`, `preferences.ts`).
- **Contraintes non négociables :**
  1. **Aucune logique de règle dans le client.** Il affiche la vue filtrée et envoie des intentions. Les animations sont pilotées par les **événements du moteur** déjà exposés.
  2. **Aucune fuite d'information cachée.** Une animation ne doit jamais révéler ce que le joueur n'est pas censé savoir : la carte du dessus de la pioche Extraction, le contenu de la pioche Exit, la composition des paquets. Le suspense se fabrique par la mise en scène (pause, anticipation), pas par un indice visuel.
  3. **Les animations ne bloquent jamais le jeu.** Le chrono serveur de 45 s continue ; un joueur doit pouvoir jouer sans attendre la fin d'une cinématique, et chaque séquence doit pouvoir être passée ou accélérée.
  4. **Aucune ressource protégée** : n'importe ni n'imite les illustrations, logos, noms ou textes Kosmos/IELLO. Tous les visuels sont originaux (SVG, CSS, canvas/WebGL générés). Garde les noms provisoires du fichier `branding` (`BRANDING`), jamais de nom du jeu original en dur.
  5. Tout ce qui est ajouté respecte `prefers-reduced-motion` et le réglage de qualité (voir 6). L'interface reste jouable et lisible sans animation ni son.
- Langue : interface en **français**, code et identifiants en **anglais**. Travaille sur ta branche, commits atomiques, pas de pull request sauf demande.

## 1. Constat sur l'existant (à corriger)

Le rendu actuel est propre mais **plat** : aplats SVG, thème parchemin/plateau sombre, polices système, cartes qui se retournent sans poids ni matière, emojis (`💀`, `✨`) comme effets, pas de son, pas de lumière ni de profondeur. Il y a déjà de bonnes bases à conserver : le `Spotlight` qui met chaque coup en avant, le journal de partie, les effets événementiels (`Effect` dans `store.ts`), les réglages d'accessibilité, le responsive.

## 2. Direction artistique : « Fantasy sombre atmosphérique »

- **Ambiance** : l'intérieur d'une mine ancienne, éclairée à la lampe et aux cristaux, avec un dragon qui réchauffe tout l'espace côté droit. Contrastes marqués, ombres profondes, or éclatant qui se détache du fond.
- **Palette** : fonds bleu nuit et pierre froide ; or chaud (déjà `--gold`) comme couleur de récompense ; rouge braise et orange comme couleur de danger ; cyan de cristal comme accent d'interface. Centralise tout en variables CSS (garde le système de tokens de `styles.css`) avec deux niveaux : thème « mine » (par défaut) et variantes de contraste élevé. Vérifie les ratios de contraste (≥ 4,5:1 pour le texte).
- **Typographie** : une police d'affichage de caractère (serif fantasy) pour titres, scores et noms de cartes, une sans-serif très lisible pour tout le reste. Auto-héberge les polices (dossier `public/fonts`, `font-display: swap`), pas de requête vers un CDN au runtime.
- **Matières** : pierre, bois (étais), cuir, parchemin, métal doré. Rendu par dégradés, bruit SVG (`feTurbulence`), ombres portées et lumières, pas par des images bitmap lourdes.
- **Principe de lisibilité** : l'atmosphère est autorisée à être sombre, **jamais les informations de jeu** (valeurs d'or, boutons, état du tour). Les cartes jouables se détachent toujours du fond.

## 3. Chantiers (par ordre d'impact)

### 3.1 Lumière, profondeur et atmosphère de la mine

- Décor en **couches avec parallaxe** (roche de fond, poutres, cristaux, stalactites) qui réagit légèrement au déplacement de la souris, du doigt ou du gyroscope.
- **Vignette** et **lampe frontale** : un cône de lumière suit le nain dont c'est le tour ; les cristaux émettent une lueur douce pulsante.
- **Particules** discrètes (poussière dans les faisceaux, étincelles, braises côté dragon).
- Remplace les emojis par des illustrations SVG/animées originales.

### 3.2 Jauge de chaleur : l'écran se réchauffe quand le dragon approche

- La position de Dragobert pilote une variable CSS `--heat` (0 → 1) qui fait virer l'étalonnage du froid au rouge braise, intensifie la vignette, ajoute une **distorsion de chaleur** (filtre SVG animé) au fond côté dragon, et accélère les braises.
- Ne trahit aucune information cachée : seule la position du dragon, déjà publique, est utilisée.
- Une courte transition lisse chaque palier quand le dragon avance.

### 3.3 Cartes avec du poids et de la matière

- **Cartes 3D** (CSS `perspective`, `transform-style: preserve-3d`) : inclinaison qui suit le pointeur/le doigt, épaisseur de tranche, ombre dynamique.
- **Finitions** : reflet holographique doré (dégradé angulaire animé par le pointeur) sur les cartes d'or, bords de braise et lueur pour le dragon, grain de papier, cadre gaufré, dos de carte travaillés (Extraction et Exit bien distincts).
- **Animation de pioche** : la carte quitte la pile en trajectoire courbe, se soulève, **marque une pause de suspense**, puis se retourne et rejoint sa destination (pile d'or du joueur ou défausse). La durée de la pause est identique que la carte soit bonne ou mauvaise.
- **Piles d'or** : de vraies piles de cartes avec léger désordre, qui se tassent à chaque ajout, avec un compteur dont les chiffres défilent.
- **Carte Exit défaussée** : elle se consume ou se dissout. **Début de manche** : mélange animé des deux pioches, puis distribution de la piste carte par carte avec retournement en cascade.
- Réutilise les composants `assets/Cards.tsx` et améliore-les ; garde des cartes lisibles à petite taille sur téléphone.

### 3.4 Cinématique du dragon

- Quand Dragobert avance : léger zoom/travelling sur lui, **tremblement d'écran**, rugissement, souffle de flammes qui balaie la piste, retournement des Mines en cascade côté rouge avec lueur de braise.
- **Élimination** : le disque est englouti par les flammes, devient noir de cendre, s'incline ; fumée et cendres qui s'élèvent. Le nain reste visible sur la galerie où il est tombé (règle déjà en place).
- **Sortie réussie** : faisceaux de lumière du jour qui jaillissent de la carte Sortie, étincelles, petit « tada » sonore.
- **Chaînes de dragons** (plusieurs avancées d'affilée) : montées en intensité à chaque pas, sans durée totale excessive (plafonne et accélère).
- Version courte automatique pour les spectateurs d'un tour qui n'est pas le leur si le temps est compté.

### 3.5 Personnages : les nains prennent vie

- Les disques deviennent des **jetons-personnages** originaux (casque, lampe, barbe, couleur + forme/motif pour le daltonisme) avec animation de repos (clignotement de la lampe, respiration).
- Déplacement par **bonds** avec écrasement-étirement (squash & stretch), traînée de poussière, regard qui se tourne vers la direction du mouvement. Joie à la sortie, panique près du dragon.
- Personnalisation simple (chapeau, barbe) : prévoir la structure, implémente au moins 3 variantes par partie cosmétique si le temps le permet.

### 3.6 Or et récompenses

- **Pépites avec physique** (matter.js ou équivalent léger) qui tombent dans les piles avec cliquetis ; les Grosses pépites ont un effet d'éclat plus marqué.
- **Cérémonie de fin de manche** : classement révélé du dernier au premier, Grosses pépites qui voyagent jusqu'à la carte Nain, ralenti sur le premier. **Fin de partie** : scores révélés progressivement, couronne et confettis sur le gagnant, **récapitulatif partageable** (image générée côté client avec la courbe d'or par tour, sans donnée privée d'autrui hors scores finaux déjà publics).

### 3.7 Son et musique

- **Ambiance de grotte** (gouttes, résonance), sons de pioche, de cartes qui claquent, d'or, de flammes, de rugissement, de pas du nain, de victoire.
- **Musique adaptative par couches** qui monte avec la jauge de chaleur.
- Sources : synthèse WebAudio générée par code (préférée, aucun fichier ni licence) ou banques **CC0** (Kenney, OpenGameArt) si le réseau l'autorise ; note la licence de chaque fichier dans `docs/CREDITS.md`. Ne télécharge rien de protégé.
- Réglages : volumes séparés (musique, effets), muet, démarrage audio après un geste utilisateur (politique des navigateurs). Vibrations (`navigator.vibrate`) discrètes sur mobile, désactivables.

### 3.8 Écrans et micro-interactions

- **Accueil vivant** : scène animée avec le dragon qui dort et dont l'œil suit le curseur, chariot de nains qui entre dans la mine.
- **Salon d'attente** : les nains arrivent un à un dans le wagon quand un joueur rejoint.
- Boutons, info-bulles et dialogues retravaillés (pressions, survols, apparitions) ; transitions entre écrans via la View Transitions API si disponible, avec repli.
- **Réactions rapides** : quelques emotes animées entre joueurs (par intentions envoyées au serveur, validées et limitées en débit), activables/désactivables.

## 4. Architecture d'animation (obligatoire)

- Crée une couche **« réalisateur »** (`packages/client/src/director/`) : elle reçoit les événements du moteur (`CardDrawn`, `DragonMoved`, `DwarfEliminated`, `DwarfExited`, `RoundEnded`…) via le store, les transforme en **séquences** (timelines) et les joue dans une file.
- Une séquence est **annulable, accélérable et passable** (clic ou touche), n'altère jamais l'état du jeu et se termine toujours dans un état cohérent avec la vue serveur (si le joueur reçoit une nouvelle vue au milieu d'une séquence, on saute à l'état final).
- Réutilise et étends le `Spotlight` existant plutôt que de le remplacer en parallèle.
- Outils recommandés : **GSAP** (timelines, plugin Flip) ou **Framer Motion** ; **PixiJS** ou **tsParticles** pour les particules ; **matter.js** pour la physique ; **Howler.js** ou WebAudio natif pour le son. Choisis-en peu, justifie chaque dépendance dans `docs/DECISIONS.md` (poids, licence, maintenance). N'introduis **pas** Three.js/WebGL 3D complet sauf preuve que le rendu reste fluide sur un téléphone moyen.
- Versions de dépendances **exactes** et récentes ; `npm audit` sans vulnérabilité haute ou critique.

## 5. Performance et budgets

- **60 fps** visés sur un téléphone moyen ; jamais de chute sous 30 fps pendant les cinématiques.
- Animer uniquement `transform` et `opacity` quand possible ; `will-change` posé puis retiré ; pas de recalcul de layout en boucle.
- Poids : bundle JS initial raisonnable (vise < 250 Ko gzip pour le chemin critique), chargement différé (`import()`) du moteur de particules, de la physique et de l'audio ; polices subsettées ; sons compressés ou générés.
- Mesure et consigne dans `docs/DECISIONS.md` : taille de build, temps de chargement, fps relevés (Playwright/Chromium est préinstallé : n'exécute pas `playwright install`).

## 6. Accessibilité et réglages

- Respect de `prefers-reduced-motion` : remplace les cinématiques par des transitions courtes (fondu), supprime tremblements, parallaxe et flashs ; aucune séquence ne dépasse 3 flashs par seconde.
- **Réglage de qualité** (bas / moyen / élevé / auto) dans `SettingsDialog` qui adapte particules, physique, distorsion, résolution des effets. « Auto » baisse la qualité si les fps chutent.
- Lecteurs d'écran : le journal de partie et les annonces `aria-live` existants restent la source d'accessibilité ; les décors et effets sont `aria-hidden`.
- Navigation clavier complète, focus visible, cibles tactiles ≥ 44 px, daltonisme (formes ou motifs en plus des couleurs), contrastes vérifiés.

## 7. Qualité et tests

- `npm run check` (lint + typecheck + tests) vert avant chaque push ; build de production sans avertissement.
- Tests unitaires du réalisateur (transformation événements → séquences, annulation, saut à l'état final, file qui ne déborde pas).
- Tests de non-fuite : une animation ne reçoit que des données de la **vue filtrée** du joueur (jamais le moteur complet, jamais la valeur d'une pile adverse si `pileValuesArePublic` est `false`).
- Captures d'écran automatisées (Playwright) des écrans clés (accueil, salon, table, dragon, fin de manche, fin de partie) à 3 largeurs (téléphone, tablette, ordinateur) avec et sans `prefers-reduced-motion`, rangées dans `docs/screenshots/`.
- Test de fumée d'une partie complète avec bots pour vérifier l'absence d'erreur console pendant les animations.

## 8. Méthode de travail

1. Lis tout le client, puis propose un **plan court** : jalons, dépendances choisies, risques de performance.
2. Avance par jalons livrables à chaque fois (jouable et vert) :
   1. Socle : tokens, polices, réalisateur, réglage de qualité, accessibilité.
   2. Lumière, parallaxe, jauge de chaleur.
   3. Cartes 3D et animation de pioche.
   4. Cinématique du dragon, élimination, sortie.
   5. Nains-personnages et déplacements.
   6. Or physique, fin de manche, fin de partie, récap partageable.
   7. Son et musique adaptative.
   8. Accueil, salon, micro-interactions, emotes.
3. À chaque jalon : build, tests, captures, vérification à 60 fps, commit, push. Compare avec les captures précédentes pour éviter les régressions de lisibilité.
4. Ne bloque pas sur un détail : prends une décision raisonnable, note-la dans `docs/DECISIONS.md`. Pose une question à l'utilisateur uniquement pour : la direction artistique si elle diffère de la section 2, le budget de poids, l'usage de banques sonores externes.
5. Termine par un compte rendu : ce qui est fait, mesures de performance, captures, ce qui reste, questions ouvertes.

## 9. Critères d'acceptation

- Une partie complète (2, 4 et 6 joueurs, avec bots) se joue sans erreur console et sans jamais bloquer sur une animation.
- Les cinématiques du dragon, de l'élimination, de la sortie et des fins de manche et de partie sont en place, passables et accélérables.
- La jauge de chaleur réagit à la position du dragon sans révéler d'information cachée.
- Le jeu est **lisible et jouable** avec `prefers-reduced-motion`, sans son, à qualité « bas » et sur téléphone.
- Les budgets de performance de la section 5 sont atteints et documentés.
- Aucune ressource protégée n'est présente ; les crédits des éventuelles ressources CC0 sont dans `docs/CREDITS.md`.
- `npm run check` est vert et les captures d'écran sont à jour dans `docs/screenshots/`.
