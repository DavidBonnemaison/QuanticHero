# Spec-11 : Les 6 Archétypes de Level Design « Smart » & les 4 Moments Signatures « WOW »

## 1. Contexte & Objectif

Un grand jeu de puzzle-platformer se reconnaît aux moments où le joueur s'arrête une seconde, sourit et se dit : *« C'est brillant ! »*. Cette spécification implémente dans le moteur (`GameScene.ts`) et dans le générateur d'archétypes (`src/generator/archetypes.ts`) les **6 Archétypes de Puzzles Émergents (« Smart »)** et les **4 Moments Signatures (« WOW Set-Pieces »)** définis dans le Volet 2 de l'audit.

---

## 2. Spécifications Détaillées

### 2.1 Les 6 Archétypes de Level Design « Smart »

1. **Archétype #1 — « Le Plancher Vivant » (Collision Semelle-contre-Semelle entre Alpha et Beta)** :
   - Dans `src/scenes/GameScene.ts`, lorsque `entanglement.allowHeroCollision === true` (ou dans les niveaux d'Intrication `inverted_gravity` / `mirror_and_gravity` partageant la même chambre), activer `this.physics.add.collider(this.heroGroup, this.heroGroup)`.
   - Alpha (gravité `+700` vers le bas) et Beta (gravité `-700` vers le haut) tombent l'un vers l'autre au-dessus d'un gouffre sans sol ni plafond et **se percutent pied contre pied à mi-hauteur (`y = height / 2`)** : leurs gravités opposées s'annulent et **ils deviennent le plancher vivant l'un de l'autre** pour traverser le vide !
2. **Archétype #2 — « Le Télécommandeur de Phase » (Sauter pour l'Autre)** :
   - Un niveau à 2 clones où le Héros A traverse un tunnel au plafond hérissé de piques basses (sauter = mort immédiate) au-dessus d'un pont alterné `cyan → magenta → cyan`.
   - Le joueur doit basculer sur le Clone B (situé en sécurité dans une chambre latérale) et **faire sauter B sur place en rythme** pour commuter à distance les plateformes sous les pieds du Héros A.
3. **Archétype #3 — « Le Métronome Perpétuel » (Automate de Rebond)** :
   - Une plaque `requireLock` posée sur une plateforme à demi-vie rapide (`decayMs: 650`). Si un clone reste immobile dessus, la plateforme s'effondre.
   - Le joueur lance son clone entre deux murs rebondissants (`kind: 'wall'`) encadrant la plaque : le clone rebondit perpétuellement d'un mur à l'autre, effleurant la plaque toutes les `350 ms` sans jamais déclencher l'effondrement complet, créant une horloge mécanique autonome.
4. **Archétype #4 — « La Passe Décisive en Plein Vol » (Relais de Focus Aérien)** :
   - Une plaque de pression suspendue en plein air au-dessus d'un gouffre. Le Héros 1 saute dans le vide pour toucher la plaque au sommet de sa parabole : `GameScene.ts` transfère automatiquement le focus et la caméra au Clone 2 à l'instant exact où la porte s'ouvre devant lui.
5. **Archétype #5 — « Le Trampoline Humain de Pauli »** :
   - Une cheminée verticale de `280 px` (impossible à franchir avec un saut normal de `145 px`). Le joueur place le Clone 1 au pied de la cheminée, ramasse une particule `pauli` avec le Clone 2 et saute juste au-dessus du Clone 1 : l'explosion de répulsion de Pauli (`vy = -580`) catapulte le Clone 2 au sommet de la cheminée tandis que le recul horizontal (`vx = -620`) propulse le Clone 1 sur une plaque de verrouillage éloignée.
6. **Archétype #6 — « La Cage de Conservation » (Tentation Inversée)** :
   - Le portail de sortie est entouré de plateformes éphémères (`color: '#f1c40f'`). Le joueur les fait disparaître en les touchant, ouvrant l'accès au portail. Une particule bonus brille juste devant : s'il la ramasse par réflexe, `restoreEphemeralPlatforms()` referme la cage autour du portail ! Le joueur doit résister à la tentation ou utiliser le *Demi-Tour à 0 ms* contre le mur gauche `x = 0` dès le spawn.

### 2.2 Les 4 Moments Signatures « WOW » (Set-Pieces de Campagne)

1. **Moment WOW #1 — « Le Dézoom Révélation de l'Intrication »** :
   - Lors du premier niveau d'Intrication (ou niveau à `entanglement.revealAtX`), la caméra démarre zoomée à `1.0` uniquement sur Alpha. Le joueur croit être seul jusqu'à ce qu'il touche un résonateur central : la caméra dézoome en douceur à `0.45` en révélant que Beta reproduisait tous ses gestes au plafond depuis la première seconde et vient d'ouvrir la porte qui le sauvait.
2. **Moment WOW #2 — « L'Effondrement du Cœur de Fer (`Z=26`) & l'Onde de Choc Supernova (`Z=27`) »** :
   - À l'entrée dans le portail du Niveau 26 (`Fe`), les mâchoires `collapse` se percutent dans un flash blanc silencieux de `150 ms`, suivi d'une onde de choc radiale Supernova qui pulvérise les plateformes du Niveau 26 et assemble en temps réel autour du héros en plein vol les plateformes incandescentes du Niveau 27 (`Co` - Cobalt).
3. **Moment WOW #3 — « Effet Tunnel à travers le Cadre de l'Écran »** :
   - Étendre `checkTunnelObstacle` (`src/physics/quantumMechanics.ts`) pour que si un héros possédant `tunnelCharges > 0` fonce contre le bord droit (`x >= width - 24`) ou gauche (`x <= 24`) de l'écran, il **franchisse par effet tunnel le cadre même de l'écran** et ressorte à l'autre extrémité (`x = 28` ou `x = width - 28`) derrière un mur blindé autrement infranchissable !
4. **Moment WOW #4 — « L'Apothéose de l'Oganesson (`Z=118`) — La Constellation Finale »** :
   - Au Niveau 118 (`Og`), faire courir en strates d'arrière-plan (`scrollFactor: 0.5`, `alpha: 0.25`) les trajectoires enregistrées des records personnels du joueur sur les éléments précédents (`scores[z].ghostTrajectory`), et terminer par un dézoom révélant la silhouette lumineuse du Tableau Périodique des 118 éléments.

---

## 3. Critères d'Acceptation

1. Dans un niveau avec `entanglement.allowHeroCollision: true` et gravité inversée sur Beta, Alpha et Beta entrent en collision verticale à mi-hauteur et peuvent marcher l'un sur l'autre au-dessus du vide.
2. Utiliser une charge `tunnel` contre la bordure `x = 0` ou `x = width` téléporte le héros sur le bord opposé de l'écran et consomme `1` charge `tunnel`.
3. Les 6 archétypes « Smart » sont disponibles dans `src/generator/archetypes.ts` et intégrés aux niveaux correspondants de la campagne.
