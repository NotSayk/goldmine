# My Gold Mine — Analyse des règles (pour l'implémentation en ligne)

Source : livret officiel français IELLO (9 pages, © 2021 Franckh-Kosmos / © 2023 IELLO).
Les passages marqués **⚠ Non précisé** ne sont pas tranchés par le livret : ce sont des décisions à valider.

## 1. Vue d'ensemble

- Jeu de cartes « stop ou encore » (push your luck), 2 à 6 joueurs, dès 7 ans, environ 25 min.
- Chaque joueur incarne un nain (un disque en bois) dans une mine, avec le dragon **Dragobert** qui avance vers la sortie.
- Une partie = **3 manches**. Manches 1 et 2 : on gagne des **Grosses pépites** (bonus). Manche 3 : on les ajoute à son or, et **le plus riche remporte la partie**.

## 2. Matériel

| Élément | Qté | Rôle |
|---|---|---|
| Cartes Mine | 9 | Forment la piste : 1 Sortie, 1 Wagon, 1 Dragobert, 6 Mines (recto bleu / verso rouge) |
| Cartes Extraction | 58 | Pioche visible : or + déplacement, ou dragon |
| Cartes Exit | 16 | Pioche cachée : actions de fuite et d'entraide |
| Cartes Nain | 6 | Une par joueur (reçoit les Grosses pépites et l'or sécurisé) |
| Disques Nain | 6 | Pions des joueurs |
| Grosses pépites | 12 | 2 manches × (3+2+1) = 12, la réserve ne manque jamais |

La répartition des 58 cartes Extraction et des 16 cartes Exit (dont celles à 2 actions) n'est pas dans le livret ; elle a été comptée sur une boîte (voir `DECISIONS.md`, section 3).

## 3. Mise en place (début de chaque manche)

1. **Piste** : 9 cartes Mine alignées, recto bleu. Sortie à l'extrémité gauche (index 0), Dragobert à l'extrémité droite (index 8), Wagon au milieu (index 4). Les 6 autres Mines remplissent le reste (ordre sans importance).
2. **Pioche Extraction** : toutes les cartes Extraction mélangées, **face visible** (recto révélé). Si la 1re carte est un dragon, remélanger jusqu'à ce qu'une carte avec pépite soit visible.
3. **Pioche Exit** : cartes Exit mélangées, **face cachée**, à côté.
4. Les 12 Grosses pépites à portée de main.
5. Chaque joueur prend sa carte Nain (devant lui) et son disque, posé sur le **Wagon**.
6. **Premier joueur** : manche 1 = le plus jeune. Manche 2 = vainqueur de la manche 1. Manche 3 = vainqueur de la manche 2. Sens horaire.

Manches 2 et 3 : on récupère toutes les cartes rangées dans la boîte et on remélange Extraction et Exit séparément. Les Mines reviennent côté bleu, Dragobert à droite. Les Grosses pépites déjà gagnées restent sur les cartes Nain.

## 4. Tour de jeu

À son tour, on choisit **A ou B**, puis le joueur suivant joue. Un joueur arrivé à la sortie ou éliminé ne joue plus pendant cette manche.

### A. Piocher une carte Extraction (collecter de l'or)

On prend la carte du dessus (visible). On applique le déplacement, puis on la pose **face cachée** devant soi : elle empile l'or de la manche.

| Carte | Or | Déplacement du disque |
|---|---|---|
| « Un dragon aux œufs d'or » (porte rouge) | 2 | 1 carte vers la **droite** (vers Dragobert) |
| « Il est l'or, monseignor ! » (porte bleue) | 1 | 1 carte vers la **gauche** (vers la Sortie) |
| « D'l'or, j'adore ! » (sans porte) | 1 | Reste sur place |
| **Dragon** | 0 | (jamais piochée par un joueur : voir 4A.1) |

**4A.1. Déclenchement du dragon.** Après chaque pioche d'une carte Extraction, si la **nouvelle** carte visible sur la pioche est un dragon :
1. Dragobert se déplace immédiatement d'**1 carte vers la gauche** : on échange sa carte avec la Mine bleue à sa gauche, et on retourne cette Mine (désormais à droite du dragon) sur son **verso rouge**.
2. Les nains présents sur la Mine déplacée sont **éliminés** : ils remettent leurs cartes Extraction dans la boîte, posent leur disque sur leur carte Nain et ne participent plus au classement de la manche.
3. La carte dragon est retirée de la pioche et rangée dans la boîte.
4. On regarde la nouvelle carte du dessus : si c'est encore un dragon, on répète (jusqu'à ce que la carte visible ne soit plus un dragon).

**Fin de manche par le dragon** : si Dragobert arrive juste à côté de la Sortie (à droite d'elle), la manche prend fin **immédiatement**. Il ne peut pas avancer davantage même si un autre dragon est révélé.

### B. Piocher une carte Exit (se mettre en sécurité ou pousser les autres)

On pioche la carte du dessus de la pioche Exit (face cachée, donc à l'aveugle). Si elle porte 2 actions, on en choisit une ; si on ne peut pas en faire une, on doit prendre l'autre.

| Action | Effet |
|---|---|
| « Petit pas » | Son disque avance de 1 carte vers la Sortie |
| « Double pas » | 2 cartes vers la Sortie. Si le 1er pas atteint la Sortie, le 2e est ignoré |
| « Tous ensemble ! » | **Tous** les disques avancent d'1 carte vers la Sortie |
| « Échange inter-nain-tional » | Échange son disque contre celui de n'importe quel autre nain présent dans la mine |
| « Bonus d'or » | Cette carte est gardée face cachée par le joueur. Elle vaut **+3 pépites** au décompte de fin de manche |

Les cartes Exit utilisées vont dans une défausse **face visible**, sauf « Bonus d'or ». Pioche vide : on remélange la défausse pour en refaire une pioche.

### Arrivée à la Sortie

- Un nain qui atteint la Sortie arrête de jouer pour la manche. Son disque est posé sur l'**emplacement libre le plus haut** de la carte Sortie, et son or est à l'abri de Dragobert.
- On peut atteindre la Sortie via « Tous ensemble ! » : si plusieurs nains arrivent en même temps, on les place l'un après l'autre sur les emplacements libres, en commençant par le joueur qui a joué l'action, puis dans le sens horaire.
- **La position sur l'échelle de la Sortie sert de départage** (voir 5).

## 5. Fin de manche et décompte

La manche se termine quand tous les disques encore dans la mine sont sur la Sortie ou ont été éliminés, ou quand le dragon arrive à côté de la Sortie.

**Manches 1 et 2 :**
1. Les joueurs sur la Sortie comptent les pépites sur leurs cartes Extraction (+3 si Bonus d'or). Les éliminés ne comptent pas.
2. Le plus riche reçoit **3** Grosses pépites, le 2e **2**, le 3e **1** (sur sa carte Nain). Un nain à **0 pépite** n'en reçoit pas.
3. **Égalité** : celui dont le disque est le plus haut sur l'échelle de la Sortie passe devant.
4. Les cartes Extraction sont remises dans la boîte, tout est remélangé pour la manche suivante.

**Manche 3 (décompte final) :** on ne distribue **pas** de Grosses pépites.
- Chaque Grosse pépite vaut **1 pépite d'or** et s'ajoute au total.
- Total d'un joueur = pépites des cartes Extraction (+3 si Bonus d'or) + Grosses pépites.
- Un joueur **éliminé** pendant la manche 3 ne compte que ses Grosses pépites.
- Le plus riche gagne la partie. En cas d'égalité, la position sur l'échelle de la Sortie départage.

## 6. Variante « Double pioche » (2 joueurs)

Chaque joueur incarne **2 nains** (2 cartes Nain côte à côte pour mémoriser l'ordre). Les 2 nains d'un joueur jouent à la suite, toujours dans le même ordre, puis c'est à l'autre joueur. Le livret recommande cette variante à 2 joueurs.

- Les 2 nains forment une équipe qui partage **une pile d'or commune**.
- Si un nain est éliminé, l'autre continue seul et garde l'or déjà amassé.
- Si un nain atteint la Sortie, il emporte tout l'or amassé jusque-là (cartes Extraction et Grosses pépites) sur **sa propre carte Nain**. Dragobert ne peut plus le toucher. Le nain restant commence une **nouvelle pile** ; quand il atteindra la Sortie, il la posera sur sa carte Nain.
- Le décompte est inchangé et un joueur peut décrocher plusieurs places de Grosses pépites avec ses deux nains.

## 7. Informations cachées / publiques (important pour le réseau)

| Information | Visibilité |
|---|---|
| Carte du dessus de la pioche Extraction | **Publique** (tous la voient avant de choisir) |
| Pioche Exit | **Cachée** (pioche à l'aveugle, tirage décidé côté serveur) |
| Pile d'or d'un joueur | Cartes **face cachée** : le nombre de cartes est public, la valeur reste **privée** |
| Cartes Bonus d'or d'un joueur | Gardées devant lui, face cachée (la présence est publique en pratique, la valeur est connue) |
| Défausse Exit | Publique |
| Grosses pépites | Publiques |

Le serveur doit donc **ne jamais envoyer aux autres clients la valeur des piles d'or**, seulement le nombre de cartes, et révéler les valeurs au décompte.

## 8. Cas limites : ⚠ Non précisés par le livret

À trancher avant de coder (la 3e colonne est ma proposition par défaut) :

| # | Cas | Défaut proposé |
|---|---|---|
| 1 | Un nain adjacent à Dragobert joue « œufs d'or » (déplacement vers le dragon) | Le déplacement est ignoré (il reste sur place), l'or est quand même pris |
| 2 | « Échange inter-nain-tional » avec un nain déjà sur la Sortie | Interdit : seuls les nains encore sur la piste sont ciblables |
| 3 | « Tous ensemble ! » : les nains déjà sur la Sortie bougent-ils ? | Non, seuls ceux sur la piste avancent |
| 4 | Pioche Extraction vide en cours de manche | Fin immédiate de la manche, décompte normal |
| 5 | Personne n'atteint la Sortie avec de l'or (manche 1 ou 2) | Pas de Grosses pépites ; le prochain premier joueur est le joueur suivant du précédent |
| 6 | Égalité en manche 3 entre un éliminé et un joueur sorti | Le joueur sorti l'emporte |
| 7 | Égalité entre 2 éliminés en manche 3 | Partage de la victoire (aucune règle de départage) |
| 8 | Carte Bonus d'or d'un joueur éliminé | Elle est défaussée (inutile car il ne compte pas) |
| 9 | Pas de place libre sur l'échelle de la Sortie (6 emplacements, 6 joueurs max) | Impossible, 6 nains au maximum |
| 10 | Répartition des cartes (58 Extraction, 16 Exit) | Décompte réel de la boîte (voir `DECISIONS.md`, section 3) |


## 9. Modèle de jeu proposé (moteur)

- **Phases** : `lobby` → `round(1..3)` (`playing` → `scoring`) → `finished`.
- **État d'une manche** : piste (9 cartes avec côté bleu/rouge), position de Dragobert, position et statut de chaque nain (`mine` / `exit` / `eliminated`), échelle de la Sortie (ordre d'arrivée), pioches, défausse, piles d'or privées.
- **Actions** : `drawExtraction`, `drawExit`, puis choix éventuel (`chooseAction`, `chooseSwapTarget`).
- **Moteur pur et déterministe** (graine du mélange fournie par le serveur) avec des tests unitaires par règle : déplacements, chaînes de dragons, ordre d'arrivée simultanée, égalités, variante 2 joueurs.
