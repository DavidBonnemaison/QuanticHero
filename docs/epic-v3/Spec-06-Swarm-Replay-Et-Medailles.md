# Spec-06 : « Swarm Replay » (Essaim de Tentatives) & Médailles d'Économie d'Action

## 1. Contexte & Problématique

Aujourd'hui, le système de fantôme (`src/services/GhostManager.ts` et `src/scenes/GhostHero.ts`) n'enregistre que le meilleur temps final et ne valorise qu'une seule dimension de maîtrise : la vitesse brute.
Or, dans un jeu de plateforme quantique :
1. Voir l'ensemble de ses tentatives ratées s'élancer simultanément avec son essai victorieux (façon *Super Meat Boy* / *Celeste*) transforme la frustration de l'échec en une récompense visuelle jubilatoire.
2. Optimiser un niveau en utilisant **le moins de sauts et d'inversions possible** (« Par Quantique ») offre une seconde couche de profondeur stratégique accessible même aux joueurs qui ne visent pas le speedrun pur.

---

## 2. Spécifications Détaillées

### 2.1 Le « Swarm Replay » (Essaim d'États Quantiques Superposés)

1. **Buffer d'Essais de Session dans `GhostManager.ts`** :
   - Ajouter une classe `SessionSwarmBuffer` qui conserve en mémoire (plafonné aux `25 dernières tentatives` du niveau en cours) les trajectoires `GhostFrame[]` de chaque tentative échouée avant `quickRespawn()`.
2. **Célébration Visuelle au Franchissement du Portail** :
   - Dès que le joueur touche le portail de victoire (ou en activant le mode `[GHOST: SWARM]` dans le HUD), instancier jusqu'à 25 `GhostHero` translucides (`alpha: 0.22`, teintés selon le spectre de l'atome) qui rejouent en accéléré (`2×`) ou en temps réel la nuée de toutes les tentatives de la session : on voit les silhouettes s'éparpiller sur les obstacles tandis que le héros gagnant triomphe jusqu'au portail.

### 2.2 Système de « Par » Quantique & Médailles d'Isotope (Économie d'Action)

1. **Compteurs d'Actions dans `GameScene.ts`** :
   - Compter au cours de chaque run :
     - `jumpCount` : nombre de sauts effectués.
     - `switchCount` : nombre de changements de focus / inversions directionnelles.
2. **Calcul des Médailles d'Isotope par Niveau (`src/services/MedalService.ts`)** :
   - Définir 3 paliers d'excellence par niveau (calculés à partir de `authorTime` et de la trajectoire `authorGhost`, ou via les champs optionnels `parTimeMs` et `parJumps` de `LevelData`) :
     - **Isotope Stable (Bronze)** : Niveau complété.
     - **Isotope Pur (Argent)** : Temps `≤ 1,25 × authorTime` OU `jumpCount ≤ parJumps + 1`.
     - **Isotope Quantique (Or)** : Temps `≤ authorTime` ET `jumpCount ≤ parJumps`.
3. **Affichage dans le Tableau Périodique (`Home.tsx` & `LevelSelection.tsx`)** :
   - Afficher sur chaque tuile d'élément du Tableau Périodique une bordure ou étoile d'isotope correspondant au grade atteint, ainsi que le compteur total d'Isotopes d'Or collectés sur 118.

---

## 3. Critères d'Acceptation

1. Après 3 morts suivies d'une victoire sur un même niveau, le `SessionSwarmBuffer` contient bien les 3 trajectoires d'échec + la trajectoire gagnante et permet leur rejeu simultané.
2. Le nombre de sauts (`jumpCount`) est incrémenté à chaque `hero:jump`, remis à zéro au `quickRespawn()`, et persisté dans `scores[levelId]` si le joueur bat son record d'économie.
3. Les tests unitaires de `MedalService.test.ts` et `GhostManager.test.ts` valident le calcul des médailles et le plafonnement du buffer à 25 trajectoires.
