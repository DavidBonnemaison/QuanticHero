export const ENTANGLEMENT_LEVEL_MIN = 110;
export const ENTANGLEMENT_LEVEL_MAX = 114;
export const MAX_CLASSIC_LEVEL = 118;

/**
 * Returns true if the level ID belongs to the bonus Entanglement block (110–114).
 * Levels 115–118 (Moscovium through Oganesson) belong to the Classic periodic table track.
 */
export function isEntanglementLevelId(level: number): boolean {
  return level >= ENTANGLEMENT_LEVEL_MIN && level <= ENTANGLEMENT_LEVEL_MAX;
}

/**
 * Computes the next playable level ID within the same progression track, or null at the end:
 * - Classic 1..108 -> level + 1
 * - Classic 109 -> 115 (skips the 110–114 Entanglement bonus block)
 * - Classic 115..117 -> level + 1
 * - Classic 118 -> null
 * - Entanglement 110..113 -> level + 1
 * - Entanglement 114 -> null
 */
export function getNextLevelId(level: number): number | null {
  if (level === ENTANGLEMENT_LEVEL_MIN - 1) {
    return ENTANGLEMENT_LEVEL_MAX + 1;
  }
  if (isEntanglementLevelId(level)) {
    return level < ENTANGLEMENT_LEVEL_MAX ? level + 1 : null;
  }
  if (level >= MAX_CLASSIC_LEVEL) {
    return null;
  }
  return level + 1;
}
