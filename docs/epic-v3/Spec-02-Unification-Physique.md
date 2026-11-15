# Spec-02 : Unification Physique & Déterminisme Indépendant du Framerate

## 1. Contexte & Problématique

L'audit technique a révélé deux failles majeures dans la simulation physique de QuanticHero :

1. **Physique dépendante du taux de rafraîchissement (60 Hz vs 120/144 Hz)** :
   Dans `src/scenes/Hero.ts`, la décélération du rebond mural (`this.recoilVx *= PHYSICS.WALL_RECOIL_DRAG_X` à la ligne 170) et la friction aérienne (`this.body.velocity.x *= drag` à la ligne 214) sont appliquées une fois par frame sans exposant `delta / PHYSICS.DELTA_FIXED_MS`. Sur un smartphone 120 Hz ou un écran PC 144 Hz, le héros freine 2 à 2,4× plus vite qu'à 60 Hz, rendant certains sauts de rebond mural beaucoup plus courts.
2. **« Split-Brain Physics » (8 divergences entre `GameScene.ts` et `src/generator/simulator.ts`)** :
   Le runtime Phaser et le simulateur Node du générateur possèdent deux implémentations distinctes qui divergent sur 8 mécaniques (plateformes mobiles ignorées par le solveur, durée de `timeDilation` 4000 ms vs 5000 ms, demi-vie `decayMs` sous dilatation, répulsion de Pauli, boîte `tunnel`, cumul `lowGravity`, hitbox `pressurePlates` et position initiale de `collapse`).

---

## 2. Spécifications Détaillées

### 2.1 Amortissement Indépendant du Framerate dans `src/scenes/Hero.ts`

Remplacer toutes les multiplications de friction par frame par une loi exponentielle dépendante du temps écoulé `delta` :

```ts
const frameRatio = delta / PHYSICS.DELTA_FIXED_MS;
// Rebond mural (Hero.ts)
this.recoilVx *= Math.pow(PHYSICS.WALL_RECOIL_DRAG_X, frameRatio);

// Friction aérienne (Hero.ts)
const baseDrag = isHighSpeed ? 0.996 : PHYSICS.AIR_DRAG_X;
this.body.velocity.x *= Math.pow(baseDrag, frameRatio);
```

### 2.2 Noyau Pur Partagé `src/physics/stepHeroPhysics.ts` & Alignement des 8 Divergences

Créer un module pur sans dépendance DOM/Phaser (`src/physics/stepHeroPhysics.ts`) et aligner rigoureusement `GameScene.ts` et `src/generator/simulator.ts` sur les 8 points suivants :

| # | Mécanique | Règle Unifiée Unique (`PHYSICS` & `stepHeroPhysics.ts`) |
| :--- | :--- | :--- |
| **1** | **Plateformes Mobiles (`movesTo`)** | `simulator.ts` met à jour `mp.x` et `mp.y` à chaque pas de `16,66 ms` avec `vx = ±100 × timeDilationFactor` et `vy = ±20 × timeDilationFactor`, exactement comme `GameScene.ts`. |
| **2** | **Durée `timeDilation`** | Unifiée à `PHYSICS.TIME_DILATION_DURATION_MS = 4000` ms dans `constants.ts`, `GameScene.ts` et `simulator.ts`. |
| **3** | **Demi-vie (`decayMs`)** | Utiliser exclusivement `updateDecayPlatform(state, delta, timeDilationFactor)` de `src/physics/quantumMechanics.ts` dans `GameScene.ts` ET dans `simulator.ts` (avec régénération à `2500 ms`). |
| **4** | **Répulsion de Pauli** | Utiliser exclusivement `checkPauliRepulsion(heroes, timeMs)` (`d < 75 px`, impulsion `vx = ±620`, `vy = -580`) dans les deux moteurs. |
| **5** | **Géométrie `tunnel`** | Utiliser exclusivement `checkTunnelObstacle(x, y, 40, 40, dir, plat)` dans `GameScene.ts` et `simulator.ts`. |
| **6** | **Particule `lowGravity`** | Comportement unifié : `gravityMultiplier *= 0.5` (cumulatif plafonné à `min = 0.25`) dans les deux moteurs. |
| **7** | **Hitbox `pressurePlates`** | Demi-largeur `16 px` et demi-hauteur `20 px` (`HERO_HITBOX_HALF_W = 16`, `HERO_HITBOX_HALF_H = 20`) partagées dans `constants.ts`. |
| **8** | **Mâchoires `collapse`** | Coordonnées initiales extraites dans `PHYSICS.COLLAPSE_TOP_START_Y = 280` et `PHYSICS.COLLAPSE_BOTTOM_MARGIN_Y = 140` utilisées par `calculateCollapse`. |

---

## 3. Critères d'Acceptation

1. Un test unitaire Vitest (`src/physics/__tests__/framerateInvariance.test.ts`) simule `220 ms` de rebond mural et `500 ms` de dérive aérienne à `30 Hz`, `60 Hz`, `120 Hz` et `240 Hz` et vérifie que la position finale `(x, y)` varie de moins de `0,5 px`.
2. Un test de parité (`src/physics/__tests__/simulatorParity.test.ts`) vérifie que `simulator.ts` utilise directement `checkTunnelObstacle`, `checkPauliRepulsion`, `updateDecayPlatform` et `calculateCollapse` depuis `src/physics/quantumMechanics.ts` sans duplication de formules.
3. Tous les tests existants (`npm test`) passent au vert.
