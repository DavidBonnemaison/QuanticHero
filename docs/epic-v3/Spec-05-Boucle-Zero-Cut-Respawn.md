# Spec-05 : Boucle « Zero-Cut », Respawn en `< 150 ms` & Transition Continue

## 1. Contexte & Problématique

Deux ruptures majeures cassent actuellement l'état de *flow* et l'addiction dans `src/scenes/GameScene.ts` :

1. **Mort punitive et lente (`this.scene.restart()`)** :
   À chaque mort (`killHero` ou chute hors-écran), `this.scene.restart()` détruit et reconstruit toute la scène Phaser, coupe la musique (`soundManager.stopBgm()`), et réaffiche pendant `2,2 secondes` le bandeau géant `48 px` de `showLevelTitle()` en plein milieu de l'écran.
2. **Destruction du moteur WebGL à chaque victoire (`this.game.destroy(true)`)** :
   Lorsqu'un joueur termine un niveau de `8 secondes`, `completeLevel()` (`GameScene.ts:1365`) appelle `this.game.destroy(true)` au beau milieu du step physique d'Arcade, coupe la musique, et renvoie vers deux écrans React successifs (`/done` puis `/explanation`) exigeant 2 clics avant de recréer un contexte WebGL complet.

---

## 2. Spécifications Détaillées

### 2.1 Respawn In-Place en `< 150 ms` (Sans `scene.restart()` ni Coupure Audio)

Créer une méthode `quickRespawn()` dans `src/scenes/GameScene.ts` qui remplace `this.scene.restart()` lors d'une mort :

1. **Empreinte Spectrale de Mort (*Death Echo*)** :
   - Déposer à la coordonnée `(hero.x, hero.y)` du décès une silhouette spectrale statique (`alpha: 0.16`, teinte de l'élément) qui persiste pendant toute la session sur ce niveau, permettant au joueur de visualiser ses erreurs passées.
2. **Réinitialisation Éclair de l'État du Niveau (`120 ms`)** :
   - Sans détruire la scène ni couper `soundManager.bgm`, animer un flash d'implosion quantique de `120 ms` qui ramène la caméra et le héros principal à `(startX, startY)` (et `betaHero` à son spawn si intriqué).
   - Réinitialiser proprement :
     - Les clones secondaires créés en cours de run.
     - Les particules ramassées (`particle.enableBody(true, px, py, true, true)`).
     - Les plateformes éphémères, à demi-vie (`decayPlatforms`), mobiles (`movingPlatforms`) et de phase (`currentPhase = 'cyan'`).
     - Les plaques de pression (`pressurePlatesList`), portes (`gatesMap`) et mâchoires `collapse`.
     - Le chronomètre (`timerStarted = false`, `dilatedElapsedMs = 0`, `ghostRecorder.reset()`).
3. **Affichage Unique de `showLevelTitle()`** :
   - Ne jouer `showLevelTitle()` **qu'à la toute première entrée sur un niveau** (`this.lastShownLevelId !== this.levelData.id`), jamais lors d'un respawn ou d'un `[RST]`.

### 2.2 Transition Inter-Niveaux Continue dans le Canvas (Zéro `game.destroy`)

1. **Conservation de l'Instance `Phaser.Game`** :
   - Dans `completeLevel()`, supprimer `this.game.destroy(true)`.
   - À l'entrée dans le portail, aspirer le héros vers le centre du vortex en `280 ms` (`scale: 1 → 0`, rotation `360°`) pendant qu'un bandeau HUD élégant (« **ELEMENT SYNTHESIZED — [SYMBOLE] [NOM]** • Temps • Record • Delta ») s'affiche en surimpression dans Phaser.
2. **Cartouche Narratif & Passage Direct au Niveau `N+1`** :
   - Proposer dans l'overlay de fin de niveau :
     - Un passage automatique (ou par simple Tap / touche `Espace` en `< 0,5 s`) qui charge directement `levelData` du niveau `N+1` dans `GameScene` via une transition fluide de caméra (`600 ms`), **sans jamais démonter le canvas WebGL ni couper la BGM**.
     - Un bouton `[SPECTROSCOPIE / CODEX]` permettant d'ouvrir à la demande la fiche scientifique détaillée (`/explanation`) ou lors des jalons de fin de Période (Gaz Nobles).

---

## 3. Critères d'Acceptation

1. Mourir sur des piques ou tomber dans le vide relance le joueur au point de départ en moins de `150 ms`, sans couper la musique WebAudio et sans réafficher `showLevelTitle()`.
2. Toutes les particules, plateformes à demi-vie, portes et chronomètres sont parfaitement restaurés à leur état initial après un `quickRespawn()`.
3. Enchaîner le Niveau 1 vers le Niveau 2 conserve la même instance `window.game` (`Phaser.Game`) sans appel à `this.game.destroy(true)`.
