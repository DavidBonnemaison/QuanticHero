# Spec-03 : Contrôleur Tactile Mobile-First & Parité Clavier 1:1

## 1. Contexte & Problématique

QuanticHero est conçu en format portrait Mobile-First (`500×1000 px`), jouable à un ou deux pouces sur smartphone tout en restant 100 % jouable au clavier sur PC. Or, l'implémentation actuelle de `setupPointerControls()` dans `src/scenes/GameScene.ts:821-844` souffre de 4 limitations majeures :

1. **Ancre fixe punitive (`pointerStartX`)** : Si le joueur glisse son pouce de `+70 px` vers la droite puis recule de `-30 px` pour éviter un pic à gauche, `deltaX` vaut encore `+40 px > 20` — le héros continue de courir à droite dans les piques.
2. **Saut verrouillé (`deltaY < -20`)** : Tant que le pouce est au-dessus de l'origine initiale, `touchInput.jump` reste bloqué à `true`, empêchant de doser la hauteur de saut ou d'enchaîner deux sauts sans redescendre tout en bas de l'écran.
3. **Sélection de clone frustrante (`hero-clicked`)** : Toucher un sprite de `32×48 px` en mouvement oblige à lâcher le pouce (ce qui coupe la course via `pointerup`) et à viser sous son propre doigt. Au clavier, aucune touche ne permet de changer de clone sans utiliser la souris.
4. **Bouton `[RST]` hors de portée du pouce** : Situé tout en haut à gauche (`x: 44, y: 5`), il oblige à changer la prise en main du téléphone.

---

## 2. Spécifications Détaillées

### 2.1 Le « Floating Thumb-Ribbon » (Ancre Horizontale Glissante)

Créer un contrôleur dédié `src/input/MobileTouchController.ts` intégré à `GameScene.ts` :

1. **Ancre élastique suiveuse (`MAX_TETHER_X = 24 px`, `DEADZONE_X = 8 px`)** :
   - Lors de `pointermove`, si `pointer.x - anchorX > 24`, mettre à jour `anchorX = pointer.x - 24`.
   - Si `pointer.x - anchorX < -24`, mettre à jour `anchorX = pointer.x + 24`.
   - Direction active : `touchInput.right = (pointer.x - anchorX) > 8` et `touchInput.left = (pointer.x - anchorX) < -8`.
   - Ainsi, dès que le pouce inverse son mouvement de seulement `16 px` (`+24 → +8` ou `-8`), le demi-tour est immédiat, même après un long glissement sur l'écran.
2. **Feedback visuel discret sous le pouce** :
   - Dessiner un fin filament néon (`alpha: 0.22`, désactivable si `reducedEffects`) reliant `(anchorX, anchorY)` à `(pointer.x, pointer.y)` pour donner une sensation tactile élastique immédiate.

### 2.2 « Impulse Flick-Jump », Hauteur Variable & Piqué Quantique (`Flick-Down`)

1. **Déclenchement de saut par impulsion verticale** :
   - Suivre une ancre verticale glissante `anchorY`. Dès que `pointer.y - anchorY < -18` (mouvement ascendant rapide du pouce), activer `touchInput.jump = true` et `touchInput.jumpJustPressed = true`.
   - Dès que le pouce cesse de monter ou redescend de `+8 px` par rapport à son point haut (`minPointerY`), passer `touchInput.jumpHeld = false` (ce qui déclenche la coupure de saut court *Variable Jump Cut* de la Spec-04) et réarmer `anchorY = pointer.y` pour permettre un nouveau saut immédiat sans lever le pouce.
2. **Nouveau mouvement : Piqué Gravitationnel (`Flick-Down` / Touche `S` ou `ArrowDown`)** :
   - En plein air (`!touchingGround`), un glissement rapide vers le bas (`pointer.y - anchorY > 28` en moins de `120 ms` sur mobile, ou appui sur `S` / `ArrowDown` au clavier) active `diveRequested = true` :
     - Annule la vitesse horizontale résiduelle de moitié et applique une vitesse verticale descendante franche `vy = 720 × upsideDown` avec une traînée verticale cyan.
     - Permet d'atterrir chirurgicalement sur une minuscule plateforme ou de plonger dans les plateformes liquides (Spec-09).

### 2.3 Le « Quantum Orbit Switcher » (Changement de Clone Tactile & Clavier)

Lorsque le niveau comporte plusieurs héros actifs en Superposition (`heroes.length > 1 && !isEntangled`) :

1. **Mode 1 Pouce — Double-Tap & Hold** :
   - Un **Double-Tap rapide** (`< 220 ms` entre deux `pointerdown`) n'importe où sur la zone de jeu appelle `cycleFocusNext()` tout en **conservant le second appui actif comme point d'ancrage de course** : le joueur change de clone et continue à courir sans lever le pouce.
2. **Mode 2 Pouces — Balises Magnétiques (`Edge-Pips` `64×64 px`)** :
   - Afficher en bas à gauche de l'écran (zone du pouce secondaire, `y = height - 70`) des pastilles interactives `64×64 px` (`ψ₁`, `ψ₂`, `ψ₃`) correspondant à chaque clone, ainsi qu'une zone de clic élargie à `64×64 px` autour de chaque sprite `Hero`.
3. **Parité Clavier 1:1** :
   - Les touches **`Tab`** et **`E`** appellent `cycleFocusNext()`.
   - Les touches **`1`, `2`, `3`** sélectionnent directement le clone `ψ₁, ψ₂, ψ₃`.
4. **Micro-Bullet-Time d'Orientation (`180 ms` à `0.2x`)** :
   - À chaque changement de focus, ralentir le facteur temporel à `0.2x` pendant `180 ms` et tracer un arc électrique entre l'ancien et le nouveau clone pendant que la caméra interpole vers la nouvelle cible, afin que le joueur visualise immédiatement son nouvel avatar.

### 2.4 Bouton Restart dans la « Thumb Zone » & Raccourci `R`

- Ajouter un bouton de redémarrage rapide semi-transparent (`↻`, `48×48 px`, `alpha: 0.35`) dans le coin inférieur droit de l'écran (`x = camW - 36, y = camH - 36`) accessible d'un effleurement du pouce, et lier la touche **`R`** au clavier au respawn immédiat.

---

## 3. Critères d'Acceptation

1. Sur écran tactile (et en émulation pointeur), glisser le pouce de `+120 px` à droite puis reculer de `-18 px` à gauche inverse immédiatement la direction du héros vers la gauche.
2. En Superposition (2 clones ou plus), un Double-Tap tactile ou un appui sur `Tab` / `E` au clavier change le clone actif avec le micro-bullet-time de `180 ms`.
3. Un geste *Flick-Down* en l'air (ou touche `S` / `ArrowDown`) déclenche le Piqué Gravitationnel (`vy = 720 × upsideDown`).
4. Tests unitaires Vitest sur `MobileTouchController.ts` validant l'ancre glissante, le *flick-jump*, le *flick-down* et le *double-tap switch*.
