# Spec-07 : Synesthésie Audio-Visuelle, Modèle de Bohr Réactif & Narration Diégétique

## 1. Contexte & Problématique

Actuellement, les 114 niveaux de QuanticHero partagent :
1. **La même boucle musicale de 4 notes** en La mineur (`[110, 110, 130.81, 146.83]` Hz dans `src/audio/SoundManager.ts:816`) et des effets sonores à fréquences fixes qui entrent en dissonance avec la BGM.
2. **Le même fond générique** (`createMolecules()` dans `src/scenes/GameScene.ts:804-819`) composé de 25 cercles aléatoires sans rapport avec le numéro atomique `Z` de l'élément joué.
3. **Des bannières de texte intrusives de `150 px`** (`showRetroToast()` dans `GameScene.ts:1254`) qui masquent le héros et les piques en plein saut lors du ramassage d'un power-up.

---

## 2. Spécifications Détaillées

### 2.1 Synesthésie Musicale : 7 Identités par Famille Chimique & SFX Quantifiés (`SoundManager.ts`)

1. **7 Palettes Harmoniques & Rythmiques Procédurales** :
   Associer le numéro atomique `Z` du niveau à sa famille chimique (via `SPECTROSCOPY_DATABASE` dans `src/data/spectroscopy.ts`) pour adapter la gamme, le timbre d'oscillateur et le BPM de la BGM WebAudio :
   - **Gaz Nobles (`Z = 2, 10, 18, 36, 54, 86, 118`)** : Mode Lydien aérien, accords majeurs 7e en onde sinusoïdale/triangle, arpèges cristallins.
   - **Métaux Alcalins & Alcalino-Terreux** : Basse *acid* nerveuse (`sawtooth` filtrée), tempo entraînant (`128 BPM`).
   - **Métaux de Transition (`Fe`, `Co`, `Ni`, `Cu`, `Au`...)** : Synthwave mélodique en mode Dorien, pulsation arpégée régulière.
   - **Non-Métaux & Halogènes (`C`, `N`, `O`, `F`, `Cl`, `Br`)** : Rythmique syncopée, timbres FM brillants.
   - **Lanthanides & Actinides (`Z ≥ 57`, éléments radioactifs)** : Mode Phrygien tendu, sub-bass profonde et micro-pulsations de compteur Geiger rythmiques.
2. **Quantification Harmonique des SFX (Le Niveau comme Séquenceur)** :
   - Les sons de saut (`playJumpSound`), d'atterrissage sur plateforme (« Corde de Synthé » de la Spec-04), de rebond mural (`playBounceSound`) et de collecte de particule piochent leur fréquence fondamentale dans les degrés de l'accord actif de la BGM (1re, 3ce, 5te, 7e, 9e), de sorte que jouer au jeu compose une mélodie toujours juste.

### 2.2 Arrière-Plan Orbital de Bohr Dynamique (`src/effects/BohrBackgroundRenderer.ts`)

En complément (ou remplacement structuré) des bulles de fond :

1. **Couches Électroniques Réelles `(K, L, M, N, O, P, Q)` de l'Atome `Z`** :
   - Calculer la configuration électronique par couche de l'élément `Z` (ex. Carbone `Z = 6` → `[2, 4]` ; Fer `Z = 26` → `[2, 8, 14, 2]`).
   - Dessiner en parallaxe (`scrollFactor: 0.25`, `depth: 1`) le noyau luminescent et les anneaux orbitaux concentriques aux couleurs des raies d'émission réelles (`spectralLines` de `SPECTROSCOPY_DATABASE`).
2. **Réactivité au Gameplay** :
   - Les anneaux orbitaux pulsent subtilement sur le battement (`beat`) de la BGM.
   - Chaque fois que le joueur ramasse une particule d'énergie dans le niveau, un électron lumineux vient s'orbiter sur la couche externe (couche de valence) du modèle de Bohr en arrière-plan !

### 2.3 Narration & Feedback Diégétiques (Remplacement du Toast `150 px`)

- Remplacer le texte plein écran `150 px` de `showRetroToast` par :
  1. Un **halo diégétique ancré dans le décor** à la coordonnée `(hero.x, hero.y - 36)` en police `24 px` nette qui flotte vers le haut avec parallaxe sans jamais cacher les obstacles.
  2. Une **inscription murale holographique** en arrière-plan (`depth: 2`, `alpha: 0.35`) qui affiche le symbole atomique géant (`H`, `He`, `Li`, `Fe`...), sa masse atomique et son vers narratif cosmique directement dans l'architecture du niveau.

---

## 3. Critères d'Acceptation

1. `SoundManager.ts` sélectionne automatiquement le profil musical correspondant à la famille de l'atome `Z` et harmonise les fréquences des SFX sur la gamme active.
2. `BohrBackgroundRenderer.ts` calcule exactement la répartition électronique des éléments `Z = 1` à `118` (ex. `getElectronShells(6)` retourne `[2, 4]`, `getElectronShells(10)` retourne `[2, 8]`) et ajoute un électron visible à chaque collecte de particule.
3. Aucun texte toast ne dépasse `32 px` ni n'occulte le héros au centre de l'écran.
