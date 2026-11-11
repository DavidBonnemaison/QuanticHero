import { beforeEach, describe, expect, it } from 'vitest';
import type { LevelData } from '../types';
import { useGameStore } from './index';

describe('useGameStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.setState({
      currentLevel: 0,
      maxLevel: 1,
      scores: {},
      customLevels: null,
      isMuted: false
    });
  });

  describe('initial state', () => {
    it('has expected default values', () => {
      const state = useGameStore.getState();
      expect(state.currentLevel).toBe(0);
      expect(state.maxLevel).toBe(1);
      expect(state.scores).toEqual({});
      expect(state.customLevels).toBeNull();
      expect(state.isMuted).toBe(false);
    });
  });

  describe('actions', () => {
    it('updates current level via updateCurrentLevel', () => {
      useGameStore.getState().updateCurrentLevel(4);
      expect(useGameStore.getState().currentLevel).toBe(4);
    });

    it('updates max level via updateMaxLevel', () => {
      useGameStore.getState().updateMaxLevel(7);
      expect(useGameStore.getState().maxLevel).toBe(7);
    });

    it('resets currentLevel and maxLevel via resetGame', () => {
      useGameStore.getState().updateCurrentLevel(5);
      useGameStore.getState().updateMaxLevel(8);
      useGameStore.getState().resetGame();

      expect(useGameStore.getState().currentLevel).toBe(0);
      expect(useGameStore.getState().maxLevel).toBe(1);
    });

    it('toggles mute status via toggleMute and sets via setMuted', () => {
      expect(useGameStore.getState().isMuted).toBe(false);
      useGameStore.getState().toggleMute();
      expect(useGameStore.getState().isMuted).toBe(true);
      useGameStore.getState().toggleMute();
      expect(useGameStore.getState().isMuted).toBe(false);

      useGameStore.getState().setMuted(true);
      expect(useGameStore.getState().isMuted).toBe(true);
      useGameStore.getState().setMuted(false);
      expect(useGameStore.getState().isMuted).toBe(false);
    });
  });

  describe('recordScore and progression', () => {
    it('records first score and advances maxLevel to level + 1', () => {
      useGameStore.getState().recordScore(1, 15000);

      const state = useGameStore.getState();
      expect(state.scores[1]).toEqual({
        last: 15000,
        best: 15000
      });
      expect(state.maxLevel).toBe(2);
    });

    it('calculates best score automatically when a faster time is achieved', () => {
      useGameStore.getState().recordScore(1, 20000);
      expect(useGameStore.getState().scores[1].best).toBe(20000);

      // Faster time (lower ms)
      useGameStore.getState().recordScore(1, 14000);
      expect(useGameStore.getState().scores[1].last).toBe(14000);
      expect(useGameStore.getState().scores[1].best).toBe(14000);

      // Slower time should not overwrite best
      useGameStore.getState().recordScore(1, 18000);
      expect(useGameStore.getState().scores[1].last).toBe(18000);
      expect(useGameStore.getState().scores[1].best).toBe(14000);
    });

    it('does not lower maxLevel when playing an earlier level', () => {
      useGameStore.getState().updateMaxLevel(5);
      useGameStore.getState().recordScore(2, 10000);

      expect(useGameStore.getState().maxLevel).toBe(5);
    });

    it('does not advance maxLevel if score is 0', () => {
      useGameStore.getState().recordScore(1, 0);
      expect(useGameStore.getState().maxLevel).toBe(1);
    });
  });

  describe('localStorage persistence', () => {
    it('persists store updates to localStorage under key "qtmhro"', () => {
      useGameStore.getState().updateCurrentLevel(3);
      useGameStore.getState().recordScore(3, 12345);
      useGameStore.getState().toggleMute();

      const raw = localStorage.getItem('qtmhro');
      expect(raw).toBeTruthy();

      const parsed = JSON.parse(raw as string);
      expect(parsed.state.currentLevel).toBe(3);
      expect(parsed.state.maxLevel).toBe(4);
      expect(parsed.state.isMuted).toBe(true);
      expect(parsed.state.scores[3]).toEqual({
        last: 12345,
        best: 12345
      });
    });

    it('migrates legacy Redux-persist format if present in localStorage', async () => {
      const legacyState = {
        game: JSON.stringify({ currentLevel: 2, maxLevel: 4 }),
        score: JSON.stringify({ 1: { last: 5000, best: 5000 } }),
        levels: null,
        isMuted: true
      };
      localStorage.setItem('qtmhro', JSON.stringify(legacyState));

      // Trigger rehydration
      await useGameStore.persist.rehydrate();

      const state = useGameStore.getState();
      expect(state.currentLevel).toBe(2);
      expect(state.maxLevel).toBe(4);
      expect(state.scores[1]).toEqual({ last: 5000, best: 5000 });
      expect(state.isMuted).toBe(true);
    });
  });

  describe('custom levels and editor actions', () => {
    it('sets custom levels via setLevels', () => {
      const mockLevels = {
        level1: { id: '1', platforms: [] }
      } as unknown as Record<string, LevelData>;
      useGameStore.getState().setLevels(mockLevels);
      expect(useGameStore.getState().customLevels).toEqual(mockLevels);
    });

    it('adds and deletes platforms in level editor', () => {
      const initialPlatforms = [{ x: 10, y: 10, width: 50, height: 10 }];
      const mockLevels = {
        level1: { id: '1', platforms: [...initialPlatforms], particles: [] }
      } as unknown as Record<string, LevelData>;
      useGameStore.getState().setLevels(mockLevels);

      // Add platform
      useGameStore.getState().addPlatform({ level: 1 });
      const currentLevel = useGameStore.getState().customLevels?.level1;
      expect(currentLevel?.platforms.length).toBe(2);

      // Delete platform
      useGameStore.getState().deletePlatform({ level: 1, n: 0 });
      expect(useGameStore.getState().customLevels?.level1.platforms.length).toBe(1);
    });

    it('adds and deletes particles in level editor', () => {
      const mockLevels = {
        level1: { id: '1', platforms: [], particles: [] }
      } as unknown as Record<string, LevelData>;
      useGameStore.getState().setLevels(mockLevels);

      // Add particle
      useGameStore.getState().addParticle({ level: 1 });
      expect(useGameStore.getState().customLevels?.level1.particles.length).toBe(1);

      // Delete particle
      useGameStore.getState().deleteParticle({ level: 1, n: 0 });
      expect(useGameStore.getState().customLevels?.level1.particles.length).toBe(0);
    });

    it('updates level fields via updateLevelField', () => {
      const mockLevels = {
        level1: {
          id: '1',
          width: 800,
          height: 600,
          hue: '#111',
          antiHue: '#222',
          player: { position: { x: 50, y: 50 } },
          door: { x: 100, y: 100 },
          platforms: [{ x: 10, y: 10, width: 50, height: 10 }],
          particles: [{ x: 20, y: 20, type: 'duplicate' }]
        }
      } as unknown as Record<string, LevelData>;
      useGameStore.getState().setLevels(mockLevels);

      // Update width and height
      useGameStore.getState().updateLevelField({ level: 1, type: 'width', value: 1200 });
      useGameStore.getState().updateLevelField({ level: 1, type: 'height', value: 900 });
      expect(useGameStore.getState().customLevels?.level1.width).toBe(1200);
      expect(useGameStore.getState().customLevels?.level1.height).toBe(900);

      // Update player
      useGameStore.getState().updateLevelField({ level: 1, type: 'player', prop: 'x', value: 75 });
      expect(useGameStore.getState().customLevels?.level1.player.position.x).toBe(75);

      // Update portal
      useGameStore.getState().updateLevelField({ level: 1, type: 'portal', prop: 'x', value: 250 });
      expect(useGameStore.getState().customLevels?.level1.door.x).toBe(250);

      // Update platform
      useGameStore
        .getState()
        .updateLevelField({ level: 1, type: 'platform', n: 0, prop: 'width', value: 80 });
      expect(useGameStore.getState().customLevels?.level1.platforms[0].width).toBe(80);

      // Update particle
      useGameStore
        .getState()
        .updateLevelField({ level: 1, type: 'particle', n: 0, prop: 'type', value: 'split' });
      expect(useGameStore.getState().customLevels?.level1.particles[0].type).toBe('split');
    });
  });
});
