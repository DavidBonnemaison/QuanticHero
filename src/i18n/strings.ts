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
  };
  levelSelection: {
    backToMenu: string;
    title: string;
    goldIsotopes: string;
    chemicalBond: string;
    chemicalBondOn: string;
    chemicalBondHint: string;
    classicTab: string;
    entanglementTab: string;
    ghostModeTitle: (mode: GhostMode) => string;
    ghostDisabled: string;
    ghostEnabled: (mode: GhostMode) => string;
    jumpSuffix: string;
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
    elementSynthesized: (symbol: string, atomUpper: string) => string;
    newRecord: string;
    rec: string;
    jumps: (count: number) => string;
    nextLevel: (symbol: string, atom: string) => string;
    levelsButton: string;
    codexButton: string;
  };
  ghost: Record<GhostMode, string>;
  medals: {
    gold: { label: string; shortLabel: string };
    silver: { label: string; shortLabel: string };
    bronze: { label: string; shortLabel: string };
    none: { label: string; shortLabel: string };
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
      cancel: 'Cancel'
    },
    levelSelection: {
      backToMenu: '◄ MENU',
      title: 'Level Selection',
      goldIsotopes: 'Gold Isotopes:',
      chemicalBond: 'Chemical Bond',
      chemicalBondOn: '(ON)',
      chemicalBondHint: '(Shift+Click)',
      classicTab: '[ CLASSIC ATOMS ]',
      entanglementTab: '[ ENTANGLEMENT Ψ ⊗ Ψ ]',
      ghostModeTitle: (mode) => `Ghost replay mode: ${mode}`,
      ghostDisabled: 'Ghost disabled',
      ghostEnabled: (mode) => `Ghost enabled (${mode})`,
      jumpSuffix: 'J'
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
      savedToCustomToast: 'Level saved to your custom levels!'
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
      elementSynthesized: (symbol, atomUpper) => `ELEMENT SYNTHESIZED — ${symbol} ${atomUpper}`,
      newRecord: 'NEW RECORD',
      rec: 'REC',
      jumps: (count) => `JUMPS: ${count}`,
      nextLevel: (symbol, atom) => `[SPACE / TAP] NEXT: ${symbol} ${atom}`,
      levelsButton: '[LEVELS]',
      codexButton: '[SPECTROSCOPY / CODEX]'
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
      cancel: 'Annuler'
    },
    levelSelection: {
      backToMenu: '◄ MENU',
      title: 'Sélection des Niveaux',
      goldIsotopes: "Isotopes d'Or :",
      chemicalBond: 'Liaison Chimique',
      chemicalBondOn: '(ON)',
      chemicalBondHint: '(Shift+Clic)',
      classicTab: '[ ATOMES CLASSIQUES ]',
      entanglementTab: '[ INTRICATION Ψ ⊗ Ψ ]',
      ghostModeTitle: (mode) => `Mode fantôme : ${mode}`,
      ghostDisabled: 'Fantôme désactivé',
      ghostEnabled: (mode) => `Fantôme activé (${mode})`,
      jumpSuffix: 'S'
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
      savedToCustomToast: 'Niveau sauvegardé dans vos niveaux personnalisés !'
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
      elementSynthesized: (symbol, atomUpper) => `ÉLÉMENT SYNTHÉTISÉ — ${symbol} ${atomUpper}`,
      newRecord: 'NOUVEAU RECORD',
      rec: 'REC',
      jumps: (count) => `SAUTS : ${count}`,
      nextLevel: (symbol, atom) => `[ESPACE / TAP] SUIVANT : ${symbol} ${atom}`,
      levelsButton: '[NIVEAUX]',
      codexButton: '[SPECTROSCOPIE / CODEX]'
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
    }
  }
};

export function getStrings(locale: Locale = 'en'): Strings {
  return STRINGS[locale] ?? STRINGS.en;
}
