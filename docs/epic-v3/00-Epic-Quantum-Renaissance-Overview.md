# 00 - Epic Quantum Renaissance v3.0 — Overview & Plan d'Orchestration

## 1. Vision & Objectifs de l'Epic

**QuanticHero v3.0 (« Quantum Renaissance »)** transforme le jeu en une expérience de plateforme quantique **Mobile-First (Tactile 1 ou 2 pouces en portrait 500×1000 px) avec parité Clavier 1:1**, viscérale dès la première seconde (« Toy Factor »), fluide sans coupure (« Zero-Cut Loop »), synesthésique, et ponctuée de révélations progressives (« Attends, ça c'est possible ?! ») sur les 7 Périodes des 118 éléments chimiques.

Cette Epic regroupe **12 Spécifications unitaires (Stories)** structurées en **5 Vagues** ordonnancées pour être exécutées via la compétence `orchestrate-epic` et déléguées pas à pas via `build-from-spec`.

---

## 2. Catalogue des 12 Spécifications (Stories) de l'Epic

| ID | Nom de la Spécification | Vague | Résumé Fonctionnel & Technique | Priorité |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `Spec-01-Audio-Store-Et-Bundle` | Vague 1 (Fondations) | Fix du double déclenchement WebAudio (+6 dB) et de `time:dilation`, sérialisation sans perte dans `levelCodec.ts` (QR/URL), dirty-check WebGL `setText` + throttling `calculateSplitDelta`, suppression des 100 timers DOM de `Molecules.ts`, stockage diff dans `customLevels`, suppression du shim `react-router-redux` et purge de `meta.path` (-1,5 Mo). | P0 (Critique) |
| **02** | `Spec-02-Unification-Physique` | Vague 1 (Fondations) | Indépendance au framerate (60 Hz vs 144 Hz) dans `Hero.ts` et extraction d'un noyau physique partagé `src/physics/stepHeroPhysics.ts` éliminant les 8 divergences entre Phaser (`GameScene.ts`) et le solveur (`simulator.ts`). | P0 (Critique) |
| **03** | `Spec-03-Tactile-Mobile-Et-Clavier` | Vague 2 (Touch & Feel) | Ruban d'ancre flottante (`Floating Thumb-Ribbon`), saut par impulsion (`Impulse Flick-Jump`), piqué gravitationnel (`Flick-Down` / `S`), `Quantum Orbit Switcher` (Double-Tap 1 pouce, balises `64×64 px`, `Tab` clavier + micro-bullet-time `180 ms`) et bouton Restart en zone pouce. | P0 (Core Feel) |
| **04** | `Spec-04-Toy-Factor-Et-Synthe` | Vague 2 (Touch & Feel) | Gravité asymétrique (`g_up = 650`, `g_down = 1150`), coupure de saut variable, `Apex Hang-Time`, `Coyote Time` (`90 ms`), `Jump Buffer` (`110 ms`), `Squash & Stretch` procédural, `Wave-Dash` d'atterrissage, plateformes « Cordes de Synthé » flexibles et caméra prédictive. | P0 (Core Feel) |
| **05** | `Spec-05-Boucle-Zero-Cut-Respawn` | Vague 3 (Addiction & Immersion) | Suppression de `this.game.destroy(true)` entre niveaux et suppression du rejeu de `showLevelTitle()` à la mort. Respawn in-place en `< 150 ms` avec trace spectrale, transition inter-niveaux glissée dans le canvas en `600 ms` et bandeau spectroscopique non-bloquant. | P1 (Addiction) |
| **06** | `Spec-06-Swarm-Replay-Et-Medailles` | Vague 3 (Addiction & Immersion) | `Swarm Replay` façon Super Meat Boy (rejeu simultané de toutes les tentatives ratées de la session aux côtés du run gagnant) et système de « Par » Quantique récompensant l'économie de sauts et d'inversions (Médailles d'Isotope). | P1 (Addiction) |
| **07** | `Spec-07-Synesthesie-Et-Bohr` | Vague 3 (Addiction & Immersion) | Quantification harmonique des SFX sur la grille WebAudio, 7 identités musicales par famille chimique, arrière-plan orbital de Bohr réactif (couches K, L, M, N de l'élément Z) et remplacement des toasts `150 px` par des hologrammes diégétiques. | P1 (Immersion) |
| **08** | `Spec-08-Corde-Fusion-Et-Cylindre` | Vague 4 (Nouvelles Possibilités) | 3 nouvelles mécaniques : (1) Corde d'Intrication Physique (lasso à particules, pivot pendulaire), (2) Fusion & Scission de Clones en Super-Quanta (fusée multi-étages), (3) Cylindre Spatial Non-Euclidien (`Screen-Wrap` `x = 0 ↔ 500`). | P1 (WOW) |
| **09** | `Spec-09-Matiere-Pinning-Wormholes` | Vague 4 (Nouvelles Possibilités) | 5 nouvelles mécaniques : (4) 4 États de la Matière des plateformes (`liquid`, `gas`, `cryo`, `plasma`), (5) Observation au doigt `Quantum Pinning` (Effet Zénon), (6) Trous de Ver d'Impulsion (`α ↔ ω`), (7) Échafaudage d'Onde de Broglie solidifiée, (8) Surf Temporel sur Fantôme (`Ghost Surfing`). | P1 (WOW) |
| **10** | `Spec-10-Secrets-HUD-Et-Alchimie` | Vague 5 (Secrets & Campagne) | 4 secrets cachés : (1) Toucher `[PHASE: CYAN]` dans le HUD commute la phase du monde, (2) Tracer un cercle autour de 3 bulles de fond crée une bulle d'antigravité, (3) Violation de l'Inégalité de Bell (`< 50 ms`), (4) Alchimie Multi-Touch dans `Home.tsx` débloquant 12 Niveaux Secrets Moléculaires (`H₂O`, `NaCl`, etc.). | P2 (Surprise) |
| **11** | `Spec-11-Archetypes-Smart-Et-WOW` | Vague 5 (Secrets & Campagne) | Implémentation des 6 archétypes de puzzles émergents (« Le Plancher Vivant » semelle contre semelle, « Le Télécommandeur de Phase », « Le Métronome Perpétuel », « La Passe Décisive », « Trampoline de Pauli », « Cage de Conservation ») et des 4 Set-Pieces signatures (Dézoom Niv. 110, Supernova Niv. 26→27, Tunneling de bord d'écran, Constellation finale Niv. 118). | P1 (Level Design) |
| **12** | `Spec-12-Campagne-7-Periodes-E2E` | Vague 5 (Secrets & Campagne) | Déploiement de la courbe d'onboarding silencieux sur les 7 Périodes (118 niveaux), ajout des « Safe Discovery Boxes » sans piques, des 7 Niveaux-Jouets « Gaz Nobles » sans mort (Z = 2, 10, 18, 36, 54, 86, 118) et validation E2E complète. | P1 (Campagne) |

---

## 3. Graphe de Dépendances (DAG) et Ordonnancement

```text
[VAGUE 1 : FONDATIONS TECHNIQUES]
   ├── Spec-01 (Assainissement Audio, Store & Bundle)
   └── Spec-02 (Unification Physique & Déterminisme Framerate)
          │
          ▼
[VAGUE 2 : MOBILE-FIRST & TOY FACTOR]
   ├── Spec-03 (Contrôleur Tactile Mobile-First & Parité Clavier)
   └── Spec-04 (Toy Factor, Physique Juteuse & Cordes de Synthé)
          │
          ▼
[VAGUE 3 : BOUCLE ZERO-CUT, SWARM & IMMERSION]
   ├── Spec-05 (Boucle Zero-Cut, Respawn <150ms & Transition Continue)
   ├── Spec-06 (Swarm Replay & Médailles d'Économie d'Action)   [Parallélisable avec 07]
   └── Spec-07 (Synesthésie Audio, Bohr Orbital & Narration Diégétique)
          │
          ▼
[VAGUE 4 : NOUVELLES MÉCANIQUES "ATTENDS, ÇA C'EST POSSIBLE ?!"]
   ├── Spec-08 (Corde d'Intrication Physique, Fusion de Clones & Cylindre Spatial)
   └── Spec-09 (États de la Matière, Quantum Pinning, Trous de Ver, Broglie & Ghost Surf)
          │
          ▼
[VAGUE 5 : SECRETS, ARCHÉTYPES "SMART" & CAMPAGNE 7 PÉRIODES]
   ├── Spec-10 (Secrets de Curiosité : HUD Physique, Bulles, Bell & Alchimie Multi-Touch)
   ├── Spec-11 (6 Archétypes "Smart" & 4 Moments Signatures "WOW")
   └── Spec-12 (Architecture Kishōtenketsu sur 7 Périodes, Gaz Nobles & Validation E2E)
```

---

## 4. Rétrocompatibilité & Contrats Techniques

1. **Extension non-cassante de `LevelData` (`src/types.ts`)** :
   Toutes les nouvelles propriétés (`screenWrap`, `entanglementTetherPhysical`, `cloneFusion`, `matterState`, `wormholes`, `parJumps`, `parReverses`, `discoveryBox`, `noblePlayground`) sont strictement optionnelles (`?`). Les 114 fichiers `level*.json` existants continuent de fonctionner sans modification préalable.
2. **Parité Tactile Portrait (`500×1000 px`) & Clavier** :
   Chaque mécanique introduite possède obligatoirement un geste naturel au pouce sur mobile ET un raccourci clavier dédié documenté et testé.
3. **Critères d'Acceptation Globaux** :
   - Compilation TypeScript stricte (`npx tsc --noEmit`) sans erreur.
   - Suite de tests unitaires et simulateur (`npm test`) 100 % au vert.
   - Build de production (`npm run build`) propre avec réduction d'au moins 40 % de la taille du bundle JS initial.
   - 60 FPS constants sur mobile et desktop avec respawn en moins de `150 ms`.
