# Architecture

## Vue d'ensemble

```mermaid
flowchart LR
  subgraph Navigateur["Navigateur (packages/client)"]
    UI["React + SVG<br/>affiche la vue, envoie des intentions"]
  end
  subgraph Serveur["Serveur Node (packages/server)"]
    WS["Fastify + ws<br/>/ws, /healthz, fichiers du client"]
    RM["RoomManager<br/>salons, sessions, bots, délai de grâce"]
    RS[("RoomStore<br/>(mémoire)")]
    RNG["Générateur HMAC-SHA256<br/>(clé secrète par partie)"]
  end
  subgraph Moteur["Moteur pur (packages/engine)"]
    R["reduce(state, action, rng)<br/>→ state + événements"]
    V["viewFor(state, joueur)<br/>filterEventsFor(...)"]
  end
  UI -- "intention validée par zod<br/>(packages/shared)" --> WS
  WS --> RM
  RM <--> RS
  RM -- "action + joueur de la session" --> R
  RNG -. injecté .-> R
  R --> V
  V -- "vue filtrée + événements filtrés,<br/>un message par joueur" --> UI
```

1. Le client envoie une **intention** (`{"type":"action","action":{"type":"drawExit"}}`). Il n'indique jamais qui il est : le serveur déduit le joueur de la session WebSocket.
2. Le serveur valide le message avec **zod** (`packages/shared`), applique une limitation de débit, puis appelle `reduce` du moteur avec l'identifiant du joueur.
3. Le moteur vérifie la légalité (bon joueur, bonne phase, choix existant…). Une action illégale renvoie un code d'erreur (`NOT_YOUR_TURN`, `CHOICE_PENDING`…) **sans modifier l'état ni consommer le générateur**.
4. En cas de succès, le serveur garde le nouvel état et envoie à **chaque** joueur `viewFor(état, joueur)` et les événements filtrés pour lui. Le client met les événements en scène (voir « Client : le réalisateur ») et affiche la vue.

## Paquets

| Paquet   | Rôle                                                                                              | Dépendances                                                                  |
| -------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `engine` | Règles, état, événements, vues filtrées, bots, simulation                                         | aucune                                                                       |
| `shared` | Schémas zod des messages, types du protocole, noms, rythme des animations, constantes cosmétiques | `zod`, types du moteur ; `branding`, `cosmetics` et `pacing` sans dépendance |
| `server` | Transport, salons, sessions, reconnexion, bots, générateur sécurisé                               | `fastify`, `@fastify/static`, `ws`                                           |
| `client` | Interface React, réalisateur d'animations, illustrations SVG, effets canvas, préférences          | `react` ; types seulement depuis `engine` (et la racine de `shared`)         |

Le client n'importe **aucune valeur** du moteur (règle ESLint `no-restricted-imports` avec `allowTypeImports`) : il ne contient pas de logique de règles. Les raisons d'une action impossible (« Ce n'est pas votre tour », « Terminez d'abord votre choix »…) sont calculées par le moteur (`view.legal`) et seulement traduites par le client.

## Client : le réalisateur

```mermaid
flowchart LR
  MSG["message « game »<br/>vue + événements filtrés"] --> STORE["store<br/>vue la plus récente"]
  STORE -- "buildSequences()" --> DIR["Director<br/>file de séquences"]
  DIR -- "repères datés (runCues)" --> CUES{repère}
  CUES -- reveal --> BOARD["vue de la table<br/>(Track, pioches, piles)"]
  CUES -- "shake, camera, flameSweep, burst" --> FX["calque d'effets<br/>WAAPI + canvas différé"]
  DIR --> SPOT["Spotlight<br/>carte mise en scène"]
  STORE --> ACT["actions, choix, chrono<br/>(jamais retardés)"]
```

- **`director/sequences.ts`** : événements → séquences (visuel, durée, repères). Fonctions pures, testées sans navigateur.
- **`director/director.ts`** : file jouée une séquence à la fois, passable, accélérée seulement quand elle déborde ; horloge injectable pour les tests.
- **`director/cues.ts`** : programme les repères d'une séquence ; l'arrêt joue tout de suite une révélation encore à venir, pour finir sur la vue du serveur.
- **`store.ts`** : garde la dernière vue (actions) et la vue de la table, appliquée au repère `reveal`, dans l'ordre d'arrivée des messages.
- **`fx/`** : bus d'effets, particules et ambiance (canvas, chargés à la demande), jauge de chaleur (`--heat`, tirée de la seule position du dragon), mesure de fluidité pour la qualité « auto », récapitulatif de fin de partie.
- Le rythme (`@pepite/shared/pacing`) est commun au client et au serveur : le serveur s'en sert pour faire attendre les bots et repousser le chrono pendant les animations.

## Moteur

- **État** (`GameState`) : piste de 9 cartes, position du dragon, nains (statut, position, or à l'abri, Grosses pépites), pioches (index 0 = dessus), défausse, boîte, piles d'or en cours, échelle de la Sortie, résultats des manches.
- **Actions** : `drawExtraction`, `drawExit`, `chooseExitAction`, `chooseSwapTarget` (joueur), `startNextRound`, `skipTurn` (système).
- **Événements** : `RoundStarted`, `TurnStarted`, `CardDrawn`, `ExitActionPlayed`, `DwarfMoved`, `DwarfMoveBlocked`, `DwarvesSwapped`, `DragonMoved`, `DwarfEliminated`, `DwarfExited`, `GoldBonusKept`, `ExitCardWasted`, `ExitDeckReshuffled`, `TurnSkipped`, `RoundEnded`, `BigNuggetsAwarded`, `GameEnded`.
- **Déterminisme** : `reduce` ne modifie jamais l'état reçu ; son seul effet de bord est d'avancer le générateur injecté. Même graine + mêmes actions = même état final (testé par propriété).
- **Cas non précisés** : un par fonction dans `src/rules/houseRules.ts`.

## Informations cachées

`viewFor` construit la vue par **liste blanche** :

| Donnée                                         | Envoyée à                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Carte du dessus de la pioche Extraction        | personne avant la pioche (règle maison `extractionTopIsPublic`) ; la carte piochée est montrée à tous |
| Nombre de cartes des pioches                   | tous                                                                                                  |
| Contenu et ordre des pioches                   | personne                                                                                              |
| Défausse Exit                                  | tous                                                                                                  |
| Valeur et contenu d'une pile d'or              | tous (règle maison `pileValuesArePublic`, sinon son propriétaire seulement)                           |
| Carte Exit en attente de choix                 | son auteur seulement                                                                                  |
| Résultats de manche                            | tous, au décompte                                                                                     |
| Graine / état du générateur, jetons de session | personne                                                                                              |

Les tests d'intégration inspectent tout le trafic reçu par chaque client simulé pour vérifier qu'aucune de ces données n'y figure.

## Protocole WebSocket (`/ws`)

Messages du client (validés par zod, 2 Kio maximum) : `hello`, `createRoom`, `joinRoom`, `leaveRoom`, `updateSettings`, `addBot`, `removePlayer`, `startGame`, `action`, `nextRound`, `replaceWithBot`, `skipPlayer`, `backToLobby`, `ping`.

Messages du serveur : `welcome` (jeton de session), `room` (salon), `game` (vue + événements + chrono du tour, et `autoPlay` quand le serveur a joué d'office à pile ou face), `error` (code + message), `pong`.

## Sessions et reconnexion

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Serveur
  C->>S: hello (jeton du localStorage, s'il existe)
  S-->>C: welcome (jeton, identifiant de joueur)
  S-->>C: room + game (vue identique à celle d'avant la coupure)
  Note over C,S: coupure réseau
  S-->>S: joueur « déconnecté », délai de grâce
  S-->>C: (autres joueurs) statut « absent » après le délai
  C->>S: hello (même jeton)
  S-->>C: welcome, room, game : le joueur reprend sa place
```

- Le jeton de session (aléatoire, 192 bits) est gardé dans le `localStorage` ; l'identifiant de joueur est public.
- Une seule connexion par session : une nouvelle connexion remplace l'ancienne.
- Un ping WebSocket toutes les 30 s détecte les connexions mortes (réseau mobile coupé).

## Sécurité

- Validation stricte de tous les messages entrants (zod, objets stricts, tailles bornées), aucun `eval`.
- Limitation de débit par connexion (seau à jetons ; fermeture au-delà de 200 messages rejetés) et nombre de connexions par adresse IP borné.
- En-têtes HTTP : `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- Aucun secret dans le dépôt.

## Persistance

L'état vit en mémoire derrière l'interface `RoomStore` (`get`, `save`, `delete`, `has`, `all`). Une persistance (Redis, base de données) peut l'implémenter, par exemple avec un cache mémoire et une écriture différée dans `save` ; l'état du générateur est sérialisable (`snapshot()`).
