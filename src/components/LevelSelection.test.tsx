import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store';
import LevelSelection from './LevelSelection';

describe('LevelSelection component', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      maxEntanglementLevel: 110,
      scores: {},
      customLevels: null,
      unlockedMolecules: [],
      locale: 'en'
    });
  });

  const renderWithRouter = (initialRoute = '/levels') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<div>Menu Page</div>} />
          <Route path="/levels" element={<LevelSelection />} />
          <Route path="/explanation" element={<div>Explanation Page</div>} />
          <Route path="/game" element={<div>Game Page</div>} />
          <Route path="/game/molecule/:moleculeId" element={<div>Molecule Game Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders title and back button', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { level: 1, name: /level selection/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('navigates back to menu when clicking back button', () => {
    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: /menu/i }));
    expect(screen.getByText('Menu Page')).toBeInTheDocument();
  });

  it('enables level 1 and disables levels beyond maxLevel (when maxLevel = 1)', () => {
    renderWithRouter();

    const _items = screen.getAllByRole('button');
    // Find item for level 1 (Hydrogen)
    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    expect(hydrogen).toBeInTheDocument();
    expect(hydrogen).toHaveAttribute('tabindex', '0');
    expect(hydrogen.className).not.toMatch(/menuItemDisabled/);

    // Find item for level 2 (Helium)
    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    expect(helium).toBeInTheDocument();
    expect(helium).toHaveAttribute('tabindex', '-1');
    expect(helium.className).toMatch(/menuItemDisabled/);
  });

  it('allows clicking unlocked level 1 to select it and navigate', () => {
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    fireEvent.click(hydrogen);

    expect(useGameStore.getState().currentLevel).toBe(1);
    expect(screen.getByText('Explanation Page')).toBeInTheDocument();
  });

  it('does nothing when clicking locked level beyond maxLevel', () => {
    renderWithRouter();

    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    fireEvent.click(helium);

    expect(useGameStore.getState().currentLevel).toBe(0);
    expect(screen.queryByText('Explanation Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Game Page')).not.toBeInTheDocument();
  });

  it('enables level 2 when maxLevel is increased to 2', () => {
    useGameStore.setState({ maxLevel: 2 });
    renderWithRouter();

    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    expect(helium).toHaveAttribute('tabindex', '0');
    expect(helium.className).not.toMatch(/menuItemDisabled/);
  });

  it('displays recorded scores for levels', () => {
    useGameStore.setState({
      maxLevel: 2,
      scores: {
        1: { last: 12340, best: 12340 }
      }
    });
    renderWithRouter();

    // 12340 ms = 00:12:34
    expect(screen.getByText('00:12:34')).toBeInTheDocument();
  });

  it('renders ghost toggle button and toggles 3-state when clicked', () => {
    // When no personal best run is recorded: off -> optimal -> off
    useGameStore.setState({ ghostMode: 'optimal', ghostEnabled: true, scores: {} });
    renderWithRouter();

    const ghostBtn = screen.getByRole('button', { name: /ghost enabled/i });
    expect(ghostBtn).toBeInTheDocument();
    expect(ghostBtn).toHaveTextContent('[GHOST: OPTIMAL]');

    fireEvent.click(ghostBtn);
    expect(useGameStore.getState().ghostMode).toBe('off');
    expect(useGameStore.getState().ghostEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /ghost disabled/i })).toHaveTextContent(
      '[GHOST: OFF]'
    );

    fireEvent.click(screen.getByRole('button', { name: /ghost disabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('optimal');
    expect(useGameStore.getState().ghostEnabled).toBe(true);
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: OPTIMAL]'
    );
  });

  it('cycles through off -> optimal -> best -> off when personal best exists', () => {
    useGameStore.setState({
      ghostMode: 'optimal',
      ghostEnabled: true,
      scores: { 1: { best: 10000, last: 10000, ghostTrajectory: 'v1|0,10,20,0,i' } }
    });
    renderWithRouter();

    const ghostBtn = screen.getByRole('button', { name: /ghost enabled/i });
    expect(ghostBtn).toHaveTextContent('[GHOST: OPTIMAL]');

    // Click optimal -> best
    fireEvent.click(ghostBtn);
    expect(useGameStore.getState().ghostMode).toBe('best');
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: BEST]'
    );

    // Click best -> off
    fireEvent.click(screen.getByRole('button', { name: /ghost enabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('off');
    expect(screen.getByRole('button', { name: /ghost disabled/i })).toHaveTextContent(
      '[GHOST: OFF]'
    );

    // Click off -> optimal
    fireEvent.click(screen.getByRole('button', { name: /ghost disabled/i }));
    expect(useGameStore.getState().ghostMode).toBe('optimal');
    expect(screen.getByRole('button', { name: /ghost enabled/i })).toHaveTextContent(
      '[GHOST: OPTIMAL]'
    );
  });

  it('hides Entanglement tab when maxLevel < 10', () => {
    useGameStore.setState({ maxLevel: 9, maxEntanglementLevel: 110 });
    renderWithRouter();

    // In Classic view by default
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
    expect(screen.queryByText('Darmstadtium')).not.toBeInTheDocument();
    // Entanglement tab is hidden
    expect(screen.queryByRole('button', { name: /intrication/i })).not.toBeInTheDocument();
  });

  it('shows Entanglement tab and allows switching once maxLevel >= 10', () => {
    useGameStore.setState({ maxLevel: 10, maxEntanglementLevel: 110 });
    renderWithRouter();

    // Entanglement tab is visible
    const entanglementTab = screen.getByRole('button', { name: /entanglement/i });
    expect(entanglementTab).toBeInTheDocument();

    // Click Entanglement tab
    fireEvent.click(entanglementTab);

    // Entangled levels 110-114 should now be visible
    expect(screen.getByText('Darmstadtium')).toBeInTheDocument();
    expect(screen.getByText('Roentgenium')).toBeInTheDocument();

    // Click Classic tab to return
    const classicTab = screen.getByRole('button', { name: /classic/i });
    fireEvent.click(classicTab);
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
  });

  it('displays entangled levels when query flag ?entanglement=1 is provided', () => {
    useGameStore.setState({ maxLevel: 1, maxEntanglementLevel: 110 });
    renderWithRouter('/levels?entanglement=1');

    // Entangled levels 110-114 should now be visible
    expect(screen.getByText('Darmstadtium')).toBeInTheDocument();
    expect(screen.getByText('Roentgenium')).toBeInTheDocument();
    expect(screen.getByText('Copernicium')).toBeInTheDocument();
    expect(screen.getByText('Nihonium')).toBeInTheDocument();
    expect(screen.getByText('Flerovium')).toBeInTheDocument();

    // Level 110 (Darmstadtium) is unlocked
    const ds = screen.getByText('Darmstadtium').closest('[role="button"]') as HTMLElement;
    expect(ds).toHaveAttribute('tabindex', '0');
    expect(ds.className).not.toMatch(/menuItemDisabled/);

    // Level 111 (Roentgenium) is locked when maxEntanglementLevel = 110
    const rg = screen.getByText('Roentgenium').closest('[role="button"]') as HTMLElement;
    expect(rg).toHaveAttribute('tabindex', '-1');
    expect(rg.className).toMatch(/menuItemDisabled/);
  });

  it('unlocks level 111 when maxEntanglementLevel is 111 with ?entanglement=1', () => {
    useGameStore.setState({ maxEntanglementLevel: 111 });
    renderWithRouter('/levels?entanglement=1');

    // Level 111 (Roentgenium) is now unlocked
    const rg = screen.getByText('Roentgenium').closest('[role="button"]') as HTMLElement;
    expect(rg).toHaveAttribute('tabindex', '0');
    expect(rg.className).not.toMatch(/menuItemDisabled/);
  });

  it('displays total Gold Isotopes out of 118 and per-tile isotope medal stars in English', () => {
    useGameStore.setState({
      maxLevel: 4,
      locale: 'en',
      scores: {
        1: { best: 8000, last: 8000, bestJumps: 3, medal: 'gold' },
        2: { best: 11000, last: 11000, bestJumps: 5, medal: 'silver' },
        3: { best: 15000, last: 15000, bestJumps: 9, medal: 'bronze' }
      }
    });
    renderWithRouter();

    const counter = screen.getByTestId('gold-isotope-counter');
    expect(counter).toHaveTextContent('Gold Isotopes: 1 / 118');
    expect(screen.getByLabelText('Quantum Isotope (Gold)')).toBeInTheDocument();
    expect(screen.getByLabelText('Pure Isotope (Silver)')).toBeInTheDocument();
    expect(screen.getByLabelText('Stable Isotope (Bronze)')).toBeInTheDocument();
  });

  it('displays fully localized French UI when locale is "fr"', () => {
    useGameStore.setState({
      maxLevel: 10,
      locale: 'fr',
      scores: {
        1: { best: 8000, last: 8000, bestJumps: 3, medal: 'gold' }
      }
    });
    renderWithRouter();

    expect(
      screen.getByRole('heading', { level: 1, name: /sélection des niveaux/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId('gold-isotope-counter')).toHaveTextContent("Isotopes d'Or : 1 / 118");
    expect(screen.getByRole('button', { name: /liaison chimique/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Isotope Quantique (Or)')).toBeInTheDocument();
  });

  it('Spec-10: Shift+Click combining H (1) and O (8) unlocks H2O in store and navigates to /game/molecule/H2O', () => {
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    const oxygen = screen.getByText('Oxygen').closest('[role="button"]') as HTMLElement;

    fireEvent.click(hydrogen, { shiftKey: true });
    fireEvent.click(oxygen, { shiftKey: true });

    expect(useGameStore.getState().unlockedMolecules).toContain('H2O');
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });

  it('Spec-10: Alchemy Mode toggle allows combining H (1) and O (8) without holding Shift', () => {
    useGameStore.setState({ locale: 'en' });
    renderWithRouter();

    const alchemyBtn = screen.getByRole('button', { name: /chemical bond/i });
    fireEvent.click(alchemyBtn);
    expect(alchemyBtn).toHaveAttribute('aria-pressed', 'true');

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    const oxygen = screen.getByText('Oxygen').closest('[role="button"]') as HTMLElement;

    fireEvent.click(hydrogen);
    fireEvent.click(oxygen);

    expect(useGameStore.getState().unlockedMolecules).toContain('H2O');
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });

  it('exposes levels 115-118 (Mc, Lv, Ts, Og) in Classic view and allows combining Og (118) + H (1) for OgH', () => {
    renderWithRouter();

    expect(screen.getByText('Moscovium')).toBeInTheDocument();
    expect(screen.getByText('Livermorium')).toBeInTheDocument();
    expect(screen.getByText('Tennessine')).toBeInTheDocument();
    expect(screen.getByText('Oganesson')).toBeInTheDocument();

    const oganesson = screen.getByText('Oganesson').closest('[role="button"]') as HTMLElement;
    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;

    fireEvent.click(oganesson, { shiftKey: true });
    fireEvent.click(hydrogen, { shiftKey: true });

    expect(useGameStore.getState().unlockedMolecules).toContain('OgH');
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });

  it('unlocks levels 115-118 based on classic maxLevel rather than maxEntanglementLevel', () => {
    useGameStore.setState({ maxLevel: 115, maxEntanglementLevel: 110 });
    renderWithRouter();

    const moscovium = screen.getByText('Moscovium').closest('[role="button"]') as HTMLElement;
    const livermorium = screen.getByText('Livermorium').closest('[role="button"]') as HTMLElement;

    expect(moscovium).toHaveAttribute('tabindex', '0');
    expect(moscovium.className).not.toMatch(/menuItemDisabled/);
    expect(livermorium).toHaveAttribute('tabindex', '-1');
    expect(livermorium.className).toMatch(/menuItemDisabled/);
  });

  it('keeps levels 115-118 locked when maxLevel is 109 even if maxEntanglementLevel is 114', () => {
    useGameStore.setState({ maxLevel: 109, maxEntanglementLevel: 114 });
    renderWithRouter();

    const moscovium = screen.getByText('Moscovium').closest('[role="button"]') as HTMLElement;
    expect(moscovium).toHaveAttribute('tabindex', '-1');
    expect(moscovium.className).toMatch(/menuItemDisabled/);
  });

  it('clears sharedLevel when selecting a normal level', () => {
    useGameStore.setState({
      sharedLevel: {
        id: 0,
        atom: 'H2O',
        symbol: 'H₂O',
        hue: '#000',
        antiHue: '#fff',
        heroSpawn: { x: 0, y: 0 },
        goal: { x: 100, y: 0 },
        platforms: []
      } as any
    });
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    fireEvent.click(hydrogen);

    expect(useGameStore.getState().sharedLevel).toBeNull();
    expect(useGameStore.getState().currentLevel).toBe(1);
  });

  it('Epic 03 Spec-01: places H, He, Lanthanides (La..Lu), Actinides (Ac..Lr), and Og at exact IUPAC grid coordinates', () => {
    renderWithRouter();

    const grid = screen.getByTestId('periodic-table-grid');
    expect(grid).toBeInTheDocument();

    const tile = (name: string) => screen.getByText(name).closest('[role="button"]') as HTMLElement;

    // H: row 1, col 1
    expect(tile('Hydrogen')).toHaveAttribute('data-grid-row', '1');
    expect(tile('Hydrogen')).toHaveAttribute('data-grid-col', '1');
    expect(tile('Hydrogen')).toHaveAttribute('data-group', '1');
    expect(tile('Hydrogen')).toHaveAttribute('data-period', '1');

    // He: row 1, col 18 (Noble Gas)
    expect(tile('Helium')).toHaveAttribute('data-grid-row', '1');
    expect(tile('Helium')).toHaveAttribute('data-grid-col', '18');
    expect(tile('Helium')).toHaveAttribute('data-noble', 'true');

    // Lanthanides detached on row 9, cols 4..18
    expect(tile('Lanthanum')).toHaveAttribute('data-grid-row', '9');
    expect(tile('Lanthanum')).toHaveAttribute('data-grid-col', '4');
    expect(tile('Lutetium')).toHaveAttribute('data-grid-row', '9');
    expect(tile('Lutetium')).toHaveAttribute('data-grid-col', '18');

    // Actinides detached on row 10, cols 4..18
    expect(tile('Actinium')).toHaveAttribute('data-grid-row', '10');
    expect(tile('Actinium')).toHaveAttribute('data-grid-col', '4');
    expect(tile('Lawrencium')).toHaveAttribute('data-grid-row', '10');
    expect(tile('Lawrencium')).toHaveAttribute('data-grid-col', '18');

    // Oganesson: row 7, col 18 (Noble Gas)
    expect(tile('Oganesson')).toHaveAttribute('data-grid-row', '7');
    expect(tile('Oganesson')).toHaveAttribute('data-grid-col', '18');
    expect(tile('Oganesson')).toHaveAttribute('data-noble', 'true');
  });

  it('Epic 03 Spec-01: filters elements via quick filters (All, Incomplete, No Gold, Noble Gases)', () => {
    useGameStore.setState({
      maxLevel: 10,
      scores: {
        1: { best: 7500, last: 7500, bestJumps: 2, medal: 'gold' },
        2: { best: 11000, last: 11000, bestJumps: 5, medal: 'silver' }
      }
    });
    renderWithRouter();

    const tile = (name: string) => screen.getByText(name).closest('[role="button"]') as HTMLElement;

    // Filter: Noble Gases
    fireEvent.click(screen.getByRole('button', { name: /noble gases/i }));
    expect(tile('Helium')).not.toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Neon')).not.toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Hydrogen')).toHaveAttribute('data-filtered-out', 'true');

    // Filter: No Gold
    fireEvent.click(screen.getByRole('button', { name: /no gold/i }));
    expect(tile('Hydrogen')).toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Helium')).not.toHaveAttribute('data-filtered-out', 'true');

    // Filter: Incomplete
    fireEvent.click(screen.getByRole('button', { name: /incomplete/i }));
    expect(tile('Hydrogen')).toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Helium')).toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Lithium')).not.toHaveAttribute('data-filtered-out', 'true');

    // Filter: All
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(tile('Hydrogen')).not.toHaveAttribute('data-filtered-out', 'true');
    expect(tile('Helium')).not.toHaveAttribute('data-filtered-out', 'true');
  });

  it('Epic 03 Spec-01: updates element preview panel on hover/focus with family, stats, and mechanics', () => {
    useGameStore.setState({
      maxLevel: 10,
      scores: {
        10: { best: 9200, last: 9200, bestJumps: 4, medal: 'silver' }
      }
    });
    renderWithRouter();

    const preview = screen.getByTestId('element-preview-panel');
    expect(preview).toHaveTextContent('#1 — Hydrogen');

    const neon = screen.getByText('Neon').closest('[role="button"]') as HTMLElement;
    fireEvent.mouseEnter(neon);

    expect(preview).toHaveTextContent('#10 — Neon');
    expect(preview).toHaveTextContent('Noble Gas');
    expect(preview).toHaveTextContent('Group 18 · Period 2 · p-block');
    expect(preview).toHaveTextContent('00:09:20');
    expect(preview).toHaveTextContent('4J');
    expect(preview).toHaveTextContent('SILVER');
    expect(preview).toHaveTextContent('Noble Playground');
  });

  it('Epic 03 Spec-01: supports full keyboard navigation (Arrow keys + Enter) across the IUPAC grid', () => {
    useGameStore.setState({ maxLevel: 12 });
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    const helium = screen.getByText('Helium').closest('[role="button"]') as HTMLElement;
    const lithium = screen.getByText('Lithium').closest('[role="button"]') as HTMLElement;

    hydrogen.focus();
    expect(document.activeElement).toBe(hydrogen);

    // ArrowRight from H (row 1 col 1) jumps across the gap to He (row 1 col 18)
    fireEvent.keyDown(hydrogen, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(helium);
    expect(screen.getByTestId('element-preview-panel')).toHaveTextContent('#2 — Helium');

    // ArrowLeft from He returns to H
    fireEvent.keyDown(helium, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(hydrogen);

    // ArrowDown from H (row 1 col 1) moves to Li (row 2 col 1)
    fireEvent.keyDown(hydrogen, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(lithium);
    expect(screen.getByTestId('element-preview-panel')).toHaveTextContent('#3 — Lithium');

    // Enter launches level 3 (Lithium)
    fireEvent.keyDown(lithium, { key: 'Enter' });
    expect(useGameStore.getState().currentLevel).toBe(3);
  });

  it('Epic 03 Spec-01: toggles mobile Table View and Period View and supports zoom controls', () => {
    useGameStore.setState({ maxLevel: 10 });
    renderWithRouter();

    // Default is Table View with zoom controls
    expect(screen.getByTestId('periodic-table-grid')).toBeInTheDocument();
    const zoomResetBtn = screen.getByRole('button', { name: /reset zoom/i });
    expect(zoomResetBtn).toHaveTextContent('100%');

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }));
    expect(zoomResetBtn).toHaveTextContent('115%');
    fireEvent.click(zoomResetBtn);
    expect(zoomResetBtn).toHaveTextContent('100%');

    // Switch to Period View in 1 tap
    fireEvent.click(screen.getByRole('button', { name: /period view/i }));
    expect(screen.getByTestId('period-focused-view')).toBeInTheDocument();
    expect(screen.queryByTestId('periodic-table-grid')).not.toBeInTheDocument();

    // Period 1 shows Hydrogen and Helium, not Lithium
    expect(screen.getByText('Hydrogen')).toBeInTheDocument();
    expect(screen.getByText('Helium')).toBeInTheDocument();
    expect(screen.queryByText('Lithium')).not.toBeInTheDocument();

    // Switch to Period 2 via P2 progress chip
    const p2Chip = screen
      .getByTestId('period-progress-strip')
      .querySelector('[data-period-chip="2"]') as HTMLElement;
    fireEvent.click(p2Chip);
    expect(screen.getByText('Lithium')).toBeInTheDocument();
    expect(screen.getByText('Neon')).toBeInTheDocument();
    expect(screen.queryByText('Hydrogen')).not.toBeInTheDocument();

    // Switch back to Table View
    fireEvent.click(screen.getByRole('button', { name: /table view/i }));
    expect(screen.getByTestId('periodic-table-grid')).toBeInTheDocument();
  });

  it('Epic 03 Spec-02: synthesizes H2O via desktop covalent drag-and-drop with live SVG arc', () => {
    useGameStore.setState({ maxLevel: 10, unlockedMolecules: [], moleculeScores: {} });
    renderWithRouter();

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    const oxygen = screen.getByText('Oxygen').closest('[role="button"]') as HTMLElement;

    // Start mouse pointer down on unlocked Hydrogen
    fireEvent.pointerDown(hydrogen, { pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 });

    // Moving less than 8px does not activate covalent arc
    fireEvent.pointerMove(window, { clientX: 24, clientY: 22 });
    expect(screen.queryByTestId('covalent-arc-overlay')).not.toBeInTheDocument();

    // Moving > 8px over Oxygen activates covalent arc overlay
    fireEvent.pointerMove(oxygen, { clientX: 240, clientY: 80 });
    expect(screen.getByTestId('covalent-arc-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('covalent-arc-path')).toBeInTheDocument();

    // Release on Oxygen completes covalent synthesis
    fireEvent.pointerUp(oxygen, { clientX: 240, clientY: 80 });

    expect(useGameStore.getState().unlockedMolecules).toContain('H2O');
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });

  it('Epic 03 Spec-02: illuminates partner candidates in Alchemy tap-to-pair mode and synthesizes on second tap', () => {
    useGameStore.setState({ maxLevel: 10, unlockedMolecules: [] });
    renderWithRouter();

    const alchemyBtn = screen.getByRole('button', { name: /chemical bond/i });
    fireEvent.click(alchemyBtn);
    expect(alchemyBtn).toHaveAttribute('aria-pressed', 'true');

    const hydrogen = screen.getByText('Hydrogen').closest('[role="button"]') as HTMLElement;
    const oxygen = screen.getByText('Oxygen').closest('[role="button"]') as HTMLElement;
    const lithium = screen.getByText('Lithium').closest('[role="button"]') as HTMLElement;

    // Tap atom A (Hydrogen)
    fireEvent.click(hydrogen);
    expect(screen.getByTestId('alchemy-status-hint')).toHaveTextContent('Select partner for H...');
    expect(oxygen).toHaveAttribute('data-alchemy-candidate', 'true');
    expect(lithium).toHaveAttribute('data-alchemy-candidate', 'true');
    expect(hydrogen).not.toHaveAttribute('data-alchemy-candidate', 'true');

    // Tap atom B (Oxygen)
    fireEvent.click(oxygen);
    expect(useGameStore.getState().unlockedMolecules).toContain('H2O');
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });

  it('Epic 03 Spec-02: shows clean rejection toast and elastic bounce without navigating for non-reactive pair', () => {
    useGameStore.setState({ maxLevel: 10, unlockedMolecules: [] });
    renderWithRouter();

    const alchemyBtn = screen.getByRole('button', { name: /chemical bond/i });
    fireEvent.click(alchemyBtn);

    const lithium = screen.getByText('Lithium').closest('[role="button"]') as HTMLElement;
    const beryllium = screen.getByText('Beryllium').closest('[role="button"]') as HTMLElement;

    fireEvent.click(lithium);
    fireEvent.click(beryllium);

    const toast = screen.getByTestId('alchemy-no-bond-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveAttribute('role', 'status');
    expect(toast).toHaveTextContent('No stable bond found');
    expect(lithium).toHaveAttribute('data-alchemy-rejected', 'true');
    expect(beryllium).toHaveAttribute('data-alchemy-rejected', 'true');
    expect(useGameStore.getState().unlockedMolecules).toEqual([]);
    expect(screen.queryByText('Molecule Game Page')).not.toBeInTheDocument();
  });

  it('Epic 03 Spec-02: opens Molecular Codex from toolbar, reflects unlockedMolecules persistence, and launches discovered molecule', () => {
    useGameStore.setState({
      maxLevel: 10,
      unlockedMolecules: ['H2O'],
      moleculeScores: {
        H2O: { best: 10500, last: 10500, medal: 'gold' }
      }
    });
    renderWithRouter();

    const codexBtn = screen.getByTestId('open-codex-button');
    expect(codexBtn).toHaveTextContent('Codex (1 / 12)');
    fireEvent.click(codexBtn);

    expect(screen.getByTestId('molecule-codex-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('codex-unlocked-counter')).toHaveTextContent('Unlocked: 1 / 12');

    const h2oSlot = screen.getByTestId('codex-slot-H2O');
    expect(h2oSlot).toHaveTextContent('H₂O');
    expect(h2oSlot).toHaveTextContent('00:10:50');

    const playBtn = h2oSlot.querySelector('button') as HTMLButtonElement;
    fireEvent.click(playBtn);
    expect(screen.getByText('Molecule Game Page')).toBeInTheDocument();
  });
});
