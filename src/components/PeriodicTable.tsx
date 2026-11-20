import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type ChemicalFamily,
  type PeriodicPosition,
  getChemicalFamily,
  getPeriodicPosition
} from '../data/spectroscopy';
import { type Locale, getStrings } from '../i18n/strings';
import { getMedalDisplayInfo } from '../services/MedalService';
import type { IsotopeMedal } from '../types';
import styles from './PeriodicTable.module.css';

export type PeriodicFilter = 'all' | 'incomplete' | 'no_gold' | 'noble_gases';
export type MobileViewMode = 'table' | 'period';

export interface PeriodicTableElementItem {
  id: number;
  symbol: string;
  atom: string;
  hue: string;
  antiHue: string;
  score: string;
  bestMs?: number;
  bestJumps?: number;
  medal: IsotopeMedal;
  disabled: boolean;
  isNobleGas: boolean;
  isEntanglement: boolean;
  noblePlayground?: boolean;
  parJumps?: number;
  authorTime?: number;
}

export interface PeriodicTableProps {
  elements: PeriodicTableElementItem[];
  locale: Locale;
  activeTab: 'classic' | 'entanglement';
  isEntanglementUnlocked: boolean;
  onOpenEntanglement?: () => void;
  alchemyMode?: boolean;
  selectedAtomZ?: number | null;
  rejectedAtomZs?: number[];
  onAtomClick: (id: number, e: React.MouseEvent) => void;
  onAtomSelect: (id: number) => void;
  onAtomCombine?: (z1: number, z2: number) => void;
  onAtomTouchStart?: (id: number, e: React.TouchEvent) => void;
  onAtomTouchEnd?: (e: React.TouchEvent) => void;
  elementRefCallback?: (z: number, el: HTMLDivElement | null) => void;
}

interface CovalentArcState {
  sourceZ: number;
  targetZ: number | null;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CovalentDragSession {
  sourceZ: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  active: boolean;
  hoveredZ: number | null;
}

interface PositionedElement {
  item: PeriodicTableElementItem;
  pos: PeriodicPosition;
  family: ChemicalFamily;
}

const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;
const MIN_ZOOM = 0.65;
const MAX_ZOOM = 1.6;
const ZOOM_STEP = 0.15;
const DRAG_THRESHOLD_PX = 8;

function getElementMechanics(
  item: PeriodicTableElementItem,
  pos: PeriodicPosition,
  family: ChemicalFamily,
  labels: ReturnType<typeof getStrings>['periodicTable']['mechanicsLabels']
): string[] {
  const result: string[] = [];
  if (item.isEntanglement) {
    result.push(labels.entanglement);
  }
  if (item.noblePlayground || item.isNobleGas) {
    result.push(labels.noblePlayground);
  }
  if (pos.period === 1) {
    result.push(labels.precisionJump);
  } else if (pos.period === 2) {
    result.push(labels.precisionJump, labels.tunneling);
  } else if (pos.period === 3) {
    result.push(labels.tunneling, labels.gravityPhase);
  } else if (pos.period === 4 || pos.period === 5) {
    result.push(labels.gravityPhase, labels.waveSuperposition);
  } else if (pos.period === 6) {
    result.push(labels.waveSuperposition, labels.pauliRepulsion);
  } else {
    result.push(labels.pauliRepulsion, labels.relativisticHorizon);
  }
  if (family === 'lanthanide_actinide' && !result.includes(labels.waveSuperposition)) {
    result.push(labels.waveSuperposition);
  }
  return result;
}

function matchesFilter(item: PeriodicTableElementItem, filter: PeriodicFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'incomplete') return !item.bestMs || item.bestMs <= 0;
  if (filter === 'no_gold') return item.medal !== 'gold';
  if (filter === 'noble_gases') return item.isNobleGas;
  return true;
}

export const PeriodicTable: React.FC<PeriodicTableProps> = ({
  elements,
  locale,
  activeTab,
  isEntanglementUnlocked,
  onOpenEntanglement,
  alchemyMode = false,
  selectedAtomZ = null,
  rejectedAtomZs = [],
  onAtomClick,
  onAtomSelect,
  onAtomCombine,
  onAtomTouchStart,
  onAtomTouchEnd,
  elementRefCallback
}) => {
  const t = getStrings(locale);
  const pt = t.periodicTable;

  const [filter, setFilter] = useState<PeriodicFilter>('all');
  const [viewMode, setViewMode] = useState<MobileViewMode>('table');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [highlightedPeriod, setHighlightedPeriod] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [previewZ, setPreviewZ] = useState<number | null>(elements[0]?.id ?? null);
  const [covalentArc, setCovalentArc] = useState<CovalentArcState | null>(null);

  const tileRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragPanRef = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const covalentDragRef = useRef<CovalentDragSession | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);
  const onAtomCombineRef = useRef(onAtomCombine);
  onAtomCombineRef.current = onAtomCombine;

  const unlockedZSet = useMemo(() => {
    const set = new Set<number>();
    for (const el of elements) {
      if (!el.disabled) set.add(el.id);
    }
    return set;
  }, [elements]);
  const unlockedZSetRef = useRef(unlockedZSet);
  unlockedZSetRef.current = unlockedZSet;

  const rejectedSet = useMemo(() => new Set<number>(rejectedAtomZs), [rejectedAtomZs]);

  const positionedElements = useMemo<PositionedElement[]>(
    () =>
      elements.map((item) => ({
        item,
        pos: getPeriodicPosition(item.id),
        family: getChemicalFamily(item.id)
      })),
    [elements]
  );

  // Keep previewZ valid when switching tabs (e.g. classic <-> entanglement)
  useEffect(() => {
    if (elements.length === 0) {
      setPreviewZ(null);
      return;
    }
    const stillPresent = elements.some((el) => el.id === previewZ);
    if (!stillPresent) {
      setPreviewZ(elements[0].id);
    }
  }, [elements, previewZ]);

  const periodStats = useMemo(() => {
    const map = new Map<number, { total: number; completed: number; gold: number }>();
    for (const p of PERIODS) {
      map.set(p, { total: 0, completed: 0, gold: 0 });
    }
    for (const { item, pos } of positionedElements) {
      const entry = map.get(pos.period);
      if (!entry) continue;
      entry.total += 1;
      if (item.bestMs && item.bestMs > 0) entry.completed += 1;
      if (item.medal === 'gold') entry.gold += 1;
    }
    return map;
  }, [positionedElements]);

  const previewEntry = useMemo(() => {
    if (positionedElements.length === 0) return null;
    return positionedElements.find((entry) => entry.item.id === previewZ) ?? positionedElements[0];
  }, [positionedElements, previewZ]);

  const registerTileRef = useCallback(
    (z: number, node: HTMLDivElement | null) => {
      tileRefs.current.set(z, node);
      elementRefCallback?.(z, node);
    },
    [elementRefCallback]
  );

  const findNextGridTarget = useCallback(
    (
      currentZ: number,
      key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
    ): number | null => {
      const candidates =
        activeTab === 'entanglement' || viewMode === 'period'
          ? positionedElements.filter(({ item, pos }) =>
              activeTab === 'entanglement'
                ? true
                : pos.period === selectedPeriod && matchesFilter(item, filter)
            )
          : positionedElements;

      const currentIndex = candidates.findIndex((c) => c.item.id === currentZ);
      if (currentIndex === -1) return null;

      // Linear navigation in Period View or Entanglement strip
      if (activeTab === 'entanglement' || viewMode === 'period') {
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          const next = candidates[currentIndex + 1];
          return next ? next.item.id : null;
        }
        const prev = candidates[currentIndex - 1];
        return prev ? prev.item.id : null;
      }

      // Spatial 2D grid navigation in 18x10 IUPAC table
      const current = candidates[currentIndex];
      const { gridRow, gridColumn } = current.pos;

      if (key === 'ArrowRight') {
        const sameRowRight = candidates
          .filter((c) => c.pos.gridRow === gridRow && c.pos.gridColumn > gridColumn)
          .sort((a, b) => a.pos.gridColumn - b.pos.gridColumn);
        if (sameRowRight.length > 0) return sameRowRight[0].item.id;
        // Wrap to first element in next non-empty row
        const nextRows = candidates
          .filter((c) => c.pos.gridRow > gridRow)
          .sort((a, b) => a.pos.gridRow - b.pos.gridRow || a.pos.gridColumn - b.pos.gridColumn);
        return nextRows[0]?.item.id ?? null;
      }

      if (key === 'ArrowLeft') {
        const sameRowLeft = candidates
          .filter((c) => c.pos.gridRow === gridRow && c.pos.gridColumn < gridColumn)
          .sort((a, b) => b.pos.gridColumn - a.pos.gridColumn);
        if (sameRowLeft.length > 0) return sameRowLeft[0].item.id;
        // Wrap to last element in previous non-empty row
        const prevRows = candidates
          .filter((c) => c.pos.gridRow < gridRow)
          .sort((a, b) => b.pos.gridRow - a.pos.gridRow || b.pos.gridColumn - a.pos.gridColumn);
        return prevRows[0]?.item.id ?? null;
      }

      if (key === 'ArrowDown') {
        const below = candidates.filter((c) => c.pos.gridRow > gridRow);
        if (below.length === 0) return null;
        const minRow = Math.min(...below.map((c) => c.pos.gridRow));
        const nearestRow = below.filter((c) => c.pos.gridRow === minRow);
        nearestRow.sort(
          (a, b) =>
            Math.abs(a.pos.gridColumn - gridColumn) - Math.abs(b.pos.gridColumn - gridColumn)
        );
        return nearestRow[0]?.item.id ?? null;
      }

      // ArrowUp
      const above = candidates.filter((c) => c.pos.gridRow < gridRow);
      if (above.length === 0) return null;
      const maxRow = Math.max(...above.map((c) => c.pos.gridRow));
      const nearestRow = above.filter((c) => c.pos.gridRow === maxRow);
      nearestRow.sort(
        (a, b) => Math.abs(a.pos.gridColumn - gridColumn) - Math.abs(b.pos.gridColumn - gridColumn)
      );
      return nearestRow[0]?.item.id ?? null;
    },
    [activeTab, filter, positionedElements, selectedPeriod, viewMode]
  );

  const handleTileKeyDown = (z: number, e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (alchemyMode || e.shiftKey) {
        onAtomClick(z, e as unknown as React.MouseEvent);
      } else {
        onAtomSelect(z);
      }
      return;
    }
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
      const targetZ = findNextGridTarget(z, e.key);
      if (targetZ !== null) {
        setPreviewZ(targetZ);
        const node = tileRefs.current.get(targetZ);
        node?.focus();
      }
    }
  };

  const getMedalClass = (medal: IsotopeMedal): string => {
    if (medal === 'gold') return styles.medalGold;
    if (medal === 'silver') return styles.medalSilver;
    if (medal === 'bronze') return styles.medalBronze;
    return '';
  };

  const handlePeriodChipClick = (period: number) => {
    setSelectedPeriod(period);
    if (viewMode === 'table') {
      setHighlightedPeriod((prev) => (prev === period ? null : period));
      const firstInPeriod = positionedElements.find((el) => el.pos.period === period);
      if (firstInPeriod) {
        setPreviewZ(firstInPeriod.item.id);
      }
    }
  };

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || !viewportRef.current) return;
    dragPanRef.current = {
      startX: e.clientX,
      scrollLeft: viewportRef.current.scrollLeft
    };
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragPanRef.current || !viewportRef.current) return;
    const dx = e.clientX - dragPanRef.current.startX;
    viewportRef.current.scrollLeft = dragPanRef.current.scrollLeft - dx;
  };

  const handleViewportPointerUp = () => {
    dragPanRef.current = null;
  };

  const findUnlockedTargetZ = useCallback(
    (clientX: number, clientY: number, eventTarget: EventTarget | null, sourceZ: number) => {
      const unlocked = unlockedZSetRef.current;

      // 1. Check exact tile bounding rects first (real browser layout)
      for (const [z, node] of tileRefs.current.entries()) {
        if (!node || z === sourceZ || !unlocked.has(z)) continue;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return z;
        }
      }

      // 2. Fallback to document.elementFromPoint
      if (typeof document !== 'undefined' && typeof document.elementFromPoint === 'function') {
        const hit = document.elementFromPoint(clientX, clientY);
        const tileEl = hit?.closest?.('[data-z]') as HTMLElement | null;
        if (tileEl) {
          const z = Number(tileEl.getAttribute('data-z'));
          if (!Number.isNaN(z) && z !== sourceZ && unlocked.has(z)) {
            return z;
          }
        }
      }

      // 3. Fallback to event.target (for jsdom synthetic pointer events)
      const targetEl = (eventTarget as HTMLElement | null)?.closest?.(
        '[data-z]'
      ) as HTMLElement | null;
      if (targetEl) {
        const z = Number(targetEl.getAttribute('data-z'));
        if (!Number.isNaN(z) && z !== sourceZ && unlocked.has(z)) {
          return z;
        }
      }

      return null;
    },
    []
  );

  const cleanupDragListenersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupDragListenersRef.current?.();
    };
  }, []);

  const handleTilePointerDown = (
    item: PeriodicTableElementItem,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (item.disabled) return;
    if (e.pointerType === 'touch') return;
    if (e.button !== undefined && e.button !== 0) return;

    const node = tileRefs.current.get(item.id);
    const rect = node?.getBoundingClientRect();
    const originX = rect && rect.width > 0 ? rect.left + rect.width / 2 : e.clientX;
    const originY = rect && rect.height > 0 ? rect.top + rect.height / 2 : e.clientY;

    covalentDragRef.current = {
      sourceZ: item.id,
      startX: e.clientX,
      startY: e.clientY,
      originX,
      originY,
      active: false,
      hoveredZ: null
    };

    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      const drag = covalentDragRef.current;
      if (!drag) return;
      const dist = Math.hypot(moveEvent.clientX - drag.startX, moveEvent.clientY - drag.startY);
      if (!drag.active && dist > DRAG_THRESHOLD_PX) {
        drag.active = true;
      }
      if (!drag.active) return;

      const hoveredZ = findUnlockedTargetZ(
        moveEvent.clientX,
        moveEvent.clientY,
        moveEvent.target,
        drag.sourceZ
      );
      drag.hoveredZ = hoveredZ;

      let endX = moveEvent.clientX;
      let endY = moveEvent.clientY;
      if (hoveredZ !== null) {
        const targetNode = tileRefs.current.get(hoveredZ);
        const targetRect = targetNode?.getBoundingClientRect();
        if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
          endX = targetRect.left + targetRect.width / 2;
          endY = targetRect.top + targetRect.height / 2;
        }
      }

      setCovalentArc({
        sourceZ: drag.sourceZ,
        targetZ: hoveredZ,
        x1: drag.originX,
        y1: drag.originY,
        x2: endX,
        y2: endY
      });
    };

    const finishDrag = (upEvent?: PointerEvent) => {
      const drag = covalentDragRef.current;
      covalentDragRef.current = null;
      cleanupDragListenersRef.current?.();
      cleanupDragListenersRef.current = null;
      setCovalentArc(null);

      if (drag?.active && upEvent) {
        suppressNextClickRef.current = true;
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);

        const dropZ =
          findUnlockedTargetZ(upEvent.clientX, upEvent.clientY, upEvent.target, drag.sourceZ) ??
          drag.hoveredZ;
        if (dropZ !== null && dropZ !== drag.sourceZ) {
          onAtomCombineRef.current?.(drag.sourceZ, dropZ);
        }
      }
    };

    const handleWindowPointerUp = (upEvent: PointerEvent) => finishDrag(upEvent);
    const handleWindowPointerCancel = () => finishDrag();

    cleanupDragListenersRef.current?.();
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerCancel);
    cleanupDragListenersRef.current = () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerCancel);
    };
  };

  const handleTileClick = (id: number, e: React.MouseEvent) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      e.preventDefault();
      return;
    }
    onAtomClick(id, e);
  };

  const periodViewElements = useMemo(
    () =>
      positionedElements.filter(
        ({ item, pos }) => pos.period === selectedPeriod && matchesFilter(item, filter)
      ),
    [filter, positionedElements, selectedPeriod]
  );

  return (
    <div className={styles.wrapper} data-testid="periodic-table-root">
      {/* Controls Bar: Quick Filters + Mobile View Switch + Zoom */}
      {activeTab === 'classic' && (
        <div className={styles.controlsBar}>
          <div className={styles.filterGroup} data-testid="periodic-filters">
            {(
              [
                ['all', pt.filters.all],
                ['incomplete', pt.filters.incomplete],
                ['no_gold', pt.filters.noGold],
                ['noble_gases', pt.filters.nobleGases]
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-filter={key}
                aria-pressed={filter === key}
                className={`${styles.filterButton} ${filter === key ? styles.filterButtonActive : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
            {isEntanglementUnlocked && onOpenEntanglement && (
              <button
                type="button"
                data-filter="entanglement"
                className={`${styles.filterButton} ${styles.filterButtonEntanglement}`}
                onClick={onOpenEntanglement}
              >
                {pt.filters.entanglementShort}
              </button>
            )}
          </div>

          <div className={styles.viewAndZoomGroup}>
            <div className={styles.viewToggleGroup} data-testid="mobile-view-toggle">
              <button
                type="button"
                aria-pressed={viewMode === 'table'}
                className={`${styles.viewToggleButton} ${
                  viewMode === 'table' ? styles.viewToggleButtonActive : ''
                }`}
                onClick={() => setViewMode('table')}
              >
                {pt.viewTable}
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'period'}
                className={`${styles.viewToggleButton} ${
                  viewMode === 'period' ? styles.viewToggleButtonActive : ''
                }`}
                onClick={() => setViewMode('period')}
              >
                {pt.viewPeriod}
              </button>
            </div>

            {viewMode === 'table' && (
              <div className={styles.zoomControls} data-testid="table-zoom-controls">
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label={pt.zoomOut}
                  onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
                >
                  −
                </button>
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label={pt.zoomReset}
                  onClick={() => setZoom(1)}
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className={styles.zoomButton}
                  aria-label={pt.zoomIn}
                  onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Period Progress Strip (P1..P7) */}
      {activeTab === 'classic' && (
        <div className={styles.periodProgressStrip} data-testid="period-progress-strip">
          {PERIODS.map((p) => {
            const stats = periodStats.get(p) ?? { total: 0, completed: 0, gold: 0 };
            const completedPct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
            const goldPct = stats.total > 0 ? (stats.gold / stats.total) * 100 : 0;
            const isActive = viewMode === 'period' ? selectedPeriod === p : highlightedPeriod === p;
            return (
              <button
                key={p}
                type="button"
                data-period-chip={p}
                aria-pressed={isActive}
                className={`${styles.periodChip} ${isActive ? styles.periodChipActive : ''}`}
                onClick={() => handlePeriodChipClick(p)}
              >
                <div className={styles.periodChipHeader}>
                  <strong>{pt.periodShort(p)}</strong>
                  <span className={styles.periodChipCounts}>
                    {stats.completed}/{stats.total}
                  </span>
                </div>
                <div className={styles.periodProgressTrack}>
                  <div
                    className={styles.periodProgressFill}
                    style={{ width: `${completedPct}%` }}
                  />
                  {goldPct > 0 && (
                    <div className={styles.periodProgressGold} style={{ width: `${goldPct}%` }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content: 18x7 Table View, Period Focused View, or Entanglement Cards */}
      {activeTab === 'entanglement' ? (
        <div className={styles.periodFocusedContainer} data-testid="entanglement-grid">
          <div className={styles.periodCardsGrid}>
            {positionedElements.map(({ item, pos }) => {
              const medalInfo = getMedalDisplayInfo(item.medal, locale);
              const isSelectedAlchemy =
                selectedAtomZ === item.id || covalentArc?.sourceZ === item.id;
              const isDragTarget = covalentArc?.targetZ === item.id;
              const isAlchemyCandidate =
                !item.disabled &&
                ((alchemyMode && selectedAtomZ !== null && selectedAtomZ !== item.id) ||
                  (covalentArc !== null && covalentArc.sourceZ !== item.id));
              const isRejected = rejectedSet.has(item.id);
              return (
                <div
                  key={`${item.id}-${item.symbol}`}
                  ref={(node) => registerTileRef(item.id, node)}
                  data-z={item.id}
                  data-symbol={item.symbol}
                  data-group={pos.group}
                  data-period={pos.period}
                  data-block={pos.block}
                  data-alchemy-candidate={isAlchemyCandidate ? 'true' : undefined}
                  data-alchemy-rejected={isRejected ? 'true' : undefined}
                  data-drag-target={isDragTarget ? 'true' : undefined}
                  role="button"
                  tabIndex={item.disabled ? -1 : 0}
                  className={`${styles.periodCard} ${getMedalClass(item.medal)} ${
                    item.disabled ? styles.menuItemDisabled : ''
                  } ${isSelectedAlchemy ? styles.menuItemSelectedAlchemy : ''} ${
                    isAlchemyCandidate ? styles.alchemyPartnerCandidate : ''
                  } ${isDragTarget ? styles.elementTileDragTarget : ''} ${
                    isRejected ? styles.elementTileRejectBounce : ''
                  }`}
                  onPointerDown={(e) => handleTilePointerDown(item, e)}
                  onClick={(e) => handleTileClick(item.id, e)}
                  onMouseEnter={() => setPreviewZ(item.id)}
                  onFocus={() => setPreviewZ(item.id)}
                  onTouchStart={(e) => {
                    setPreviewZ(item.id);
                    onAtomTouchStart?.(item.id, e);
                  }}
                  onTouchEnd={(e) => onAtomTouchEnd?.(e)}
                  onKeyDown={(e) => handleTileKeyDown(item.id, e)}
                >
                  <div
                    className={styles.periodCardSwatch}
                    style={{ backgroundColor: item.hue, color: item.antiHue }}
                  >
                    <span className={styles.tileZ}>{item.id}</span>
                    <span className={styles.tileSymbol}>{item.symbol}</span>
                    {item.medal !== 'none' && (
                      <span
                        className={styles.tileMedalStar}
                        style={{ color: medalInfo.color }}
                        title={medalInfo.label}
                        aria-label={medalInfo.label}
                      >
                        {medalInfo.symbol}
                      </span>
                    )}
                  </div>
                  <div className={styles.periodCardInfo}>
                    <span className={styles.periodCardName}>{item.atom}</span>
                    <span className={styles.periodCardMeta}>
                      {item.score}
                      {item.bestJumps !== undefined
                        ? ` • ${item.bestJumps}${t.levelSelection.jumpSuffix}`
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'period' ? (
        <div className={styles.periodFocusedContainer} data-testid="period-focused-view">
          <div className={styles.periodFocusedHeader}>
            <span>{pt.periodFull(selectedPeriod)}</span>
            <span>{periodViewElements.length}</span>
          </div>
          {periodViewElements.length === 0 ? (
            <div className={styles.emptyFilterState}>—</div>
          ) : (
            <div className={styles.periodCardsGrid}>
              {periodViewElements.map(({ item, pos }) => {
                const medalInfo = getMedalDisplayInfo(item.medal, locale);
                const isSelectedAlchemy =
                  selectedAtomZ === item.id || covalentArc?.sourceZ === item.id;
                const isDragTarget = covalentArc?.targetZ === item.id;
                const isAlchemyCandidate =
                  !item.disabled &&
                  ((alchemyMode && selectedAtomZ !== null && selectedAtomZ !== item.id) ||
                    (covalentArc !== null && covalentArc.sourceZ !== item.id));
                const isRejected = rejectedSet.has(item.id);
                return (
                  <div
                    key={`${item.id}-${item.symbol}`}
                    ref={(node) => registerTileRef(item.id, node)}
                    data-z={item.id}
                    data-symbol={item.symbol}
                    data-group={pos.group}
                    data-period={pos.period}
                    data-block={pos.block}
                    data-grid-row={pos.gridRow}
                    data-grid-col={pos.gridColumn}
                    data-noble={item.isNobleGas ? 'true' : undefined}
                    data-alchemy-candidate={isAlchemyCandidate ? 'true' : undefined}
                    data-alchemy-rejected={isRejected ? 'true' : undefined}
                    data-drag-target={isDragTarget ? 'true' : undefined}
                    role="button"
                    tabIndex={item.disabled ? -1 : 0}
                    className={`${styles.periodCard} ${getMedalClass(item.medal)} ${
                      item.disabled ? styles.menuItemDisabled : ''
                    } ${isSelectedAlchemy ? styles.menuItemSelectedAlchemy : ''} ${
                      isAlchemyCandidate ? styles.alchemyPartnerCandidate : ''
                    } ${isDragTarget ? styles.elementTileDragTarget : ''} ${
                      isRejected ? styles.elementTileRejectBounce : ''
                    }`}
                    onPointerDown={(e) => handleTilePointerDown(item, e)}
                    onClick={(e) => handleTileClick(item.id, e)}
                    onMouseEnter={() => setPreviewZ(item.id)}
                    onFocus={() => setPreviewZ(item.id)}
                    onTouchStart={(e) => {
                      setPreviewZ(item.id);
                      onAtomTouchStart?.(item.id, e);
                    }}
                    onTouchEnd={(e) => onAtomTouchEnd?.(e)}
                    onKeyDown={(e) => handleTileKeyDown(item.id, e)}
                  >
                    <div
                      className={styles.periodCardSwatch}
                      style={{ backgroundColor: item.hue, color: item.antiHue }}
                    >
                      <span className={styles.tileZ}>{item.id}</span>
                      {item.isNobleGas && (
                        <span className={styles.tileNobleBadge} aria-hidden="true">
                          ✦
                        </span>
                      )}
                      <span className={styles.tileSymbol}>{item.symbol}</span>
                      {item.medal !== 'none' && (
                        <span
                          className={styles.tileMedalStar}
                          style={{ color: medalInfo.color }}
                          title={medalInfo.label}
                          aria-label={medalInfo.label}
                        >
                          {medalInfo.symbol}
                        </span>
                      )}
                    </div>
                    <div className={styles.periodCardInfo}>
                      <span className={styles.periodCardName}>{item.atom}</span>
                      <span className={styles.periodCardMeta}>
                        G{pos.group} · {item.score}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div
          ref={viewportRef}
          className={styles.tableViewport}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
        >
          <div
            className={styles.tableZoomSurface}
            style={{ transform: `scale(${zoom})`, width: `${100 / Math.min(1, zoom)}%` }}
          >
            <div className={styles.periodicGrid} data-testid="periodic-table-grid">
              {/* Placeholders for detached Lanthanide (57-71) and Actinide (89-103) blocks */}
              <div
                className={styles.seriesPlaceholder}
                style={{ gridRow: 6, gridColumn: 3 }}
                aria-hidden="true"
              >
                <span>57–71</span>
                <span>La–Lu</span>
              </div>
              <div
                className={styles.seriesPlaceholder}
                style={{ gridRow: 7, gridColumn: 3 }}
                aria-hidden="true"
              >
                <span>89–103</span>
                <span>Ac–Lr</span>
              </div>

              {/* Entanglement Rift Portal in Row 7, Cols 10..14 (Z=110..114) */}
              <button
                type="button"
                className={styles.entanglementRiftCell}
                style={{ gridRow: 7, gridColumn: '10 / 15' }}
                disabled={!isEntanglementUnlocked}
                onClick={() => {
                  if (isEntanglementUnlocked) onOpenEntanglement?.();
                }}
                title={pt.entanglementRift}
              >
                <span>{pt.entanglementRift}</span>
              </button>

              {/* Row Labels for detached f-block rows */}
              <div
                className={styles.seriesRowLabel}
                style={{ gridRow: 9, gridColumn: '1 / 4' }}
                aria-hidden="true"
              >
                {pt.lanthanides}
              </div>
              <div
                className={styles.seriesRowLabel}
                style={{ gridRow: 10, gridColumn: '1 / 4' }}
                aria-hidden="true"
              >
                {pt.actinides}
              </div>

              {/* All Classic Periodic Table Tiles placed at exact IUPAC gridRow / gridColumn */}
              {positionedElements.map(({ item, pos }) => {
                const medalInfo = getMedalDisplayInfo(item.medal, locale);
                const isSelectedAlchemy =
                  selectedAtomZ === item.id || covalentArc?.sourceZ === item.id;
                const isDragTarget = covalentArc?.targetZ === item.id;
                const isAlchemyCandidate =
                  !item.disabled &&
                  ((alchemyMode && selectedAtomZ !== null && selectedAtomZ !== item.id) ||
                    (covalentArc !== null && covalentArc.sourceZ !== item.id));
                const isRejected = rejectedSet.has(item.id);
                const isMatch = matchesFilter(item, filter);
                const isPeriodHighlighted = highlightedPeriod === pos.period;
                const isPreviewed = previewEntry?.item.id === item.id;

                return (
                  <div
                    key={`${item.id}-${item.symbol}`}
                    ref={(node) => registerTileRef(item.id, node)}
                    data-z={item.id}
                    data-symbol={item.symbol}
                    data-group={pos.group}
                    data-period={pos.period}
                    data-block={pos.block}
                    data-grid-row={pos.gridRow}
                    data-grid-col={pos.gridColumn}
                    data-noble={item.isNobleGas ? 'true' : undefined}
                    data-filtered-out={!isMatch ? 'true' : undefined}
                    data-alchemy-candidate={isAlchemyCandidate ? 'true' : undefined}
                    data-alchemy-rejected={isRejected ? 'true' : undefined}
                    data-drag-target={isDragTarget ? 'true' : undefined}
                    role="button"
                    tabIndex={item.disabled ? -1 : 0}
                    style={{
                      gridRow: pos.gridRow,
                      gridColumn: pos.gridColumn,
                      backgroundColor: item.hue,
                      color: item.antiHue,
                      borderColor: !item.disabled ? `${item.antiHue}55` : undefined
                    }}
                    className={`${styles.elementTile} ${getMedalClass(item.medal)} ${
                      item.isNobleGas ? styles.nobleGasTile : ''
                    } ${item.disabled ? styles.menuItemDisabled : ''} ${
                      isSelectedAlchemy ? styles.menuItemSelectedAlchemy : ''
                    } ${isAlchemyCandidate ? styles.alchemyPartnerCandidate : ''} ${
                      isDragTarget ? styles.elementTileDragTarget : ''
                    } ${isRejected ? styles.elementTileRejectBounce : ''} ${
                      !isMatch ? styles.elementTileFilteredOut : ''
                    } ${isPeriodHighlighted ? styles.elementTilePeriodHighlight : ''} ${
                      isPreviewed ? styles.elementTilePreviewed : ''
                    }`}
                    onPointerDown={(e) => handleTilePointerDown(item, e)}
                    onClick={(e) => handleTileClick(item.id, e)}
                    onMouseEnter={() => setPreviewZ(item.id)}
                    onFocus={() => setPreviewZ(item.id)}
                    onTouchStart={(e) => {
                      setPreviewZ(item.id);
                      onAtomTouchStart?.(item.id, e);
                    }}
                    onTouchEnd={(e) => onAtomTouchEnd?.(e)}
                    onKeyDown={(e) => handleTileKeyDown(item.id, e)}
                  >
                    <span className={styles.tileZ}>{item.id}</span>
                    {item.isNobleGas && (
                      <span
                        className={styles.tileNobleBadge}
                        title={pt.preview.nobleGasBadge}
                        aria-hidden="true"
                      >
                        ✦
                      </span>
                    )}
                    <span className={styles.tileSymbol}>{item.symbol}</span>
                    <span className={styles.tileName}>{item.atom}</span>
                    {item.medal !== 'none' && (
                      <span
                        className={styles.tileMedalStar}
                        style={{ color: medalInfo.color }}
                        title={medalInfo.label}
                        aria-label={medalInfo.label}
                      >
                        {medalInfo.symbol}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Covalent Bond SVG Arc Overlay during Desktop Drag-and-Drop */}
      {covalentArc && (
        <svg
          className={styles.covalentArcOverlay}
          data-testid="covalent-arc-overlay"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="covalent-arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          {(() => {
            const { x1, y1, x2, y2 } = covalentArc;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.hypot(dx, dy);
            const curveOffset = Math.min(72, Math.max(18, dist * 0.22));
            const cx = mx;
            const cy = my - curveOffset;
            const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
            return (
              <>
                <path d={d} className={styles.covalentArcGlow} />
                <path d={d} className={styles.covalentArcCore} data-testid="covalent-arc-path" />
                <circle cx={x1} cy={y1} r={12} fill="rgba(56, 189, 248, 0.28)" />
                <circle cx={x1} cy={y1} r={5} fill="#38bdf8" />
                <circle
                  cx={x2}
                  cy={y2}
                  r={covalentArc.targetZ !== null ? 16 : 10}
                  fill={
                    covalentArc.targetZ !== null
                      ? 'rgba(244, 114, 182, 0.35)'
                      : 'rgba(192, 132, 252, 0.28)'
                  }
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={covalentArc.targetZ !== null ? 6 : 4}
                  fill={covalentArc.targetZ !== null ? '#f472b6' : '#e879f9'}
                />
              </>
            );
          })()}
        </svg>
      )}

      {/* Element Preview Panel */}
      {previewEntry && (
        <section className={styles.previewPanel} data-testid="element-preview-panel">
          <div className={styles.previewIdentity}>
            <div
              className={`${styles.previewSwatch} ${getMedalClass(previewEntry.item.medal)}`}
              style={{
                backgroundColor: previewEntry.item.hue,
                color: previewEntry.item.antiHue
              }}
            >
              <span className={styles.previewSwatchZ}>{previewEntry.item.id}</span>
              <span className={styles.previewSwatchSymbol}>{previewEntry.item.symbol}</span>
            </div>
            <div className={styles.previewTitleGroup}>
              <h2 className={styles.previewTitle}>
                #{previewEntry.item.id} — {previewEntry.item.atom}
              </h2>
              <div className={styles.previewSubtitle}>
                <span className={styles.previewBadge}>{pt.families[previewEntry.family]}</span>
                <span>
                  {pt.preview.position(
                    previewEntry.pos.group,
                    previewEntry.pos.period,
                    previewEntry.pos.block
                  )}
                </span>
                {previewEntry.item.isNobleGas && (
                  <span className={`${styles.previewBadge} ${styles.previewBadgeNoble}`}>
                    {pt.preview.nobleGasBadge}
                  </span>
                )}
                {previewEntry.item.isEntanglement && (
                  <span className={`${styles.previewBadge} ${styles.previewBadgeEntangled}`}>
                    {pt.preview.entanglementBadge}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.previewStats}>
            <div className={styles.previewStatBlock}>
              <span className={styles.previewStatLabel}>{pt.preview.bestTime}</span>
              <span className={styles.previewStatValue}>
                {previewEntry.item.bestMs && previewEntry.item.bestMs > 0
                  ? previewEntry.item.score
                  : pt.preview.noRecord}
              </span>
            </div>

            <div className={styles.previewStatBlock}>
              <span className={styles.previewStatLabel}>{pt.preview.bestJumps}</span>
              <span className={styles.previewStatValue}>
                {previewEntry.item.bestJumps !== undefined
                  ? `${previewEntry.item.bestJumps}${t.levelSelection.jumpSuffix}`
                  : '—'}
              </span>
            </div>

            <div className={styles.previewStatBlock}>
              <span className={styles.previewStatLabel}>{pt.preview.medal}</span>
              <span
                className={styles.previewStatValue}
                style={{
                  color: getMedalDisplayInfo(previewEntry.item.medal, locale).color
                }}
              >
                {getMedalDisplayInfo(previewEntry.item.medal, locale).shortLabel}
              </span>
            </div>

            <div className={styles.previewStatBlock}>
              <span className={styles.previewStatLabel}>{pt.preview.mechanics}</span>
              <div className={styles.previewMechanics}>
                {getElementMechanics(
                  previewEntry.item,
                  previewEntry.pos,
                  previewEntry.family,
                  pt.mechanicsLabels
                ).map((mech) => (
                  <span key={mech} className={styles.mechanicPill}>
                    {mech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.previewActionButton}
            disabled={previewEntry.item.disabled}
            onClick={() => onAtomSelect(previewEntry.item.id)}
          >
            {previewEntry.item.disabled ? pt.preview.locked : pt.preview.play}
          </button>
        </section>
      )}
    </div>
  );
};

export default PeriodicTable;
