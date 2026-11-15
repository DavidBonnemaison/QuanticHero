# Spec-12 : Architecture Kishōtenketsu sur 7 Périodes, Niveaux « Gaz Nobles » & Validation E2E

## 1. Contexte & Objectif

Avec la richesse des mécaniques de QuanticHero v3.0, la clé pour émerveiller le joueur sans jamais le submerger est **l'architecture de révélation progressive (méthode Nintendo *Kishōtenketsu*)** structurée autour des **7 Périodes du Tableau Périodique (Niveaux 1 à 118)**.

Chaque nouvelle possibilité est introduite isolément dans une **« Safe Discovery Box »** (salle initiale sans piques où la géométrie provoque la découverte en moins de 5 secondes), et chaque fin de période est célébrée par un **Niveau-Jouet « Gaz Noble » sans mort** (`Z = 2, 10, 18, 36, 54, 86, 118`).

---

## 2. Spécifications Détaillées

### 2.1 Plan de Révélation Progressive sur les 7 Périodes (`src/generator/campaignDirector.ts`)

Programmer le directeur de campagne (`campaignDirector.ts`) pour orchestrer l'apparition et la combinaison progressive des mécaniques :

| Période | Niveaux (`Z`) | Éléments Clés | Nouvelles Possibilités Introduites (avec *Safe Discovery Box*) | Niveau-Jouet Final (Gaz Noble Sans Mort) |
| :--- | :--- | :--- | :--- | :--- |
| **Période 1** | `1 – 2` | `H → He` | Ruban Tactile Flottant, Saut Asymétrique, Piqué (`Flick-Down`) et Rebonds Muraux. Zéro mécanique complexe : pur plaisir cinétique. | **Niv. 2 (`He` - Hélium)** : Autoroute d'ascendance gazeuse (`gas`) et rebonds fluides sans piques. |
| **Période 2** | `3 – 10` | `Li → Ne` | Superposition & Switch Orbital (`Niv. 4 Be`), **Fusion & Scission de Clones Super-Quanta** (`Niv. 6 C` - Carbone), Phases Cyan/Magenta & Secret HUD (`Niv. 8 O`). | **Niv. 10 (`Ne` - Néon)** : Flipper synthwave de murs néon, pistes `cryo` et nuages gazeux. |
| **Période 3** | `11 – 18` | `Na → Ar` | Effet Tunnel (`Niv. 11 Na`), **Échafaudage d'Onde de Broglie solidifiée** (`Niv. 14 Si` - Silicium), **Cylindre Spatial `Screen-Wrap`** (`Niv. 18 Ar`). | **Niv. 18 (`Ar` - Argon)** : Chute libre infinie en cylindre toroïdal horizontal/vertical sans danger. |
| **Période 4** | `19 – 36` | `K → Kr` | Intrication avec Dézoom Révélation (`Niv. 19 K`), **Corde d'Intrication Physique & Supernova** (`Niv. 26 Fe → 27 Co`), **Plateformes Liquides** (`Niv. 35 Br` - Brome). | **Niv. 36 (`Kr` - Krypton)** : Ballet aquatique et pendulaire à deux héros intriqués. |
| **Période 5** | `37 – 54` | `Rb → Xe` | Archétype « Plancher Vivant » Semelle-contre-Semelle (`Niv. 40 Zr`), **Observation au Doigt `Quantum Pinning`** (`Niv. 47 Ag` - Argent). | **Niv. 54 (`Xe` - Xénon)** : Symphonie de plateformes de phase figées au doigt et trampolines `plasma`. |
| **Période 6** | `55 – 86` | `Cs → Rn` | Dilatation Temporelle & **Trous de Ver d'Impulsion (`α ↔ ω`)** (`Niv. 55 Cs → 79 Au`), **Bains de Mercure Liquide** (`Niv. 80 Hg`). | **Niv. 86 (`Rn` - Radon)** : Parkour supersonique à travers une chaîne de trous de ver et bassins de mercure. |
| **Période 7** | `87 – 118` | `Fr → Og` | Demi-vie Radioactive, **Surf Temporel sur Fantôme (`Ghost Surfing`)** (`Niv. 87 Fr`), Archétypes Maîtres et Constellation Finale (`Niv. 118 Og`). | **Niv. 118 (`Og` - Oganesson)** : Apothéose cosmique entourée des fantômes de tous les éléments précédents. |

### 2.2 Les « Safe Discovery Boxes » (Sas d'Intuition Sans Texte)

Pour chaque niveau jalon introduisant une mécanique (`Niv. 4, 6, 8, 11, 14, 18, 19, 26, 35, 40, 47, 55, 80, 87`) :
1. La première section du niveau (`0 à 35 %` du parcours) ne comporte **aucun pic mortel (`spikes: []` dans la zone de départ)** ni gouffre létal.
2. Un pictogramme holographique minimaliste en 2 étapes est dessiné en fond de salle (`depth: 2`) pour suggérer visuellement l'interaction sans bloquer le jeu par une fenêtre modale.

### 2.3 Validation Automatisée Bout-en-Bout (Simulateur + Suite E2E)

1. Mettre à jour `src/generator/simulator.ts` et `scripts/verify-all-levels.ts` pour valider :
   - Les 118 niveaux de la campagne principale.
   - Les 12 Niveaux Secrets Moléculaires (`src/data/molecules.ts`).
2. Garantir que chaque niveau possède un `authorGhost` valide et synchronisé avec la physique unifiée de la Spec-02.

---

## 3. Critères d'Acceptation

1. Les 7 niveaux de Gaz Nobles (`2, 10, 18, 36, 54, 86, 118`) ont `spikes.length === 0` et constituent des niveaux-jouets d'émerveillement musical et cinétique.
2. Chaque niveau d'introduction de mécanique débute par une *Safe Discovery Box* sans danger mortel et respecte la règle d'isolation (une seule nouveauté à la fois).
3. `npm test`, `npx tsc --noEmit` et `npm run build` passent à 100 % sans erreur sur l'ensemble du dépôt.
