/**
 * K线预测组件单元测试
 */

import { describe, it, expect } from 'vitest';
import { Prediction } from '../../src/components/Prediction.js';

describe('Prediction - MA趋势因子计算', () => {
  const mockQuotes = [
    { close: 100, ma5: 101, ma10: 102, ma20: 103, volume: 1000000 },
    { close: 102, ma5: 101.5, ma10: 102.2, ma20: 102.8, volume: 1100000 },
    { close: 103, ma5: 102, ma10: 102.4, ma20: 102.6, volume: 1050000 },
    { close: 104, ma5: 102.5, ma10: 102.6, ma20: 102.4, volume: 1200000 },
    { close: 105, ma5: 103, ma10: 102.8, ma20: 102.2, volume: 1150000 },
    { close: 106, ma5: 103.5, ma10: 103, ma20: 102, volume: 1000000 },
    { close: 107, ma5: 104, ma10: 103.2, ma20: 101.8, volume: 950000 },
    { close: 108, ma5: 104.5, ma10: 103.4, ma20: 101.6, volume: 900000 },
    { close: 109, ma5: 105, ma10: 103.6, ma20: 101.4, volume: 850000 },
    { close: 110, ma5: 105.5, ma10: 103.8, ma20: 101.2, volume: 800000 },
    { close: 111, ma5: 106, ma10: 104, ma20: 101, volume: 750000 }
  ];

  it('应该正确计算MA趋势因子', () => {
    const maTrend = Prediction.calculateMATrendFactor(mockQuotes);

    expect(maTrend).toBeDefined();
    expect(maTrend.direction).toBe('UP');
    expect(maTrend.strength).toBeGreaterThan(0);
    expect(maTrend.slope).toBeGreaterThan(0);
  });

  it('应该正确处理MA下跌趋势', () => {
    const downQuotes = mockQuotes.map((q, i) => ({
      ...q,
      ma5: 110 - i,
      ma10: 110 - i * 0.8,
      ma20: 110 - i * 0.6,
      close: 110 - i
    }));

    const maTrend = Prediction.calculateMATrendFactor(downQuotes);

    expect(maTrend.direction).toBe('DOWN');
    expect(maTrend.strength).toBeGreaterThan(0);
  });

  it('应该正确处理数据不足的情况', () => {
    const shortQuotes = mockQuotes.slice(0, 3);
    const maTrend = Prediction.calculateMATrendFactor(shortQuotes);

    expect(maTrend.direction).toBe('NEUTRAL');
    expect(maTrend.strength).toBe(0);
  });
});

describe('Prediction - 成交量趋势因子计算', () => {
  const mockQuotes = [
    { volume: 1000000, obv: 100000 },
    { volume: 1200000, obv: 120000 },
    { volume: 1500000, obv: 150000 },
    { volume: 1800000, obv: 180000 },
    { volume: 2000000, obv:200000 },
    { volume: 1900000, obv:210000 },
    { volume: 1700000, obv: 220000 },
    { volume: 1600000, obv: 230000 },
    { volume: 1400000, obv: 240000 },
    { volume: 1300000, obv: 250000 }
  ];

  it('应该正确计算成交量上升趋势', () => {
    const volTrend = Prediction.calculateVolumeTrendFactor(mockQuotes);

    expect(volTrend).toBeDefined();
    expect(volTrend.trend).toBe('UP');
    expect(volTrend.strength).toBeGreaterThan(0);
    expect(volTrend.obvTrend).toBe('UP');
  });

  it('应该正确计算成交量下降趋势', () => {
    const downQuotes = mockQuotes.map((q, i) => ({
      ...q,
      volume: 2000000 - i * 100000,
      obv: 200000 - i * 10000
    }));

    const volTrend = Prediction.calculateVolumeTrendFactor(downQuotes);

    expect(volTrend.trend).toBe('DOWN');
    expect(volTrend.obvTrend).toBe('DOWN');
  });

  it('应该正确处理数据不足的情况', () => {
    const shortQuotes = mockQuotes.slice(0, 3);
    const volTrend = Prediction.calculateVolumeTrendFactor(shortQuotes);

    expect(volTrend.trend).toBe('NEUTRAL');
    expect(volTrend.strength).toBe(0);
  });
});

describe('Prediction - 动量因子计算', () => {
  const mockQuotes = [
    { close: 100 },
    { close: 101 },
    { close: 102 },
    { close: 103 },
    { close: 104 },
    { close: 105 },
    { close: 106 },
    { close: 107 },
    { close: 108 },
    { close: 109 },
    { close: 110 },
    { close: 111 },
    { close: 112 },
    { close: 113 },
    { close: 114 }
  ];

  it('应该正确计算动量因子', () => {
    const momentum = Prediction.calculateMomentumFactor(mockQuotes);

    expect(momentum).toBeDefined();
    expect(momentum.rsi).toBeGreaterThanOrEqual(0);
    expect(momentum.rsi).toBeLessThanOrEqual(100);
    expect(momentum.changeRate).toBeGreaterThan(0);
  });

  it('应该正确识别超买状态', () => {
    const momentum = Prediction.calculateMomentumFactor(mockQuotes);

    expect(momentum.isOverbought).toBeDefined();
    expect(momentum.isOversold).toBeDefined();
  });
});

describe('Prediction - 支撑阻力因子计算', () => {
  const mockQuotes = [
    { close: 100, high: 105, low: 95 },
    { close: 102, high: 107, low: 97 },
    { close: 104, high: 109, low: 99 },
    { close: 106, high: 111, low: 101 },
    { close: 108, high: 113, low: 103 },
    { close: 110, high: 115, low: 105 },
    { close: 112, high: 117, low: 107 },
    { close: 114, high: 119, low: 109 },
    { close: 116, high: 121, low: 111 },
    { close: 118, high: 123, low: 113 },
    { close: 120, high: 125, low: 115 }
  ];

  it('应该正确计算支撑阻力因子', () => {
    const sr = Prediction.calculateSupportResistanceFactor(mockQuotes);

    expect(sr).toBeDefined();
    expect(sr.supportLevel).toBeDefined();
    expect(sr.resistanceLevel).toBeDefined();
    expect(sr.strength).toBeGreaterThanOrEqual(0);
  });
});

describe('Prediction - 威科夫阶段因子计算', () => {
  it('应该正确计算威科夫阶段因子', () => {
    const summary = {
      phase: 'U',
      score: 8
    };

    const wyckoff = Prediction.calculateWyckoffPhaseFactor(summary);

    expect(wyckoff.phase).toBe('UP');
    expect(wyckoff.strength).toBeGreaterThan(0);
  });

  it('应该正确处理下跌阶段', () => {
    const summary = {
      phase: 'D',
      score: 7
    };

    const wyckoff = Prediction.calculateWyckoffPhaseFactor(summary);

    expect(wyckoff.phase).toBe('DOWN');
  });
});

describe('Prediction - 方向预测', () => {
  it('应该正确预测上涨方向', () => {
    const factors = {
      maTrend: { direction: 'UP', strength: 0.8 },
      volumeTrend: { trend: 'UP', strength: 0.7 },
      momentum: { isOverbought: false, isOversold: true, strength: 0.6 },
      supportResistance: { supportDistance: 0.02, resistanceDistance: 0.1, strength: 0.5 },
      wyckoffPhase: { phase: 'UP', strength: 0.9 }
    };

    const direction = Prediction.calculatePredictionDirection(factors);

    expect(direction).toBe('UP');
  });

  it('应该正确预测下跌方向', () => {
    const factors = {
      maTrend: { direction: 'DOWN', strength: 0.8 },
      volumeTrend: { trend: 'DOWN', strength: 0.7 },
      momentum: { isOverbought: true, isOversold: false, strength: 0.6 },
      supportResistance: { supportDistance: 0.1, resistanceDistance: 0.02, strength: 0.5 },
      wyckoffPhase: { phase: 'DOWN', strength: 0.9 }
    };

    const direction = Prediction.calculatePredictionDirection(factors);

    expect(direction).toBe('DOWN');
  });

  it('应该正确预测横盘方向', () => {
    const factors = {
      maTrend: { direction: 'UP', strength: 0.3 },
      volumeTrend: { trend: 'DOWN', strength: 0.3 },
      momentum: { isOverbought: false, isOversold: false, strength: 0.5 },
      supportResistance: { supportDistance: 0.05, resistanceDistance: 0.05, strength: 0.3 },
      wyckoffPhase: { phase: '震荡', strength: 0.2 }
    };

    const direction = Prediction.calculatePredictionDirection(factors);

    expect(direction).toBe('SIDEWAYS');
  });
});

describe('Prediction - OHLC预测', () => {
  it('应该正确预测上涨OHLC', () => {
    const lastQuote = {
      close: 100,
      volume: 1000000
    };

    const prediction = Prediction.predictOHLC(lastQuote, 'UP', 1, {
      maTrend: 0.02,
      volumeTrend: 0.7
    }, { rsi: 60 });

    expect(prediction.open).toBeDefined();
    expect(prediction.high).toBeDefined();
    expect(prediction.low).toBeDefined();
    expect(prediction.close).toBeDefined();
    expect(prediction.volume).toBeDefined();

    // 上涨趋势中，收盘价应该接近或高于开盘价
    expect(prediction.close).toBeGreaterThanOrEqual(prediction.open * 0.95);
    expect(prediction.high).toBeGreaterThanOrEqual(prediction.close);
  });

  it('应该正确预测下跌OHLC', () => {
    const lastQuote = {
      close: 100,
      volume: 1000000
    };

    const prediction = Prediction.predictOHLC(lastQuote, 'DOWN', 1, {
      maTrend: -0.02,
      volumeTrend: 0.3
    }, { rsi: 40 });

    expect(prediction.close).toBeLessThan(prediction.open * 1.05);
    expect(prediction.low).toBeLessThanOrEqual(prediction.close);
  });
});

describe('Prediction - 置信度计算', () => {
  it('应该正确计算置信度', () => {
    const factors = {
      maTrend: { strength: 0.8 },
      volumeTrend: { strength: 0.7 },
      momentum: { strength: 0.6 },
      supportResistance: { strength: 0.5 },
      wyckoffPhase: { strength: 0.9 }
    };

    // 第1天
    const confidence1 = Prediction.calculatePredictionConfidence(factors, 1);
    expect(confidence1).toBeGreaterThan(0);
    expect(confidence1).toBeLessThanOrEqual(1);

    // 第5天应该比第1天低（衰减）
    const confidence5 = Prediction.calculatePredictionConfidence(factors, 5);
    expect(confidence5).toBeLessThan(confidence1);
  });

  it('应该正确应用衰减因子', () => {
    const factors = {
      maTrend: { strength: 0.8 },
      volumeTrend: { strength: 0.7 },
      momentum: { strength: 0.6 },
      supportResistance: { strength: 0.5 },
      wyckoffPhase: { strength: 0.9 }
    };

    const confidence1 = Prediction.calculatePredictionConfidence(factors, 1);
    const confidence2 = Prediction.calculatePredictionConfidence(factors, 2);

    // 第2天应该比第1天低约15%
    expect(Math.abs(confidence2 - confidence1 * 0.85)).toBeLessThan(0.05);
  });
});

describe('Prediction - 完整预测流程', () => {
  const mockQuotes = [
    { close: 100, ma5: 101, ma10: 102, ma20: 103, volume: 1000000, high: 105, low: 95, open: 99 },
    { close: 102, ma5: 101.5, ma10: 102.2, ma20: 102.8, volume: 1100000, high: 107, low: 97, open: 101 },
    { close: 103, ma5: 102, ma10: 102.4, ma20: 102.6, volume: 1050000, high: 109, low: 99, open: 102 },
    { close: 104, ma5: 102.5, ma10: 102.6, ma20: 102.4, volume: 1200000, high: 111, low: 101, open: 103 },
    { close: 105, ma5: 103, ma10: 102.8, ma20: 102.2, volume: 1150000, high: 113, low: 103, open: 104 },
    { close: 106, ma5: 103.5, ma10: 103, ma20: 102, volume: 1000000, high: 115, low: 105, open: 105 },
    { close: 107, ma5: 104, ma10: 103.2, ma20: 101.8, volume: 950000, high: 117, low: 105, open: 106 },
    { close: 108, ma5: 104.5, ma10: 103.4, ma20: 101.6, volume: 900000, high: 119, low: 107, open: 107 },
    { close: 109, ma5: 105, ma10: 103.6, ma20: 101.4, volume: 850000, high: 121, low: 109, open: 108 },
    { close: 110, ma5: 105.5, ma10: 103.8, ma20: 101.2, volume: 800000, high: 123, low: 111, open: 109 },
    { close: 111, ma5: 106, ma10: 104, ma20: 101, volume: 750000, high: 125, low: 111, open: 110 }
  ];

  const mockSummary = {
    phase: 'U',
    score: 7.5
  };

  it('应该生成完整的预测数据', () => {
    const predictions = Prediction.predictFutureCandles(mockQuotes, mockSummary);

    expect(predictions).toBeDefined();
    expect(predictions.length).toBe(5); // 预测5天

    // 检查第一个预测
    const firstPrediction = predictions[0];
    expect(firstPrediction.open).toBeDefined();
    expect(firstPrediction.high).toBeDefined();
    expect(firstPrediction.low).toBeDefined();
    expect(firstPrediction.close).toBeDefined();
    expect(firstPrediction.volume).toBeDefined();
    expect(firstPrediction.confidence).toBeDefined();
    expect(firstPrediction.isPredicted).toBe(true);
  });

  it('应该正确处理数据不足的情况', () => {
    const shortQuotes = mockQuotes.slice(0, 5);
    const predictions = Prediction.predictFutureCandles(shortQuotes, mockSummary);

    expect(predictions).toEqual([]);
  });
});

describe('Prediction - 辅助方法', () => {
  it('应该正确获取方向显示名称', () => {
    expect(Prediction.getDirectionDisplayName('UP')).toBe('上涨');
    expect(Prediction.getDirectionDisplayName('DOWN')).toBe('下跌');
    expect(Prediction.getDirectionDisplayName('SIDEWAYS')).toBe('横盘');
  });

  it('应该正确获取方向图标', () => {
    expect(Prediction.getDirectionIcon('UP')).toBe('📈');
    expect(Prediction.getDirectionIcon('DOWN')).toBe('📉');
    expect(Prediction.getDirectionIcon('SIDEWAYS')).toBe('➡️');
  });

  it('应该正确获取方向颜色', () => {
    expect(Prediction.getDirectionColor('UP')).toBe('var(--color-success)');
    expect(Prediction.getDirectionColor('DOWN')).toBe('var(--color-error)');
    expect(Prediction.getDirectionColor('SIDEWAYS')).toBe('var(--color-tertiary)');
  });

  it('应该正确获取置信度等级', () => {
    expect(Prediction.getConfidenceLevel(0.8)).toBe('强烈');
    expect(Prediction.getConfidenceLevel(0.6)).toBe('中等');
    expect(Prediction.getConfidenceLevel(0.4)).toBe('较弱');
    expect(Prediction.getConfidenceLevel(0.2)).toBe('低');
  });

  it('应该正确获取置信度等级颜色', () => {
    expect(Prediction.getConfidenceLevelColor('强烈')).toBe('var(--color-success)');
    expect(Prediction.getConfidenceLevelColor('中等')).toBe('var(--color-primary)');
    expect(Prediction.getConfidenceLevelColor('较弱')).toBe('var(--color-warning)');
    expect(Prediction.getConfidenceLevelColor('低')).toBe('var(--color-error)');
  });
});

describe('Prediction - 渲染功能', () => {
  it('应该生成预测卡片HTML', () => {
    const predictions = [
      {
        time: Date.now() / 1000,
        open: 100,
        high: 105,
        low: 95,
        close: 103,
        confidence: 0.75,
        direction: 'UP'
      }
    ];

    const html = Prediction.generatePredictionCardHTML(predictions);

    expect(html).toContain('prediction-card');
    expect(html).toContain('📈');
    expect(html).toContain('上涨');
    expect(html).toContain('75%');
  });

  it('应该生成空状态HTML', () => {
    const html = Prediction.generateEmptyStateHTML();

    expect(html).toContain('prediction-empty');
    expect(html).toContain('暂无预测');
  });
});
