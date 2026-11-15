# Spec-08 : Mécaniques « WOW » (Partie 1) — Corde d'Intrication Physique, Fusion de Clones & Cylindre Spatial

## 1. Contexte & Objectif

Cette spécification implémente les **3 premières nouvelles mécaniques « Attends, ça c'est possible ?! »** issues du Volet 2bis de l'audit. Elles transforment des éléments déjà familiers au joueur (le rayon rose d'intrication, les clones de superposition et les bords de l'écran mobile `500 px`) en outils physiques interactifs surprenants, avec une parité totale entre l'écran tactile et le clavier.

---

## 2. Spécifications Détaillées

### 2.1 Mécanique #1 : La Corde d'Intrication Physique (`Entanglement Tether`)

Dans les niveaux d'Intrication où `entanglement.tetherPhysical?: boolean` est activé (ou par défaut sur le faisceau d'intrication `drawEntanglementBeam` dans `src/scenes/GameScene.ts:1373-1458`) :

1. **Collecte au Lasso par le Rayon (`Tether Particle Sweep`)** :
   - À chaque frame, tester l'intersection géométrique entre le segment `[Alpha(ax, ay), Beta(bx, by)]` et chaque particule active (`this.particles`) ou plaque de résonance.
   - Si la distance point-segment `distToSegment(particle, alpha, beta) < 22 px`, **le rayon d'intrication lui-même ramasse la particule** dans un arc d'étincelles cyan/magenta qui voyage le long de la corde jusqu'aux deux héros !
   - *Effet « WOW »* : Une particule suspendue au milieu du vide hors de portée de saut d'Alpha et de Beta peut être récoltée simplement en alignant Alpha et Beta de part et d'autre de la particule.
2. **Pivot & Pendule d'Intrication (`Tether Pylon Pivot`)** :
   - Ajouter un type d'élément optionnel `tetherPylons?: { x: number; y: number; radius: number }[]` dans `LevelData`.
   - Lorsque le segment `[Alpha, Beta]` croise un pylône magnétique, la corde s'accroche au pylône comme une poulie et limite l'éloignement maximal (`maxLength`), permettant à Alpha d'utiliser le pylône pour retenir ou balancer Beta au-dessus d'un abîme sans sol.

### 2.2 Mécanique #2 : Fusion & Scission de Clones (`Constructive Interference`)

Lorsque plusieurs clones de Superposition sont présents (`heroes.length >= 2 && !isEntangled && !isPauliActive`) et que `levelData.allowCloneFusion !== false` :

1. **Fusion Constructive (`Super-Quanta`)** :
   - Si le héros actif entre en contact direct (`distance < 28 px`) avec un clone inactif (et qu'aucun des deux ne vient d'être créé depuis moins de `500 ms`), les deux clones **fusionnent en un unique `Hero` surchargé (`fusionStack = 2`)** :
     - Échelle visuelle `1,25×`, halo doré/cyan vibrant.
     - Impulsion de saut amplifiée de `1,32×` (`HERO_JUMP_V0 × 1.32`, soit `~250 px` de hauteur de saut au lieu de `145 px`).
     - Capacité de **briser les plateformes fissurées (`cracked?: boolean`)** en atterrissant dessus (ou via un Piqué Gravitationnel *Flick-Down* / touche `S`).
2. **Scission Multi-Étages en Plein Air (`In-Flight Fission`)** :
   - Lorsqu'un héros est en état `fusionStack >= 2` et se trouve en plein air (`!touchingGround`), un **Double-Tap tactile** (ou appui sur **`X` / `Espace` / `Tab`** au clavier) déclenche la **Scission** :
     - Le clone inférieur est éjecté vers le bas (`vy = +300`) pour aller activer une plaque de pression au sol.
     - Par conservation de la quantité de mouvement, le héros actif supérieur reçoit une **seconde impulsion ascendante (`vy = -480`, fusée à deux étages)** qui le propulse vers les hauteurs !

### 2.3 Mécanique #3 : Le Cylindre Spatial Non-Euclidien (`Screen-Wrap`)

Lorsque `levelData.screenWrap?: 'horizontal' | 'vertical' | 'both'` est activé sur un niveau :

1. **Topologie Toroïdale Sans Rebonds de Bord** :
   - Désactiver les rebonds sur les murs gauche et droit de `sceneBounds` (`x = 0` et `x = levelData.width`).
   - Dès que `hero.x < 0`, téléporter instantanément à `hero.x += levelData.width` en **conservant 100 % de `velocity.x`, `velocity.y` et `recoilVx`**.
   - Dès que `hero.x > levelData.width`, téléporter à `hero.x -= levelData.width` en conservant toute l'inertie.
2. **Rendu Spectral de Bordure (Continuité Visuelle)** :
   - Afficher sur les bords gauche (`x = 0`) et droit (`x = width`) un liseré ondulant violet/cyan, et projeter un double fantôme du héros sur le bord opposé dès qu'il s'approche à moins de `32 px` de la bordure, pour que la traversée cylindrique soit visuellement limpide.

---

## 3. Critères d'Acceptation

1. Une particule placée sur le segment reliant Alpha et Beta est automatiquement collectée par le faisceau d'intrication (`test` unitaire dans `src/physics/__tests__/entanglementTether.test.ts`).
2. Deux clones qui se touchent fusionnent en `Super-Quanta` (`fusionStack = 2`), peuvent briser une plateforme `cracked: true`, et se re-séparent en plein vol en propulsant le clone supérieur vers le haut.
3. Dans un niveau avec `screenWrap: 'horizontal'`, traverser `x = 0` vers la gauche fait ressortir le héros à `x = width` avec exactement la même vitesse `(vx, vy)`.
