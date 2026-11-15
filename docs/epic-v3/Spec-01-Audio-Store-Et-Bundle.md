# Spec-01 : Assainissement Audio, Store, Codec URL, Perf WebGL & Bundle

## 1. Contexte & Problématique

L'audit architectural de QuanticHero v2.0 a mis en évidence **7 anomalies techniques concrètes** qui dégradent l'expérience sonore, cassent le partage de niveaux par QR/URL, provoquent des micro-saccades WebGL/DOM sur mobile, saturent le `localStorage` et alourdissent le bundle initial de plus de 1,5 Mo :

1. **Double déclenchement WebAudio (+6 dB) et bug d'expiration de `time:dilation`** : `src/audio/SoundManager.ts` s'abonne déjà aux événements de `gameEvents` dans `init()`, mais `src/scenes/GameScene.ts` appelle aussi directement les méthodes `soundManager.play*()` juste avant d'émettre l'événement sur `gameEvents`. De plus, à la fin de la dilatation temporelle (`GameScene.ts:1473`), l'émission de `gameEvents.emit('time:dilation', { active: false, durationMs: 0 })` redéclenche par erreur le son d'activation dans `SoundManager.ts:59-61`.
2. **Perte de données dans le Codec de Partage URL/QR (`src/tools/levelCodec.ts`)** : `compressLevel()` et `decompressLevel()` réduisent chaque plateforme à un tuple `[x, y, w, h]`, détruisant `plat.kind` (`'wall'`), `plat.phase` (`'cyan' | 'magenta'`), `plat.decayMs`, ainsi que `gates`, `pressurePlates`, `collapse` et `entanglement`. Un niveau v2/v3 partagé par QR code devient injouable.
3. **Uploads de textures WebGL superflus à chaque frame & Recherche `O(N)` dans `GhostRecorder.ts`** : Dans `GameScene.update()` (`L1482, L1568`), `this.timerText.setText(...)` et `this.splitDeltaText.setText(...)` sont appelés à chaque frame (60–144 Hz) même quand la chaîne affichée n'a pas changé, forçant un `fillText` Canvas 2D + `gl.texImage2D` continu. De plus, `calculateSplitDelta()` (`GhostRecorder.ts:211-241`) parcourt linéairement toutes les frames du fantôme à chaque frame.
4. **Tempête de 100 Timers DOM dans `src/components/Molecules.ts`** : Sur le menu, 20 éléments DOM instancient chacun 3 `setInterval` et 2 `setTimeout` modifiant `style.left/top` toutes les `30 ms` (layout thrashing).
5. **Pollution du `localStorage` par l'Éditeur (`/editor`)** : Ouvrir `src/components/Editor/index.tsx` copie l'intégralité des 114 niveaux statiques (`levelsData`) dans `state.customLevels` et les persiste dans `window.localStorage` sous la clé `qtmhro`, figeant tous les niveaux de la campagne sur ce cache et saturant le quota de 5 Mo.
6. **Shim mort `react-router-redux`** : `src/shims/navigation.js`, `src/shims/react-router-redux.js` et l'alias dans `vite.config.js` maintiennent du code Redux mort non utilisé.
7. **Bundle gonflé par `src/data/levels.js` et `meta.path`** : Chaque `level*.json` stocke un tableau `meta.path` de ~500 lignes jamais lu au runtime (~1,5 Mo de JSON mort), et `src/data/levels.js` force l'inclusion synchrone des 114 niveaux dans le chunk initial.

---

## 2. Spécifications Détaillées

### 2.1 Correction du Bus Audio Événementiel (`SoundManager.ts` & `GameScene.ts`)

1. **Pilotage 100 % par `gameEvents`** :
   - Supprimer dans `src/scenes/GameScene.ts` les 7 appels directs redondants qui précèdent immédiatement un `gameEvents.emit(...)` :
     - `soundManager.playBounceSound()` (doublon de `hero:wall_bounce`).
     - `soundManager.playTimeDilationSound()` (doublon de `time:dilation`).
     - `soundManager.playPhaseShiftSound()` (doublon de `phase:shift`).
     - `soundManager.playMechanicalClick()` (doublon de `plate:trigger`).
     - `soundManager.playTunnelSound()` (doublon de `tunnel:use`).
     - `soundManager.playPauliBlastSound()` (doublon de `pauli:blast`).
     - `soundManager.playDecaySound()` (doublon de `platform:decay`).
2. **Distinction Activation vs Expiration de `time:dilation`** :
   - Dans `src/audio/SoundManager.ts` (listener `gameEvents.on('time:dilation', (payload) => ...)`), vérifier `if (payload.active) { this.playTimeDilationSound(); }` et, lorsque `!payload.active`, jouer un court balayage fréquentiel ascendant de retour au temps normal (`playTimeRestoreSound()`).

### 2.2 Sérialisation Sans Perte dans `src/tools/levelCodec.ts`

1. Étendre `MinifiedLevel`, `compressLevel()` et `decompressLevel()` dans `src/tools/levelCodec.ts` pour préserver intégralement :
   - Propriétés optionnelles des plateformes : `kind` (`'wall'`), `phase` (`'cyan' | 'magenta'`), `decayMs`, `cracked`, `matterState`.
   - Mécaniques de niveau : `gates`, `pressurePlates`, `collapse`, `entanglement`, `screenWrap`, `wormholes`.
2. Conserver la rétrocompatibilité avec les URLs `v1` existantes lors de la décompression.

### 2.3 Optimisation WebGL (`setText` Dirty-Check), `calculateSplitDelta` & `Molecules.ts`

1. **Dirty-Check sur les textes HUD fréquents (`GameScene.ts`)** :
   - Stocker `lastTimerString` et `lastSplitString`. N'appeler `this.timerText.setText(nextStr)` et `this.splitDeltaText.setText(nextSplit)` **que si la chaîne formatée a réellement changé** (et cadencer le calcul de `calculateSplitDelta` toutes les `100 ms` au lieu de chaque frame).
2. **Suppression de la tempête de timers DOM (`src/components/Molecules.ts`)** :
   - Remplacer les `setInterval`/`setTimeout` multiples par une unique boucle `requestAnimationFrame` utilisant `transform: translate3d(x, y, 0)` (compositing GPU sans reflow DOM) ou des animations CSS pures.

### 2.4 Stockage Différentiel dans `customLevels` (`src/store/index.ts` & `src/components/Editor/index.tsx`)

1. **Ne persister que les niveaux réellement modifiés par l'utilisateur** :
   - Dans `src/components/Editor/index.tsx`, supprimer le `useEffect` qui appelle `setLevels(levelsData)` à l'ouverture de l'éditeur.
   - Lire un niveau via un sélecteur fusionné `getEffectiveLevel(id) = state.customLevels?.[id] ?? builtInLevels[id]`.
   - Dans `src/store/index.ts`, modifier `updateLevelField`, `addItem` et `removeItem` pour qu'ils clonent uniquement le niveau `id` ciblé (`state.customLevels?.[id] ?? structuredClone(builtInLevels[id])`) sans copier les 113 autres niveaux dans `state.customLevels`.
   - Ajouter une action `resetCustomLevel(id: string)` permettant de restaurer un niveau modifié à sa version d'origine (`delete state.customLevels[id]`).

### 2.5 Nettoyage de `meta.path`, Suppression du Shim Redux & Allègement du Bundle

1. **Purge de `meta.path` dans `src/data/level*.json`** :
   - Modifier `scripts/generate-quantum-level.ts` pour ne plus écrire le tableau brut `meta.path` dans les fichiers JSON de production (conserver `meta.seed`, `meta.generatorVersion`, `authorTime` et `authorGhost`).
   - Nettoyer `meta.path` des fichiers `src/data/level*.json` existants.
2. **Suppression du shim `react-router-redux`** :
   - Supprimer `src/shims/react-router-redux.js`, nettoyer `routerReducer` et `routerMiddleware` de `src/shims/navigation.js`, et retirer l'alias `^react-router-redux$` de `vite.config.js`.

---

## 3. Critères d'Acceptation

1. Un test unitaire dans `src/audio/__tests__/SoundManager.test.ts` vérifie que chaque événement déclenche exactement **1 seul** appel de synthèse sonore, et que `time:dilation` avec `{ active: false }` ne joue pas le son d'activation.
2. Un test round-trip dans `src/tools/__tests__/levelCodec.test.ts` vérifie que `decompressLevel(compressLevel(level))` préserve `kind: 'wall'`, `phase`, `decayMs`, `gates`, `pressurePlates`, `collapse` et `entanglement` à 100 %.
3. `this.timerText.setText` et `this.splitDeltaText.setText` ne sont appelés que lorsque la chaîne formatée change, et `Molecules.ts` n'utilise plus aucun `setInterval`.
4. Ouvrir `/editor` et modifier le Niveau 1 ne stocke que la clé `"1"` dans `useGameStore.getState().customLevels` (`< 15 Ko` dans `localStorage`).
5. Le poids total des fichiers `src/data/level*.json` diminue d'au moins 60 % grâce à la suppression de `meta.path`, et `npm run build` + `npm test` passent sans erreur.
