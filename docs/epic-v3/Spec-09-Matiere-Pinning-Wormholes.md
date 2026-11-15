# Spec-09 : Mécaniques « WOW » (Partie 2) — États de la Matière, Quantum Pinning, Trous de Ver, Échafaudage de Broglie & Ghost Surfing

## 1. Contexte & Objectif

Cette spécification implémente les **5 mécaniques restantes (#4 à #8)** du Volet 2bis, exploitant la richesse chimique des éléments (états liquide, gazeux, cryo, plasma), l'observation tactile directe (Effet Zénon quantique), la conservation d'impulsion par trous de ver, la cristallisation des ondes de Broglie et le rebond temporel sur fantôme.

---

## 2. Spécifications Détaillées

### 2.1 Mécanique #4 : Les 4 États de la Matière des Plateformes (`matterState`)

Ajouter la propriété optionnelle `matterState?: 'solid' | 'liquid' | 'gas' | 'cryo' | 'plasma'` sur `Platform` (`src/types.ts`) :

1. **`liquid` (Brome `Z=35`, Mercure `Z=80`, Eau `H₂O`)** :
   - Par défaut, un héros qui marche dessus flotte à la surface avec une légère ondulation.
   - Si le joueur effectue un **Piqué (`Flick-Down` / touche `S` ou `ArrowDown`)** ou arrive de haut avec `vy > 380`, **il plonge à l'intérieur de la plateforme liquide** !
   - À l'intérieur du liquide : gravité inversée douce (poussée d'Archimède `vy -= 900 × dt`), permettant de **nager sous un mur de piques qui touche la surface**, puis de jaillir hors du liquide comme un dauphin (`vy = -520`) !
2. **`gas` (Nuages de Gaz Nobles : Hélium, Néon, Argon, Xénon)** :
   - Pas de collision dure : traverser un nuage gazeux applique un courant ascendant fluide (`vy = clamp(vy - 1100 × dt, -340, 200)`), permettant de planer à travers de grands puits verticaux.
3. **`cryo` (Azote solide / Glace quantique)** :
   - Zéro friction au sol (`groundDrag = 1.0`) : un héros qui atterrit dessus après un rebond mural (`WALL_RECOIL_VX`) conserve 100 % de sa vitesse de glisse sans jamais ralentir jusqu'au bout de la piste.
4. **`plasma` (Cœur stellaire haute température)** :
   - Trampoline élastique à super-rebond : tout contact renvoie le héros à `vy = -640 × upsideDown` (`1,42×` le saut standard) avec un accord synthé brillant.

### 2.2 Mécanique #5 : L'Observation par le Doigt (`Quantum Pinning` — Effet Zénon)

En physique quantique, observer en continu un état instable empêche sa désintégration (Effet Zénon quantique) :

1. **Verrouillage Tactile & Clavier** :
   - Sur mobile : **poser et maintenir un doigt** (second doigt ou clic maintenu) directement sur une plateforme à demi-vie (`decayMs`) ou une plateforme de phase (`cyan`/`magenta`).
   - Au clavier : maintenir la touche **`F` (Freeze / Observe)** verrouille la plateforme `decayMs` ou `phase` la plus proche du héros dans un rayon de `180 px`.
2. **Comportement Physique** :
   - Tant que la plateforme est « observée » (maintenue), un œil/anneau quantique doré l'entoure :
     - Si c'est une plateforme `decayMs`, son compteur de désintégration est gelé (`decayPaused = true`).
     - Si c'est une plateforme `phase`, elle ignore les bascules `cyan ↔ magenta` provoquées par les sauts (`phasePinned = true`) et conserve son état actuel (solide ou intangible) !
   - Limitateur d'équilibrage : maximum **1 plateforme verrouillée simultanément** pendant `3,5 secondes` max avant surcharge thermique (`cooldown` de `1,5 s`).

### 2.3 Mécanique #6 : Les Trous de Ver de Conservation d'Impulsion (`Momentum Wormholes`)

Ajouter `wormholes?: { id: string; inX: number; inY: number; inNormalAngleDeg: number; outX: number; outY: number; outNormalAngleDeg: number; color?: string }[]` dans `LevelData` :

- Lorsqu'un héros pénètre dans l'anneau `in` avec un vecteur vitesse `(vx, vy)` de norme `speed = Math.hypot(vx, vy)` (`min 250 px/s`), il ressort instantanément par l'anneau `out` avec un vecteur vitesse de **même norme `speed`** orienté selon `outNormalAngleDeg` :
  - `outVx = Math.cos(outRad) × speed`
  - `outVy = Math.sin(outRad) × speed`
- Plonger verticalement à pleine vitesse (`vy = 680`) dans un trou de ver au sol (`inNormal = -90°`) catapulte le héros horizontalement hors d'un mur (`outNormal = 0°`) à `vx = +680 px/s` !

### 2.4 Mécaniques #7 & #8 : Échafaudage d'Onde de Broglie & Surf Temporel sur Fantôme

1. **#7 Échafaudage d'Onde de Broglie (`Wave-Trail Solidification`)** :
   - Lorsqu'un niveau possède plusieurs clones (ou une particule `condense`), un **Tap à 2 doigts** (ou touche **`C`** au clavier) en plein saut cristallise les 8 derniers points de la traînée d'onde de Broglie du héros en une **passerelle de cristal cyan solide pendant `2,5 secondes`** sur laquelle les autres clones (ou le héros lui-même après rebond mural) peuvent marcher !
2. **#8 Surf Temporel sur Fantôme (`Ghost Surfing`)** :
   - Lorsque le `GhostHero` est visible et actif à l'écran, si le héros en phase descendante (`vy × upsideDown > 0`) entre en contact avec la boîte supérieure de son propre `GhostHero` (`|hero.x - ghost.x| < 26 && |hero.y - ghost.y| < 28`), il déclenche un **Rebond Temporel** (`vy = -520 × upsideDown`) accompagné d'une onde chronologique dorée (1 rebond par saut).

---

## 3. Critères d'Acceptation

1. Tests unitaires dans `src/physics/__tests__/matterStates.test.ts` validant la flottabilité et le saut de dauphin dans `liquid`, l'ascendance dans `gas`, le glissement sans perte dans `cryo` et le super-rebond dans `plasma`.
2. Maintenir un pointeur ou la touche `F` sur une plateforme `decayMs` ou `phase` fige son état pendant sa durée d'observation (`Quantum Pinning`).
3. Entrer dans un trou de ver à `(vx = 0, vy = 650)` avec `outNormalAngleDeg = 0` réoriente bien la sortie à `(vx = 650, vy = 0)`.
4. La cristallisation de Broglie (`C` / 2-finger tap) crée une rampe temporaire solide de `2,5 s`, et sauter sur la tête de `GhostHero` déclenche le rebond temporel.
