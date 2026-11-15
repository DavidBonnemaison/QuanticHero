# Spec-10 : Secrets de Curiosité — HUD Physique Interactif, Bulles de Fond, Bell Sync & Alchimie Multi-Touch

## 1. Contexte & Objectif

Inspirée de *The Witness*, *Animal Well*, *Fez* et *Tunic*, cette spécification implémente **4 secrets d'interactions cachées** présents dès le début du jeu sans aucun pop-up explicatif, récompensant l'esprit d'expérimentation du joueur (« *Attends, on pouvait faire ça depuis le Niveau 1 ?!* »).

---

## 2. Spécifications Détaillées

### 2.1 Secret #1 : Le HUD est un Objet Physique du Monde (`Touch the HUD`)

Dans `src/scenes/GameScene.ts:1007-1020`, le texte `this.phaseIndicatorText` affiche `[PHASE: CYAN]` ou `[PHASE: MAGENTA]` dans la barre supérieure du HUD lorsqu'un niveau contient des plateformes phasées.

1. **Interactivité Directe Tactile & Clavier (`Q`)** :
   - Rendre `this.phaseIndicatorText` interactif (`setInteractive({ useHandCursor: true })`) avec une zone de hit tactile confortable (`120×36 px`).
   - Lorsque le joueur **tape directement sur `[PHASE: CYAN]` dans le HUD** (ou appuie sur la touche **`Q`** au clavier), appeler `this.togglePhasePlatforms()` exactement comme lors d'un saut, avec un flash sur le badge HUD !
   - Cela permet au joueur malin d'inverser la phase des plateformes **sans sauter** (sous un plafond de piques bas) ou **une seconde fois en plein saut** !

### 2.2 Secret #2 : Récolte des Bulles Moléculaires de Fond (`Background Molecule Harvesting`)

Dans `src/scenes/GameScene.ts:804-819` (`createMolecules()`), 25 cercles translucides dérivent en arrière-plan depuis le Niveau 1.

1. **Fusion de 3 Bulles par le Doigt / Curseur** :
   - Si le joueur glisse son doigt ou son curseur en passant à moins de `35 px` du centre de **3 bulles de fond en moins de `800 ms`**, les 3 bulles convergent dans un tintement cristallin vers le barycentre du geste et forment une **Bulle d'Antigravité Temporaire** (`duration = 4000 ms`, rayon `36 px`) dans le plan de jeu !
   - Si un héros saute dans cette bulle, elle l'enveloppe et le fait léviter doucement vers le haut (`vy = -180 px/s`) pendant `2 secondes` ou jusqu'au prochain saut.

### 2.3 Secret #3 : Violation de l'Inégalité de Bell (`Synchronisation < 50 ms`)

Dans `handleEntangledPortalArrival` (`src/scenes/GameScene.ts`), enregistrer le timestamp exact `alphaArrivalTimeMs` et `betaArrivalTimeMs` :

- Si `Math.abs(alphaArrivalTimeMs - betaArrivalTimeMs) <= 50 ms` (les deux jumeaux intriqués franchissent leur portail au même instant), déclencher l'événement secret `bell:violation` :
  - Effet visuel doré plein écran et accord harmonique céleste dans `SoundManager.ts`.
  - Attribution automatique du badge secret **« Bell Sync (Isotope d'Or) »** dans le store Zustand pour ce niveau.

### 2.4 Secret #4 : Synthèse Moléculaire Multi-Touch dans le Tableau Périodique (`Home.tsx` & `src/data/molecules.ts`)

Sur l'écran du Tableau Périodique (`src/components/Home.tsx` / `LevelSelection.tsx`) :

1. **Combinaison de 2 Éléments Chimiques (Multi-Touch 2 Doigts ou `Shift + Clic`)** :
   - Sur mobile : maintenir un doigt sur un élément `A` (pendant `> 250 ms` sans relâcher) puis toucher un second élément `B` avec un deuxième doigt.
   - Sur PC : maintenir `Shift` (ou bouton droit / mode « Liaison Chimique ⚗️ ») et cliquer sur `A` puis `B`.
2. **12 Recettes Moléculaires Secrètes (`src/data/molecules.ts`)** :
   Si la paire `{A, B}` correspond à l'une des 12 molécules secrètes, animer une liaison covalente lumineuse entre les deux cases du tableau et débloquer puis lancer le **Niveau Secret Moléculaire** correspondant :

| # | Formule | Éléments Combinés (`Z₁ + Z₂`) | Nom du Niveau Secret | Mécanique Signature du Niveau |
| :- | :--- | :--- | :--- | :--- |
| **M1** | `H₂O` | `H (1) + O (8)` | *The Water Anomaly* | Plateformes d'eau liquide (`liquid`) et rebonds cryo-glace (`cryo`). |
| **M2** | `NaCl` | `Na (11) + Cl (17)` | *Ionic Crystal Lattice* | Réseau cubique de plateformes de phase `cyan/magenta` commutables au HUD. |
| **M3** | `CO₂` | `C (6) + O (8)` | *Sublimation Dry Ice* | Puits d'ascendance gazeuse (`gas`) et pistes cryo sans friction. |
| **M4** | `FeC` | `Fe (26) + C (6)` | *Damascus Steel Forge* | Murs rebondissants haute vitesse et fusion de clones Super-Quanta. |
| **M5** | `AuAg` | `Au (79) + Ag (47)` | *Electrum Relic* | Trous de ver d'impulsion (`wormholes`) et `Quantum Pinning` au doigt. |
| **M6** | `SiO₂` | `Si (14) + O (8)` | *Quartz Piezo Resonator* | Échafaudage d'ondes de Broglie cristallisées (`Wave-Trail Solidification`). |
| **M7** | `HgS` | `Hg (80) + S (16)` | *Cinnabar Alchemical Bath* | Bassins de mercure liquide à haute poussée d'Archimède et téléportation torique. |
| **M8** | `NH₃` | `N (7) + H (1)` | *Haber-Bosch Pressure Chamber* | Effet tunnel en chaîne sous mâchoires de compression `collapse`. |
| **M9** | `UF₆` | `U (92) + F (9)` | *Centrifuge Cascade* | Cylindre spatial `screenWrap` à haute vitesse et demi-vie radioactive. |
| **M10** | `HeNe` | `He (2) + Ne (10)` | *Laser Cavity Interferometer* | Niveau-jouet musical sans piques avec cordes d'intrication et rebonds plasma. |
| **M11** | `CuSn` | `Cu (29) + Sn (50)` | *Bronze Bell Resonance* | Synchronisation de clones et trampolines de répulsion de Pauli. |
| **M12** | `OgH` | `Og (118) + H (1)` | *Alpha & Omega Singularity* | Synthèse ultime combinant le premier et le dernier élément du tableau. |

---

## 3. Critères d'Acceptation

1. Cliquer/taper sur `[PHASE: CYAN]` dans le HUD ou appuyer sur `Q` bascule immédiatement la phase des plateformes du niveau.
2. Relier 3 bulles de fond fait apparaître une bulle d'antigravité fonctionnelle au premier plan.
3. Combiner `H (1)` et `O (8)` sur le Tableau Périodique (via Multi-Touch ou `Shift + Clic`) débloque la molécule `H₂O`, persiste la découverte dans `useGameStore.getState().unlockedMolecules`, et lance le niveau secret *The Water Anomaly*.
