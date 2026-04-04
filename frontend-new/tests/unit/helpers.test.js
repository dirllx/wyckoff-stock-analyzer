import { describe, it, expect } from 'vitest';
import {
  formatDateString,
  deduplicateQuotes,
  formatNumber,
  formatPercent,
  getStockType,
  getColorByValue
} from '../../src/utils/helpers.js';

describe('Helper Utilities', () => {
  describe('formatDateString', () => {
    it('should format daily date string correctly', () => {
      const result = formatDateString('2024-01-15', 'day');
      expect(result).toBe('2024-01-15');
    });

    it('should format weekly date string correctly', () => {
      const result = formatDateString('2024-01-15', 'week');
      expect(result).toBe('2024-W03');
    });

    it('should format monthly date string correctly', () => {
      const result = formatDateString('2024-01-15', 'month');
      expect(result).toBe('2024-01');
    });

    it('should handle invalid date string', () => {
      const result = formatDateString('invalid', 'day');
      expect(result).toBe('invalid');
    });

    it('should handle date-only string without time', () => {
      const result = formatDateString('2024-01-15', 'day');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('deduplicateQuotes', () => {
    it('should remove duplicate quotes for daily timeframe', () => {
      const quotes = [
        { date: '2024-01-15 09:30:00', close: 100 },
        { date: '2024-01-15 10:30:00', close: 101 },
        { date: '2024-01-15 11:30:00', close: 102 }
      ];
      const result = deduplicateQuotes(quotes, 'day');
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024-01-15');
      expect(result[0].close).toBe(102);
    });

    it('should remove duplicate quotes for weekly timeframe', () => {
      const quotes = [
        { date: '2024-01-15', close: 100 },
        { date: '2024-01-16', close: 101 },
        { date: '2024-01-17', close: 102 }
      ];
      const result = deduplicateQuotes(quotes, 'week');
      expect(result).toHaveLength(1);
      expect(result[0].close).toBe(102);
    });

    it('should remove duplicate quotes for monthly timeframe', () => {
      const quotes = [
        { date: '2024-01-01', close: 100 },
        { date: '2024-01-15', close: 101 },
        { date: '2024-01-20', close: 102 }
      ];
      const result = deduplicateQuotes(quotes, 'month');
      expect(result).toHaveLength(1);
      expect(result[0].close).toBe(102);
    });

    it('should keep different dates for daily timeframe', () => {
      const quotes = [
        { date: '2024-01-15', close: 100 },
        { date: '2024-01-16', close: 101 },
        { date: '2024-01-17', close: 102 }
      ];
      const result = deduplicateQuotes(quotes, 'day');
      expect(result).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const result = deduplicateQuotes([], 'day');
      expect(result).toHaveLength(0);
    });

    it('should preserve all quote properties', () => {
      const quotes = [
        { date: '2024-01-15 09:30:00', open: 99, high: 103, low: 98, close: 100, volume: 1000 },
        { date: '2024-01-15 10:30:00', open: 100, high: 104, low: 99, close: 102, volume: 1500 }
      ];
      const result = deduplicateQuotes(quotes, 'day');
      expect(result[0]).toHaveProperty('open');
      expect(result[0]).toHaveProperty('high');
      expect(result[0]).toHaveProperty('low');
      expect(result[0]).toHaveProperty('close');
      expect(result[0]).toHaveProperty('volume');
    });
  });

  describe('formatNumber', () => {
    it('should format number with default decimals', () => {
      const result = formatNumber(1234.5678);
      expect(result).toBe('1,234.57');
    });

    it('should format number with custom decimals', () => {
      const result = formatNumber(1234.5678, 3);
      expect(result).toBe('1,234.568');
    });

    it('should format number with zero decimals', () => {
      const result = formatNumber(1234.5678, 0);
      expect(result).toBe('1,235');
    });

    it('should format small numbers', () => {
      const result = formatNumber(0.1234, 4);
      expect(result).toBe('0.1234');
    });

    it('should format large numbers', () => {
      const result = formatNumber(1234567.89);
      expect(result).toBe('1,234,567.89');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234.56);
      expect(result).toBe('-1,234.56');
    });

    it('should handle zero', () => {
      const result = formatNumber(0);
      expect(result).toBe('0.00');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percentage', () => {
      const result = formatPercent(0.1234);
      expect(result).toBe('+12.34%');
    });

    it('should format negative percentage', () => {
      const result = formatPercent(-0.1234);
      expect(result).toBe('-12.34%');
    });

    it('should format zero percentage', () => {
      const result = formatPercent(0);
      expect(result).toBe('0.00%');
    });

    it('should format with custom decimals', () => {
      const result = formatPercent(0.1234, 1);
      expect(result).toBe('+12.3%');
    });

    it('should handle small values', () => {
      const result = formatPercent(0.001);
      expect(result).toBe('+0.10%');
    });

    it('should handle large values', () => {
      const result = formatPercent(1.5);
      expect(result).toBe('+150.00%');
    });
  });

  describe('getStockType', () => {
    it('should identify A-share stock', () => {
      expect(getStockType('600000')).toBe('A股');
      expect(getStockType('000002')).toBe('A股'); // Changed from 000001 (which is an index)
      expect(getStockType('002001')).toBe('A股');
      expect(getStockType('300001')).toBe('创业板');
    });

    it('should identify Hong Kong stock', () => {
      expect(getStockType('00700')).toBe('港股');
      expect(getStockType('09988')).toBe('港股');
    });

    it('should identify US stock', () => {
      expect(getStockType('AAPL')).toBe('美股');
      expect(getStockType('TSLA')).toBe('美股');
    });

    it('should identify index', () => {
      expect(getStockType('000001')).toBe('指数'); // 上证指数
      expect(getStockType('399001')).toBe('指数'); // 深证成指
    });

    it('should return unknown for unrecognized format', () => {
      expect(getStockType('12345')).toBe('未知');
    });

    it('should handle case sensitivity for US stocks', () => {
      expect(getStockType('aapl')).toBe('美股');
      expect(getStockType('Aapl')).toBe('美股');
    });
  });

  describe('getColorByValue', () => {
    it('should return red for positive values (China market convention)', () => {
      const result = getColorByValue(0.05, 'change');
      expect(result).toBe('#ef5350');
    });

    it('should return green for negative values (China market convention)', () => {
      const result = getColorByValue(-0.05, 'change');
      expect(result).toBe('#26a69a');
    });

    it('should return neutral for zero', () => {
      const result = getColorByValue(0, 'change');
      expect(result).toBe('#78909c');
    });

    it('should handle volume type colors', () => {
      const result = getColorByValue(1000000, 'volume');
      expect(result).toBe('#42a5f5');
    });

    it('should handle MA type colors', () => {
      const result = getColorByValue(5, 'ma');
      expect(result).toBe('#ffa726');
    });

    it('should return default color for unknown type', () => {
      const result = getColorByValue(0.05, 'unknown');
      expect(result).toBe('#78909c');
    });

    it('should handle very small positive values', () => {
      const result = getColorByValue(0.0001, 'change');
      expect(result).toBe('#ef5350');
    });

    it('should handle very small negative values', () => {
      const result = getColorByValue(-0.0001, 'change');
      expect(result).toBe('#26a69a');
    });
  });
});
