# Spec-04 : « Toy Factor », Physique de Saut Juteuse & Plateformes « Cordes de Synthé »

## 1. Contexte & Problématique

Pour que QuanticHero procure le même plaisir kinesthésique immédiat que *Celeste* ou *Super Meat Boy* dès les 5 premières secondes du Niveau 1, le mouvement du héros et la réponse du décor doivent cesser d'être rigides et binaires :

1. Actuellement (`src/scenes/Hero.ts:218-222`), la parabole de saut est fixe et symétrique (`GRAVITY_Y = 700` en montée comme en descente), sans *Coyote Time* ni *Jump Buffering*. Un saut pressé `1 frame` trop tôt avant l'atterrissage ou `1 frame` après avoir quitté un bord est purement ignoré.
2. Le sprite du héros conserve une échelle rigide `(1, 1)` en toutes circonstances, sans déformation élastique au décollage, à l'atterrissage ou au rebond mural.
3. Les plateformes sont des rectangles inertes (`Phaser.GameObjects.Rectangle`) qui ne réagissent pas à l'impact du joueur.

---

## 2. Spécifications Détaillées

### 2.1 Saut Asymétrique, *Variable Jump Cut* & *Apex Hang-Time*

Tout en préservant la hauteur maximale (~145 px) et la portée horizontale (~450 px) d'un saut maintenu complet (afin que 100 % des niveaux existants restent valides), enrichir `Hero.ts` et `src/physics/constants.ts` :

1. **Coupure de Saut Variable (*Variable Jump Height*)** :
   - Tant que le héros monte (`vy × upsideDown < 0`), si le joueur relâche l'input de saut (clavier ou *quick-flick* tactile), multiplier la vitesse verticale par `PHYSICS.JUMP_CUT_MULTIPLIER = 0.45` (une seule fois par saut), permettant de réaliser de petits sauts précis sous les plafonds de piques.
2. **Flottement au Sommet (*Apex Hang-Time*) & Chute Franche** :
   - Près du sommet du saut (`|vy| < 45 px/s`), réduire la gravité effective de `40 %` pour offrir une fenêtre de contrôle aérien confortable.
   - En phase de chute (`vy × upsideDown > 45 px/s`), appliquer un multiplicateur de gravité descendante `FALL_GRAVITY_MULT = 1.35` (plafonné à une vitesse terminale `MAX_FALL_VY = 680 px/s`) pour un atterrissage nerveux et réactif.

### 2.2 *Coyote Time* (`90 ms`) & *Jump Buffering* (`110 ms`)

1. **Coyote Time (`PHYSICS.COYOTE_TIME_MS = 90`)** :
   - Stocker `lastGroundedTimeMs` sur chaque `Hero`. Tant que `now - lastGroundedTimeMs <= 90 ms` et que le héros n'a pas déjà sauté, autoriser le déclenchement du saut même après avoir quitté le rebord d'une plateforme.
2. **Jump Buffer (`PHYSICS.JUMP_BUFFER_MS = 110`)** :
   - Stocker `lastJumpPressedTimeMs` lorsqu'un nouvel appui de saut survient en l'air. Si le héros touche le sol alors que `now - lastJumpPressedTimeMs <= 110 ms`, déclencher instantanément le saut à la frame d'impact.

### 2.3 *Squash & Stretch* Procédural, *Hit-Stop* & *Wave-Dash*

1. **Déformation élastique par Tween sur `Hero.ts`** :
   - **Décollage de saut** : étirement vertical `scaleX = 0.78, scaleY = 1.25` revenant à `(1, 1)` en `140 ms` (`Back.easeOut`).
   - **Atterrissage** : écrasement proportionnel à la vitesse d'impact `scaleX = 1.28, scaleY = 0.74` revenant à `(1, 1)` en `120 ms` avec une bouffée de 6 particules lumineuses rasantes.
   - **Rebond sur mur néon (`kind: 'wall'`)** : *hit-stop* visuel de `22 ms` sur le héros, compression latérale `scaleX = 0.65, scaleY = 1.32` et gerbe d'étincelles perpendiculaire au mur.
2. **Micro-Boost d'Atterrissage (*Quantum Wave-Dash*)** :
   - Si le joueur déclenche un saut dans les `70 ms` suivant la fin d'un Piqué Gravitationnel (`Flick-Down` de la Spec-03), transférer l'énergie cinétique verticale en un boost horizontal temporaire (`velocityMultiplier × 1.22` pendant `260 ms`), offrant une technique avancée grisante pour les speedrunners.

### 2.4 Plateformes « Cordes de Synthé » (Impact Élastique & Onde Lumineuse)

Dans `src/scenes/GameScene.ts`, lors du premier contact d'atterrissage d'un héros sur une plateforme (`touchingTop` passe de `false` à `true`) :

1. **Flexion Élastique Verticale (`2 à 4 px`)** :
   - Animer la position visuelle de la plateforme de `+3 × hero.upsideDown` pixels vers le bas puis retour élastique en `160 ms` (`Sine.easeOut`), comme une lame de xylophone ou une corde tendue.
2. **Onde Lumineuse d'Impact** :
   - Émettre un flash spéculaire au point exact d'impact `hero.x` qui se propage vers les deux extrémités gauche et droite de la plateforme en `200 ms`.

### 2.5 Caméra Prédictive (*Look-Ahead*)

- Ajouter un décalage de visée dynamique (*Look-Ahead*) sur la caméra principale (`followOffset.x = clamp(-hero.body.velocity.x × 0.18, -70, 70)`, `followOffset.y = clamp(-hero.body.velocity.y × 0.12, -55, 55)`) interpolé en douceur, afin que le joueur voie toujours venir les obstacles devant sa course.

---

## 3. Critères d'Acceptation

1. Appuyer sur Saut `80 ms` avant de toucher le sol déclenche le saut dès la frame d'impact (*Jump Buffer*).
2. Appuyer sur Saut `75 ms` après avoir dépassé le bord d'une plateforme déclenche le saut normalement (*Coyote Time*).
3. Relâcher le saut après `60 ms` produit un saut court d'environ `55-75 px` de haut, tandis qu'un appui maintenu conserve l'enveloppe nominale de `~145 px`.
4. Le héros présente un *Squash & Stretch* fluide au saut, à l'atterrissage et au rebond mural, et les plateformes fléchissent visuellement sous ses pas.
