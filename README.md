# Quantic Hero (v2.0)

> **A fast-paced quantum physics & speedrun platformer across the Periodic Table of Elements.**

[![License: MIT](https://img.shields.io/badge/License-MIT-00e5ff.svg)](./LICENSE.md)
[![Engine: Phaser 3](https://img.shields.io/badge/Engine-Phaser%203.88-ff00e5.svg)](https://phaser.io/)
[![UI: React 19 + Zustand 5](https://img.shields.io/badge/Stack-React%2019%20%7C%20Zustand%205%20%7C%20Vite-38bdf8.svg)](https://react.dev/)

**Quantic Hero** is a local-first, zero-backend arcade platformer and puzzle-speedrun game where you guide subatomic quanta across the **Periodic Table of Elements** ($Z = 1$ Hydrogen to the superheavy transuranic frontier). Each element features its authentic optical emission spectrum palette (`hue` / `antiHue`), cosmic narrative poetry across four astrophysical acts, and deterministic ghost speedrunning.

---

## Key Features

### 1. Quantum & Relativistic Gameplay Mechanics
- **Quantum Cloning (`duplicate`) & Multi-Body Puzzles**: Split your wavefunction into multiple active hero instances bounded by the level's quantum uncertainty (`uncertainty`), switch focus on the fly, and hold down `requireLock` pressure plates (`PressurePlate`) to open solid laser barriers (`Gate`).
- **Quantum Entanglement ($\Psi \otimes \Psi$, Levels 110–114)**: Simultaneously control **Alpha (Cyan)** and **Beta (Magenta)** entangled twins linked by a live multi-pass quantum wave beam across three symmetry modes:
  - `mirror_x`: Opposing horizontal parity.
  - `inverted_gravity`: One hero runs on the floor while the twin runs inverted on the ceiling.
  - `mirror_and_gravity`: Combined parity and gravity inversion with dual-portal docking.
- **Pauli Exclusion Repulsion (`pauli`)**: When two identical fermions (hero clones) approach within `< 75 px` while Pauli-charged, they trigger a high-energy kinetic blast (`±620 px/s` horizontal, `-580 px/s` vertical) to catapult across massive chasms.
- **Phase Superposition (`phase: 'cyan' | 'magenta'`)**: Every jump toggles the global quantum phase of the chamber, alternating which phase platforms are solid and which are intangible.
- **Quantum Tunneling (`tunnel`)**: Acquire tunneling charges to phase directly through thin potential barriers (`width <= 80 px`).
- **Radioactive Half-Life Decay (`decayMs`)**: Unstable platforms tremble and disintegrate milliseconds after initial contact before regenerating.
- **Relativistic Time Dilation (`timeDilation`) & Gravitational Collapse (`collapse`)**: Slow down moving platforms, radioactive decay timers, the level clock, and encroaching ceiling/floor spike jaws to `0.25x` speed while maintaining full player velocity.
- **Neon Wall Rebounds (`kind: 'wall'`) & Gravity Modifiers (`speed`, `lowGravity`, `antiGravity`)**: Chain vertical wall-jumps up gravity wells and invert world gravity mid-flight.

### 2. Speedrun Ghost Racing & Live Split Deltas
- **Built-in Optimal Author Ghosts (`authorGhost`)**: Every campaign level ships with a delta-compressed (`v1|...`) trajectory verified by a headless 60 Hz physics simulator (`src/generator/simulator.ts`).
- **3-Mode Ghost Replay**: Toggle in real time between `[GHOST: OPTIMAL]` (solver trajectory), `[GHOST: BEST]` (your personal best run), and `[GHOST: OFF]`.
- **Live Split Delta HUD**: Real-time spatial-temporal split comparison (`-0.35s` in green when ahead of the ghost, `+0.52s` in red when behind).

### 3. 100% Procedural Audio, Visuals & Haptics
- **Zero-Asset WebAudio Synthesizer (`src/audio/SoundManager.ts`)**: All sound effects (binaural stereo phase-beating on clone duplication, FM sweeps on quantum tunneling, Geiger crackles on platform decay, musical arpeggios per particle type) and the ambient chiptune soundtrack (which dynamically scales tempo from `118` to `134 BPM` and shifts waveforms as clone count increases) are synthesized in real time via the WebAudio API.
- **Quantum Luminescence (`src/effects/QuantumEffectsManager.ts`)**: Additive-blended de Broglie matter waves around moving heroes, relativistic cyan afterglow trails, and Kerr gravitational lensing vortex particles around exit portals—with automatic FPS monitoring and throttling (`FX:HI` / `FX:LO`).
- **Tactile Haptics (`src/tools/HapticFeedback.ts`)**: Event-driven vibration patterns for mobile devices (`HAP:ON` / `HAP:OFF`).

### 4. Deterministic Procedural Generation, Level Editor & QR Sharing
- **4-Phase Paced Level Generator (`src/generator/chunkAssembler.ts`, `src/generator/dagGenerator.ts`)**: Levels are structured around a 4-stage dramatic curve (*Awakening 15% → Acceleration 35% → Climax 35% → Resolution 15%*) using exact parabolic reachability kinematics (`src/generator/kinematics.ts`) and Mulberry32 seeded PRNG (`?seed=42&atom=14`).
- **Visual Drag-and-Drop Level Editor (`/editor`)**: Customize platforms, particles, dimensions, and element palettes directly in the browser.
- **Serverless URL & QR Code Challenge Sharing (`src/tools/levelCodec.ts`)**: Compress any level—along with your personal best ghost trajectory and time to beat—into a self-contained `#custom=...` URL or scannable Arcade QR code (`ShareModal.tsx`).
- **Offline-Ready PWA**: Installable Progressive Web App powered by `vite-plugin-pwa` and Workbox.

---

## Controls

| Action | Desktop (Keyboard) | Mobile / Touch |
| :--- | :--- | :--- |
| **Move Left / Right** | `←` / `→` or `A` / `D` | Press & drag horizontally (`< -20px` / `> +20px`) |
| **Jump (+ Phase Shift)** | `↑`, `W`, or `Space` | Drag upward (`< -20px`, or downward when gravity is inverted) |
| **Switch Active Clone** | Click on any clone sprite | Tap on any clone sprite |
| **HUD Toggles** | Click `[RST]`, `SND`, `HAP`, `FX`, `[GHOST]` | Tap HUD buttons |

### URL Query / Hash Parameters
- **Procedural Seed Mode**: `/game?seed=1337&atom=29` — Generates and validates a deterministic level on the fly for the specified atomic number and seed.
- **Shared Challenge Mode**: `/game#custom=<lz-compressed-payload>` — Loads a shared custom level and its author ghost challenge.
- **Entanglement Tab**: `/levels?entanglement=1` — Opens the Quantum Entanglement ($\Psi \otimes \Psi$) level selection tab directly.
- **God Mode (Debug)**: `?god=1` — Makes heroes invulnerable to spikes and unlocks all levels in the selector.

---

## Tech Stack & Project Structure

```text
QuanticHero/
├── public/                     # Static sprite sheets, PWA icons & manifest
├── scripts/
│   ├── generate-campaign.ts    # CLI generator for the Periodic Table campaign
│   ├── generate-quantum-level.ts # CLI procedural level generator & solver verifier
│   └── test-e2e.js             # Puppeteer E2E test suite
├── src/
│   ├── audio/
│   │   └── SoundManager.ts     # 100% procedural WebAudio SFX & dynamic chiptune BGM
│   ├── components/             # React 19 UI views (Menu, LevelSelection, LevelFinished, Explanation)
│   │   └── Editor/             # Drag-and-drop level editor & QR ShareModal
│   ├── data/
│   │   ├── spectroscopy.ts     # Complete 118-element spectroscopy database (Z, symbol, hues, nm lines)
│   │   ├── cosmicNarrative.ts  # 4 Cosmic Acts & level narrative dialogues
│   │   └── level1..114.json    # Verified campaign levels + entanglement levels (110-114)
│   ├── effects/
│   │   └── QuantumEffectsManager.ts # De Broglie matter waves & Kerr portal vortex rendering
│   ├── generator/
│   │   ├── kinematics.ts       # Closed-form ballistic parabola reachability math
│   │   ├── chunks.ts           # Modular level chunk archetypes
│   │   ├── chunkAssembler.ts   # 4-phase level pacing & campaign assembly
│   │   ├── dagGenerator.ts     # Mulberry32 PRNG & A* platform graph solver
│   │   └── simulator.ts        # Headless 60 Hz deterministic physics verification & ghost bot
│   ├── mechanics/
│   │   └── quantumMechanics.ts # Pure functions for Tunneling, Pauli repulsion, Phase, Decay & Collapse
│   ├── physics/
│   │   └── constants.ts        # Core physical constants (gravity, jump impulse, recoil, drag)
│   ├── scenes/
│   │   ├── BootScene.ts        # Initial scene bootstrap
│   │   ├── PreloadScene.ts     # Sprite & animation asset preloader
│   │   ├── GameScene.ts        # Core Phaser 3 gameplay scene, physics, HUD & camera orchestration
│   │   ├── Hero.ts             # Player & clone arcade physics entity
│   │   └── GhostHero.ts        # Interpolated holographic ghost replay entity
│   ├── store/
│   │   └── index.ts            # Zustand persisted state store ('qtmhro' localStorage)
│   └── tools/
│       ├── GhostRecorder.ts    # 15 Hz delta-encoded trajectory recorder & split delta calculator
│       ├── levelCodec.ts       # LZString URL level compressor, validator & sanitizer
│       ├── HapticFeedback.ts   # Mobile vibration controller
│       └── gameEvents.ts       # Typed pub/sub event bus bridging Phaser, Audio & Haptics
└── tests/                      # Vitest unit & integration suites
```

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20` (LTS recommended)
- **npm**

### Installation & Development

```bash
# Install dependencies
npm install

# Start the Vite development server (http://localhost:3000)
npm run dev

# Build production bundle & PWA service worker into dist/
npm run build

# Preview production build locally
npm run preview
```

### Testing, Linting & Level Generation

```bash
# Run unit and component tests (Vitest)
npm test

# Run linting & formatting checks (Biome)
npm run lint
npm run check

# Generate a single verified quantum level via CLI
npm run generate:level -- --atom=14 --difficulty=medium --seed=42

# Regenerate the full campaign dataset
npm run generate:campaign
```

---

## Architecture & Game Design Audit

A full, deeply sourced functional (Game Design) and technical (Software Architecture) audit of the project is available in [`docs/audit/2026-11-14-audit-complet-quantichero.md`](./docs/audit/2026-11-14-audit-complet-quantichero.md).

---

## License

Released under the [MIT License](./LICENSE.md) — Created by **David Bonnemaison**.
