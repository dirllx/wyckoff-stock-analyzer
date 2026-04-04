import { describe, it, expect } from 'vitest';
import { WyckoffAnalyzer } from '../../src/utils/wyckoff.js';

describe('WyckoffAnalyzer', () => {
  describe('calculatePhase', () => {
    it('should identify uptrend phase', () => {
      const quote = {
        close: 110,
        ma15: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.phase).toBe('U');
      expect(phase.text).toContain('上升');
      expect(phase.color).toBe('#10b981');
    });

    it('should identify downtrend phase', () => {
      const quote = {
        close: 90,
        ma15: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.phase).toBe('D');
      expect(phase.text).toContain('下降');
      expect(phase.color).toBe('#ef4444');
    });

    it('should handle missing MA', () => {
      const quote = {
        close: 100,
        volume: 1000
      };

      const phase = WyckoffAnalyzer.calculatePhase(quote);

      expect(phase.text).toContain('上升');
    });
  });

  describe('getPhaseColor', () => {
    it('should return correct colors', () => {
      expect(WyckoffAnalyzer.getPhaseColor('U')).toBe('#10b981');
      expect(WyckoffAnalyzer.getPhaseColor('D')).toBe('#ef4444');
      expect(WyckoffAnalyzer.getPhaseColor('A')).toBe('#f59e0b');
      expect(WyckoffAnalyzer.getPhaseColor('DS')).toBe('#8b5cf6');
    });
  });

  describe('getMarkerPosition', () => {
    it('should return low for uptrend phase', () => {
      const quote = {
        close: 100,
        low: 95,
        high: 105
      };

      const position = WyckoffAnalyzer.getMarkerPosition('U', quote);

      expect(position).toBe(95);
    });

    it('should return high for downtrend phase', () => {
      const quote = {
        close: 100,
        low: 95,
        high: 105
      };

      const position = WyckoffAnalyzer.getMarkerPosition('D', quote);

      expect(position).toBe(105);
    });

    it('should return close for ranging phase', () => {
      const quote = {
        close: 100,
        low: 95,
        high: 105
      };

      const position = WyckoffAnalyzer.getMarkerPosition('R', quote);

      expect(position).toBe(100);
    });

    it('should handle missing quote', () => {
      const position = WyckoffAnalyzer.getMarkerPosition('U', null);

      expect(position).toBe(0);
    });
  });

  describe('getMarkerShape', () => {
    it('should return correct shapes', () => {
      expect(WyckoffAnalyzer.getMarkerShape('U')).toBe('arrowUp');
      expect(WyckoffAnalyzer.getMarkerShape('D')).toBe('arrowDown');
      expect(WyckoffAnalyzer.getMarkerShape('A')).toBe('circle');
      expect(WyckoffAnalyzer.getMarkerShape('DS')).toBe('circle');
      expect(WyckoffAnalyzer.getMarkerShape('R')).toBe('diamond');
    });

    it('should return default circle for unknown phase', () => {
      const shape = WyckoffAnalyzer.getMarkerShape('UNKNOWN');

      expect(shape).toBe('circle');
    });
  });
});
