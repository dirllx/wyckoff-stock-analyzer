import { describe, it, expect } from 'vitest';
import { Indicators } from '../../src/utils/indicators.js';

describe('Indicators - 技术指标计算工具', () => {
  describe('calculateMA - 简单移动平均', () => {
    it('应该正确计算5日均线', () => {
      const data = [10, 12, 14, 16, 18];
      const result = Indicators.calculateMA(data, 5);
      expect(result).toBe(14);
    });

    it('应该正确计算3日均线', () => {
      const data = [10, 12, 14, 16, 18];
      const result = Indicators.calculateMA(data, 3);
      expect(result).toBe(16);
    });

    it('数据不足时应该返回null', () => {
      const data = [10, 12];
      const result = Indicators.calculateMA(data, 5);
      expect(result).toBeNull();
    });

    it('空数组应该返回null', () => {
      const result = Indicators.calculateMA([], 5);
      expect(result).toBeNull();
    });
  });

  describe('calculateVolumeStatus - 成交量状态判断', () => {
    it('应该识别放量（超过20%）', () => {
      const current = 1200;
      const prev = 1000;
      const result = Indicators.calculateVolumeStatus(current, prev);
      expect(result).toBe('放量');
    });

    it('应该识别缩量（低于20%）', () => {
      const current = 800;
      const prev = 1000;
      const result = Indicators.calculateVolumeStatus(current, prev);
      expect(result).toBe('缩量');
    });

    it('应该识别平稳（±20%以内）', () => {
      const current = 1100;
      const prev = 1000;
      const result = Indicators.calculateVolumeStatus(current, prev);
      expect(result).toBe('平稳');
    });

    it('前一日成交量为0时应该返回平稳', () => {
      const result = Indicators.calculateVolumeStatus(1000, 0);
      expect(result).toBe('平稳');
    });
  });

  describe('calculateChangePercent - 涨跌幅计算', () => {
    it('应该正确计算正涨幅', () => {
      const current = 110;
      const prev = 100;
      const result = Indicators.calculateChangePercent(current, prev);
      expect(result).toBe(10);
    });

    it('应该正确计算负涨幅', () => {
      const current = 90;
      const prev = 100;
      const result = Indicators.calculateChangePercent(current, prev);
      expect(result).toBe(-10);
    });

    it('前一日价格为0时应该返回null', () => {
      const result = Indicators.calculateChangePercent(100, 0);
      expect(result).toBeNull();
    });

    it('价格相同时应该返回0', () => {
      const result = Indicators.calculateChangePercent(100, 100);
      expect(result).toBe(0);
    });
  });

  describe('calculateMAStatus - 均线排列判断', () => {
    it('应该识别多头排列（短期 > 中期 > 长期）', () => {
      const quotes = [
        { ma5: 20, ma10: 18, ma20: 15 }
      ];
      const result = Indicators.calculateMAStatus(quotes);
      expect(result).toBe('多头排列');
    });

    it('应该识别空头排列（短期 < 中期 < 长期）', () => {
      const quotes = [
        { ma5: 15, ma10: 18, ma20: 20 }
      ];
      const result = Indicators.calculateMAStatus(quotes);
      expect(result).toBe('空头排列');
    });

    it('应该识别震荡（其他情况）', () => {
      const quotes = [
        { ma5: 18, ma10: 20, ma20: 15 }
      ];
      const result = Indicators.calculateMAStatus(quotes);
      expect(result).toBe('震荡');
    });

    it('空数组应该返回震荡', () => {
      const result = Indicators.calculateMAStatus([]);
      expect(result).toBe('震荡');
    });

    it('均线数据不完整时应该返回震荡', () => {
      const quotes = [
        { ma5: 20 }
      ];
      const result = Indicators.calculateMAStatus(quotes);
      expect(result).toBe('震荡');
    });
  });
});
