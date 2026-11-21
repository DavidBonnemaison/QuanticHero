import type { GhostMode } from '../types';

export type Locale = 'en' | 'fr';

export interface Strings {
  menu: {
    title: string;
    continueAtom: (z: number, symbol: string) => string;
    periodicTable: string;
    levelLab: string;
    newGame: string;
    installApp: string;
    soundOn: string;
    soundOff: string;
    muteSound: string;
    unmuteSound: string;
    hapticsOn: string;
    hapticsOff: string;
    disableHaptics: string;
    enableHaptics: string;
    fxHi: string;
    fxLo: string;
    enableReducedEffects: string;
    enableFullEffects: string;
    switchLanguageLabel: string;
    confirmResetTitle: string;
    confirmResetMessage: string;
    confirmResetAction: string;
    cancel: string;
    dailyIsotopeTitle: (symbol: string, atom: string) => string;
    dailyStreak: (days: number) => string;
    dailyCompleted: string;
    dailyBestTime: (formattedTime: string) => string;
    dailyNextIn: (countdown: string) => string;
    dailyDifficulty: (difficulty: 'medium' | 'hard') => string;
  };
  levelSelection: {
    backToMenu: string;
    title: string;
    goldIsotopes: string;
    chemicalBond: string;
    chemicalBondOn: string;
    chemicalBondHint: string;
    alchemyDragHint: string;
    alchemySelectPartner: (symbol: string) => string;
    noStableBond: string;
    codexButton: (unlocked: number, total: number) => string;
    classicTab: string;
    entanglementTab: string;
    ghostModeTitle: (mode: GhostMode) => string;
    ghostDisabled: string;
    ghostEnabled: (mode: GhostMode) => string;
    jumpSuffix: string;
  };
  codex: {
    title: string;
    subtitle: string;
    unlockedCounter: (unlocked: number, total: number) => string;
    close: string;
    undiscovered: string;
    hintLabel: string;
    bestTime: string;
    medal: string;
    noRecord: string;
    play: string;
  };
  periodicTable: {
    viewTable: string;
    viewPeriod: string;
    zoomIn: string;
    zoomOut: string;
    zoomReset: string;
    periodShort: (p: number) => string;
    periodFull: (p: number) => string;
    lanthanides: string;
    actinides: string;
    entanglementRift: string;
    filters: {
      all: string;
      incomplete: string;
      noGold: string;
      nobleGases: string;
      entanglementShort: string;
    };
    preview: {
      bestTime: string;
      bestJumps: string;
      medal: string;
      family: string;
      mechanics: string;
      position: (group: number, period: number, block: string) => string;
      locked: string;
      play: string;
      nobleGasBadge: string;
      entanglementBadge: string;
      noRecord: string;
    };
    families: {
      noble_gas: string;
      alkali_alkaline_earth: string;
      transition_metal: string;
      nonmetal_halogen: string;
      lanthanide_actinide: string;
      metalloid: string;
      post_transition: string;
    };
    mechanicsLabels: {
      noblePlayground: string;
      entanglement: string;
      precisionJump: string;
      tunneling: string;
      gravityPhase: string;
      waveSuperposition: string;
      pauliRepulsion: string;
      relativisticHorizon: string;
    };
  };
  levelFinished: {
    customLevelFallback: string;
    unknownFallback: string;
    speedrunChallenge: (atom: string, formattedTime?: string) => string;
    lastGame: string;
    allTimeBest: string;
    newRecord: string;
    jumpsCount: (count: number) => string;
    menu: string;
    retry: string;
    save: string;
    share: string;
    levels: string;
    next: string;
    savedToCustomToast: string;
    shareCard: string;
    cardSharedToast: string;
    cardDownloadedToast: string;
    cardDownloadedWithLinkToast: string;
    cardErrorToast: string;
  };
  explanation: {
    gotIt: string;
  };
  hud: {
    restart: string;
    soundOn: string;
    soundOff: string;
    hapticsOn: string;
    hapticsOff: string;
    fxHi: string;
    fxLo: string;
    phase: (phase: string) => string;
    timeDilation: string;
    condenseButton: string;
    elementSynthesized: (symbol: string, atomUpper: string) => string;
    newRecord: string;
    rec: string;
    jumps: (count: number) => string;
    nextLevel: (symbol: string, atom: string) => string;
    levelsButton: string;
    shareCardButton: string;
    toasts: {
      bellSync: string;
      entanglementRevealed: string;
      conservationRestored: string;
      superQuanta: string;
      fission: string;
      tunnelingLeft: (remaining: number) => string;
      frameTunnelingLeft: (remaining: number) => string;
      pauliBlast: string;
      broglieCrystal: string;
      powerUps: {
        antiGravity: string;
        lowGravity: string;
        speed: string;
        duplicate: string;
        tunnel: string;
        pauli: string;
        timeDilation: string;
        condense: string;
      };
    };
  };
  ghost: Record<GhostMode, string>;
  medals: {
    gold: { label: string; shortLabel: string };
    silver: { label: string; shortLabel: string };
    bronze: { label: string; shortLabel: string };
    none: { label: string; shortLabel: string };
  };
  duel: {
    rivalBadge: (name: string, formattedSec: string) => string;
    victoryBadge: (deltaStr: string) => string;
    defeatBadge: (deltaStr: string) => string;
    youBeat: (name: string, deltaStr: string) => string;
    rivalTime: (name: string, formattedSec: string) => string;
    challengeFriend: string;
    sendRevengeLink: string;
    rematch: string;
    modalTitleDuel: string;
    modalTitleRevenge: string;
    modalSubtitle: string;
    nicknameLabel: string;
    nicknamePlaceholder: string;
    shareNative: string;
    copyLink: string;
    linkCopied: string;
    ghostIncluded: string;
  };
}

export const STRINGS: Record<Locale, Strings> = {
  en: {
    menu: {
      title: 'Quantum Hero',
      continueAtom: (z, symbol) => `Continue — Atom #${z} (${symbol})`,
      periodicTable: 'Periodic Table',
      levelLab: 'Level Lab',
      newGame: 'New Game',
      installApp: 'Install App',
      soundOn: 'SND:ON',
      soundOff: 'SND:OFF',
      muteSound: 'Mute sound',
      unmuteSound: 'Unmute sound',
      hapticsOn: 'HAP:ON',
      hapticsOff: 'HAP:OFF',
      disableHaptics: 'Disable haptics',
      enableHaptics: 'Enable haptics',
      fxHi: 'FX:HI',
      fxLo: 'FX:LO',
      enableReducedEffects: 'Enable reduced visual effects',
      enableFullEffects: 'Enable full visual effects',
      switchLanguageLabel: 'Switch language to French',
      confirmResetTitle: 'New Game',
      confirmResetMessage: 'Reset all progress, medals and unlocked molecules?',
      confirmResetAction: 'Reset & Start',
      cancel: 'Cancel',
      dailyIsotopeTitle: (symbol, atom) => `DAILY ISOTOPE — ${symbol} ${atom}`,
      dailyStreak: (days) => `🔥 ${days} ${days === 1 ? 'day' : 'days'}`,
      dailyCompleted: 'Completed ✓',
      dailyBestTime: (formattedTime) => `Best ${formattedTime}`,
      dailyNextIn: (countdown) => `Next in ${countdown} UTC`,
      dailyDifficulty: (difficulty) => (difficulty === 'hard' ? 'HARD' : 'MEDIUM')
    },
    levelSelection: {
      backToMenu: '◄ MENU',
      title: 'Level Selection',
      goldIsotopes: 'Gold Isotopes:',
      chemicalBond: 'Chemical Bond',
      chemicalBondOn: '(ON)',
      chemicalBondHint: '(Drag / Tap)',
      alchemyDragHint: 'Drag an atom onto another or tap Alchemy',
      alchemySelectPartner: (symbol) => `Select partner for ${symbol}...`,
      noStableBond: 'No stable bond found',
      codexButton: (unlocked, total) => `Codex (${unlocked} / ${total})`,
      classicTab: '[ CLASSIC ATOMS ]',
      entanglementTab: '[ ENTANGLEMENT Ψ ⊗ Ψ ]',
      ghostModeTitle: (mode) => `Ghost replay mode: ${mode}`,
      ghostDisabled: 'Ghost disabled',
      ghostEnabled: (mode) => `Ghost enabled (${mode})`,
      jumpSuffix: 'J'
    },
    codex: {
      title: 'Molecular Codex',
      subtitle:
        'Combine two unlocked atoms on the Periodic Table via drag-and-drop or Alchemy mode.',
      unlockedCounter: (unlocked, total) => `Unlocked: ${unlocked} / ${total}`,
      close: 'Close',
      undiscovered: 'Undiscovered Molecule',
      hintLabel: 'Alchemical Hint',
      bestTime: 'Best Time',
      medal: 'Isotope',
      noRecord: '--:--:--',
      play: 'PLAY ►'
    },
    periodicTable: {
      viewTable: 'Table View',
      viewPeriod: 'Period View',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
      zoomReset: 'Reset zoom',
      periodShort: (p) => `P${p}`,
      periodFull: (p) => `Period ${p}`,
      lanthanides: '57–71 La–Lu',
      actinides: '89–103 Ac–Lr',
      entanglementRift: 'Ψ 110–114',
      filters: {
        all: 'All',
        incomplete: 'Incomplete',
        noGold: 'No Gold',
        nobleGases: 'Noble Gases',
        entanglementShort: 'Ψ 110–114'
      },
      preview: {
        bestTime: 'Best Time',
        bestJumps: 'Jumps',
        medal: 'Isotope',
        family: 'Family',
        mechanics: 'Mechanics',
        position: (group, period, block) => `Group ${group} · Period ${period} · ${block}-block`,
        locked: 'Locked',
        play: 'PLAY ►',
        nobleGasBadge: '✦ Noble Gas',
        entanglementBadge: 'Ψ Entangled',
        noRecord: '--:--:--'
      },
      families: {
        noble_gas: 'Noble Gas',
        alkali_alkaline_earth: 'Alkali / Alkaline Earth',
        transition_metal: 'Transition Metal',
        nonmetal_halogen: 'Nonmetal / Halogen',
        lanthanide_actinide: 'Lanthanide / Actinide',
        metalloid: 'Metalloid',
        post_transition: 'Post-Transition Metal'
      },
      mechanicsLabels: {
        noblePlayground: 'Noble Playground',
        entanglement: 'Quantum Entanglement',
        precisionJump: 'Quantum Jump',
        tunneling: 'Tunneling Barrier',
        gravityPhase: 'Gravity & Phase',
        waveSuperposition: 'Wave Superposition',
        pauliRepulsion: 'Pauli Repulsion',
        relativisticHorizon: 'Relativistic Horizon'
      }
    },
    levelFinished: {
      customLevelFallback: 'Custom Level',
      unknownFallback: 'Unknown',
      speedrunChallenge: (atom, formattedTime) =>
        formattedTime
          ? `★ SPEEDRUN CHALLENGE: ${atom} (${formattedTime}) ★`
          : `★ SPEEDRUN CHALLENGE: ${atom} ★`,
      lastGame: 'Last game',
      allTimeBest: 'All Time Best',
      newRecord: 'New record !',
      jumpsCount: (count) => `${count} ${count === 1 ? 'jump' : 'jumps'}`,
      menu: 'Menu',
      retry: 'Retry',
      save: 'Save',
      share: 'Share',
      levels: 'Levels',
      next: 'Next',
      savedToCustomToast: 'Level saved to your custom levels!',
      shareCard: 'Share Card',
      cardSharedToast: 'Replay card shared!',
      cardDownloadedToast: 'Replay card PNG downloaded!',
      cardDownloadedWithLinkToast: 'Replay card PNG downloaded & link copied!',
      cardErrorToast: 'Could not generate replay card.'
    },
    explanation: {
      gotIt: 'Got it'
    },
    hud: {
      restart: '[RST]',
      soundOn: 'SND:ON',
      soundOff: 'SND:OFF',
      hapticsOn: 'HAP:ON',
      hapticsOff: 'HAP:OFF',
      fxHi: 'FX:HI',
      fxLo: 'FX:LO',
      phase: (phase) => `[PHASE: ${phase.toUpperCase()}]`,
      timeDilation: '[TIME: 0.25x]',
      condenseButton: '[CONDENSE]',
      elementSynthesized: (symbol, atomUpper) => `ELEMENT SYNTHESIZED — ${symbol} ${atomUpper}`,
      newRecord: 'NEW RECORD',
      rec: 'REC',
      jumps: (count) => `JUMPS: ${count}`,
      nextLevel: (symbol, atom) => `[SPACE / TAP] NEXT: ${symbol} ${atom}`,
      levelsButton: '[LEVELS]',
      shareCardButton: 'SHARE CARD',
      toasts: {
        bellSync: 'BELL SYNC ! (GOLD ISOTOPE)',
        entanglementRevealed: 'ENTANGLEMENT REVEALED !',
        conservationRestored: 'CONSERVATION ! CAGE RESTORED',
        superQuanta: 'SUPER-QUANTA !',
        fission: 'FISSION !',
        tunnelingLeft: (remaining) => `TUNNELING ! (${remaining} LEFT)`,
        frameTunnelingLeft: (remaining) => `FRAME TUNNELING ! (${remaining} LEFT)`,
        pauliBlast: 'PAULI BLAST !',
        broglieCrystal: 'BROGLIE CRYSTAL !',
        powerUps: {
          antiGravity: 'ANTI GRAVITY !',
          lowGravity: 'LOW GRAVITY !',
          speed: 'HIGH SPEED !',
          duplicate: 'CLONING !',
          tunnel: 'TUNNELING CHARGE !',
          pauli: 'PAULI BLAST !',
          timeDilation: 'TIME DILATION !',
          condense: 'BROGLIE CONDENSE ! ([CONDENSE] / [C] / SPACE)'
        }
      }
    },
    ghost: {
      off: '[GHOST: OFF]',
      optimal: '[GHOST: OPTIMAL]',
      best: '[GHOST: BEST]',
      swarm: '[GHOST: SWARM]'
    },
    medals: {
      gold: { label: 'Quantum Isotope (Gold)', shortLabel: 'GOLD' },
      silver: { label: 'Pure Isotope (Silver)', shortLabel: 'SILVER' },
      bronze: { label: 'Stable Isotope (Bronze)', shortLabel: 'BRONZE' },
      none: { label: 'Not synthesized', shortLabel: '--' }
    },
    duel: {
      rivalBadge: (name, formattedSec) => `VS ${name} — ${formattedSec}`,
      victoryBadge: (deltaStr) => `VICTORY ${deltaStr}`,
      defeatBadge: (deltaStr) => `DEFEAT ${deltaStr}`,
      youBeat: (name, deltaStr) => `YOU BEAT ${name} BY ${deltaStr}!`,
      rivalTime: (name, formattedSec) => `RIVAL ${name}: ${formattedSec}`,
      challengeFriend: 'Challenge a Friend',
      sendRevengeLink: 'SEND REVENGE LINK',
      rematch: 'Rematch',
      modalTitleDuel: '=== GHOST TENNIS DUEL ===',
      modalTitleRevenge: '=== SEND REVENGE LINK ===',
      modalSubtitle: 'SEND THIS #DUEL LINK TO CHALLENGE A FRIEND',
      nicknameLabel: 'YOUR TAG',
      nicknamePlaceholder: 'ALPHA',
      shareNative: 'SHARE',
      copyLink: 'COPY LINK',
      linkCopied: '★ DUEL LINK COPIED TO CLIPBOARD! ★',
      ghostIncluded: '★ YOUR GHOST TRAJECTORY IS ENCODED IN THIS LINK ★'
    }
  },
  fr: {
    menu: {
      title: 'Quantum Hero',
      continueAtom: (z, symbol) => `Continuer — Atome #${z} (${symbol})`,
      periodicTable: 'Tableau Périodique',
      levelLab: 'Labo de Niveaux',
      newGame: 'Nouvelle Partie',
      installApp: "Installer l'app",
      soundOn: 'SON:ON',
      soundOff: 'SON:OFF',
      muteSound: 'Couper le son',
      unmuteSound: 'Activer le son',
      hapticsOn: 'VIB:ON',
      hapticsOff: 'VIB:OFF',
      disableHaptics: 'Désactiver les vibrations',
      enableHaptics: 'Activer les vibrations',
      fxHi: 'FX:MAX',
      fxLo: 'FX:BAS',
      enableReducedEffects: 'Activer les effets visuels réduits',
      enableFullEffects: 'Activer tous les effets visuels',
      switchLanguageLabel: 'Passer la langue en anglais',
      confirmResetTitle: 'Nouvelle Partie',
      confirmResetMessage:
        'Réinitialiser toute la progression, les médailles et les molécules débloquées ?',
      confirmResetAction: 'Réinitialiser',
      cancel: 'Annuler',
      dailyIsotopeTitle: (symbol, atom) => `DAILY ISOTOPE — ${symbol} ${atom}`,
      dailyStreak: (days) => `🔥 ${days} ${days === 1 ? 'jour' : 'jours'}`,
      dailyCompleted: 'Complété ✓',
      dailyBestTime: (formattedTime) => `Record ${formattedTime}`,
      dailyNextIn: (countdown) => `Prochain dans ${countdown} UTC`,
      dailyDifficulty: (difficulty) => (difficulty === 'hard' ? 'DIFFICILE' : 'MOYEN')
    },
    levelSelection: {
      backToMenu: '◄ MENU',
      title: 'Sélection des Niveaux',
      goldIsotopes: "Isotopes d'Or :",
      chemicalBond: 'Liaison Chimique',
      chemicalBondOn: '(ON)',
      chemicalBondHint: '(Glisser / Tap)',
      alchemyDragHint: 'Glissez un atome sur un autre ou activez Alchimie',
      alchemySelectPartner: (symbol) => `Choisissez un partenaire pour ${symbol}...`,
      noStableBond: 'Aucune liaison stable trouvée',
      codexButton: (unlocked, total) => `Codex (${unlocked} / ${total})`,
      classicTab: '[ ATOMES CLASSIQUES ]',
      entanglementTab: '[ INTRICATION Ψ ⊗ Ψ ]',
      ghostModeTitle: (mode) => `Mode fantôme : ${mode}`,
      ghostDisabled: 'Fantôme désactivé',
      ghostEnabled: (mode) => `Fantôme activé (${mode})`,
      jumpSuffix: 'S'
    },
    codex: {
      title: 'Codex Moléculaire',
      subtitle:
        'Combinez deux atomes débloqués sur le Tableau Périodique par glisser-déposer ou en mode Alchimie.',
      unlockedCounter: (unlocked, total) => `Débloquées : ${unlocked} / ${total}`,
      close: 'Fermer',
      undiscovered: 'Molécule non découverte',
      hintLabel: 'Indice alchimique',
      bestTime: 'Meilleur temps',
      medal: 'Isotope',
      noRecord: '--:--:--',
      play: 'JOUER ►'
    },
    periodicTable: {
      viewTable: 'Vue Tableau',
      viewPeriod: 'Vue Période',
      zoomIn: 'Zoomer',
      zoomOut: 'Dézoomer',
      zoomReset: 'Réinitialiser le zoom',
      periodShort: (p) => `P${p}`,
      periodFull: (p) => `Période ${p}`,
      lanthanides: '57–71 La–Lu',
      actinides: '89–103 Ac–Lr',
      entanglementRift: 'Ψ 110–114',
      filters: {
        all: 'Tous',
        incomplete: 'Non complétés',
        noGold: 'Sans Or',
        nobleGases: 'Gaz Nobles',
        entanglementShort: 'Ψ 110–114'
      },
      preview: {
        bestTime: 'Meilleur temps',
        bestJumps: 'Sauts',
        medal: 'Isotope',
        family: 'Famille',
        mechanics: 'Mécaniques',
        position: (group, period, block) => `Groupe ${group} · Période ${period} · bloc ${block}`,
        locked: 'Verrouillé',
        play: 'JOUER ►',
        nobleGasBadge: '✦ Gaz Noble',
        entanglementBadge: 'Ψ Intriqué',
        noRecord: '--:--:--'
      },
      families: {
        noble_gas: 'Gaz Noble',
        alkali_alkaline_earth: 'Alcalin / Alcalino-terreux',
        transition_metal: 'Métal de transition',
        nonmetal_halogen: 'Non-métal / Halogène',
        lanthanide_actinide: 'Lanthanide / Actinide',
        metalloid: 'Métalloïde',
        post_transition: 'Métal pauvre'
      },
      mechanicsLabels: {
        noblePlayground: 'Sanctuaire Gaz Noble',
        entanglement: 'Intrication Quantique',
        precisionJump: 'Saut Quantique',
        tunneling: 'Effet Tunnel',
        gravityPhase: 'Gravité & Phase',
        waveSuperposition: 'Superposition Ondulatoire',
        pauliRepulsion: 'Répulsion de Pauli',
        relativisticHorizon: 'Horizon Relativiste'
      }
    },
    levelFinished: {
      customLevelFallback: 'Niveau Personnalisé',
      unknownFallback: 'Inconnu',
      speedrunChallenge: (atom, formattedTime) =>
        formattedTime
          ? `★ DÉFI SPEEDRUN : ${atom} (${formattedTime}) ★`
          : `★ DÉFI SPEEDRUN : ${atom} ★`,
      lastGame: 'Dernière partie',
      allTimeBest: 'Meilleur temps',
      newRecord: 'Nouveau record !',
      jumpsCount: (count) => `${count} ${count === 1 ? 'saut' : 'sauts'}`,
      menu: 'Menu',
      retry: 'Rejouer',
      save: 'Sauvegarder',
      share: 'Partager',
      levels: 'Niveaux',
      next: 'Suivant',
      savedToCustomToast: 'Niveau sauvegardé dans vos niveaux personnalisés !',
      shareCard: 'Partager la Carte',
      cardSharedToast: 'Carte replay partagée !',
      cardDownloadedToast: 'Carte replay PNG téléchargée !',
      cardDownloadedWithLinkToast: 'Carte replay PNG téléchargée et lien copié !',
      cardErrorToast: 'Impossible de générer la carte replay.'
    },
    explanation: {
      gotIt: 'Compris'
    },
    hud: {
      restart: '[RST]',
      soundOn: 'SON:ON',
      soundOff: 'SON:OFF',
      hapticsOn: 'VIB:ON',
      hapticsOff: 'VIB:OFF',
      fxHi: 'FX:MAX',
      fxLo: 'FX:BAS',
      phase: (phase) => `[PHASE : ${phase.toUpperCase()}]`,
      timeDilation: '[TEMPS : 0.25x]',
      condenseButton: '[CONDENSE]',
      elementSynthesized: (symbol, atomUpper) => `ÉLÉMENT SYNTHÉTISÉ — ${symbol} ${atomUpper}`,
      newRecord: 'NOUVEAU RECORD',
      rec: 'REC',
      jumps: (count) => `SAUTS : ${count}`,
      nextLevel: (symbol, atom) => `[ESPACE / TAP] SUIVANT : ${symbol} ${atom}`,
      levelsButton: '[NIVEAUX]',
      shareCardButton: 'CARTE PNG',
      toasts: {
        bellSync: "SYNCHRO BELL ! (ISOTOPE D'OR)",
        entanglementRevealed: 'INTRICATION RÉVÉLÉE !',
        conservationRestored: 'CONSERVATION ! CAGE RESTAURÉE',
        superQuanta: 'SUPER-QUANTA !',
        fission: 'FISSION !',
        tunnelingLeft: (remaining) => `EFFET TUNNEL ! (${remaining} REST.)`,
        frameTunnelingLeft: (remaining) => `TUNNEL BORDURE ! (${remaining} REST.)`,
        pauliBlast: 'ONDE DE PAULI !',
        broglieCrystal: 'CRISTAL DE BROGLIE !',
        powerUps: {
          antiGravity: 'ANTI-GRAVITÉ !',
          lowGravity: 'GRAVITÉ RÉDUITE !',
          speed: 'HAUTE VITESSE !',
          duplicate: 'CLONAGE !',
          tunnel: 'CHARGE TUNNEL !',
          pauli: 'ONDE DE PAULI !',
          timeDilation: 'DILATATION TEMPORELLE !',
          condense: 'CONDENSATION BROGLIE ! ([CONDENSE] / [C] / ESPACE)'
        }
      }
    },
    ghost: {
      off: '[FANTÔME : OFF]',
      optimal: '[FANTÔME : OPTIMAL]',
      best: '[FANTÔME : RECORD]',
      swarm: '[FANTÔME : ESSAIM]'
    },
    medals: {
      gold: { label: 'Isotope Quantique (Or)', shortLabel: 'OR' },
      silver: { label: 'Isotope Pur (Argent)', shortLabel: 'ARGENT' },
      bronze: { label: 'Isotope Stable (Bronze)', shortLabel: 'BRONZE' },
      none: { label: 'Non synthétisé', shortLabel: '--' }
    },
    duel: {
      rivalBadge: (name, formattedSec) => `VS ${name} — ${formattedSec}`,
      victoryBadge: (deltaStr) => `VICTOIRE ${deltaStr}`,
      defeatBadge: (deltaStr) => `DÉFAITE ${deltaStr}`,
      youBeat: (name, deltaStr) => `TU AS BATTU ${name} DE ${deltaStr} !`,
      rivalTime: (name, formattedSec) => `RIVAL ${name} : ${formattedSec}`,
      challengeFriend: 'Défier un ami',
      sendRevengeLink: 'ENVOYER LIEN REVANCHE',
      rematch: 'Revanche',
      modalTitleDuel: '=== DUEL GHOST TENNIS ===',
      modalTitleRevenge: '=== LIEN DE REVANCHE ===',
      modalSubtitle: 'ENVOIE CE LIEN #DUEL POUR DÉFIER UN AMI',
      nicknameLabel: 'TON PSEUDO',
      nicknamePlaceholder: 'ALPHA',
      shareNative: 'PARTAGER',
      copyLink: 'COPIER LE LIEN',
      linkCopied: '★ LIEN DE DUEL COPIÉ ! ★',
      ghostIncluded: '★ TA TRAJECTOIRE FANTÔME EST INCLUSE DANS CE LIEN ★'
    }
  }
};

export function getStrings(locale: Locale = 'en'): Strings {
  return STRINGS[locale] ?? STRINGS.en;
}
