/**
 * 多周期分析组件单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { MultiTimeframe } from '../../src/components/MultiTimeframe.js';

// Mock API
vi.mock('../../src/api/stocks.js', () => ({
  stocksApi: {
    analyze: vi.fn(() => Promise.resolve({
      stock: { code: '000001', name: '平安银行' },
      summary: {
        score: 7.5,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '多头排列', strength: 0.8 }],
        volume_signal: '放量上涨',
        wyckoff_phase: '上升'
      }
    }))
  }
}));

describe('MultiTimeframe - 数据分组', () => {
  const mockAnalysisData = [
    {
      timeframe: '30',
      summary: {
        score: 6,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '多头排列', strength: 0.7 }],
        volume_signal: '放量',
        wyckoff_phase: '上升'
      }
    },
    {
      timeframe: '60',
      summary: {
        score: 7,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '金叉', strength: 0.8 }],
        volume_signal: '放量上涨',
        wyckoff_phase: '上升'
      }
    },
    {
      timeframe: 'daily',
      summary: {
        score: 8,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '多头排列', strength: 0.9 }],
        volume_signal: '持续放量',
        wyckoff_phase: '上升'
      }
    },
    {
      timeframe: 'weekly',
      summary: {
        score: 7,
        direction: 'LONG',
        phase: 'A',
        ma_trend: [{ type: '金叉', strength: 0.7 }],
        volume_signal: '温和放量',
        wyckoff_phase: '吸筹'
      }
    },
    {
      timeframe: 'monthly',
      summary: {
        score: 6,
        direction: 'NEUTRAL',
        phase: 'A',
        ma_trend: [],
        volume_signal: '缩量',
        wyckoff_phase: '吸筹'
      }
    }
  ];

  it('应该正确按短线分组（30分、60分、日线）', () => {
    const result = MultiTimeframe.groupByTerm(mockAnalysisData, 'short');

    expect(result).toHaveLength(3);
    expect(result.every(d => ['30', '60', 'daily'].includes(d.timeframe))).toBe(true);
  });

  it('应该正确按中线分组（60分、日线、周线）', () => {
    const result = MultiTimeframe.groupByTerm(mockAnalysisData, 'mid');

    expect(result).toHaveLength(3);
    expect(result.every(d => ['60', 'daily', 'weekly'].includes(d.timeframe))).toBe(true);
  });

  it('应该正确按长线分组（日线、周线、月线）', () => {
    const result = MultiTimeframe.groupByTerm(mockAnalysisData, 'long');

    expect(result).toHaveLength(3);
    expect(result.every(d => ['daily', 'weekly', 'monthly'].includes(d.timeframe))).toBe(true);
  });

  it('应该正确处理空数据', () => {
    const result = MultiTimeframe.groupByTerm([], 'short');
    expect(result).toHaveLength(0);
  });
});

describe('MultiTimeframe - 阶段分析', () => {
  const mockPhaseData = [
    {
      timeframe: '30',
      summary: {
        score: 6,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '多头排列', strength: 0.7 }],
        volume_signal: '放量',
        wyckoff_phase: '上升'
      }
    },
    {
      timeframe: '60',
      summary: {
        score: 8,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '金叉', strength: 0.9 }],
        volume_signal: '放量上涨',
        wyckoff_phase: '上升'
      }
    },
    {
      timeframe: 'daily',
      summary: {
        score: 7,
        direction: 'LONG',
        phase: 'U',
        ma_trend: [{ type: '多头排列', strength: 0.8 }],
        volume_signal: '持续放量',
        wyckoff_phase: '上升'
      }
    }
  ];

  it('应该正确生成阶段分析', () => {
    const analysis = MultiTimeframe.generatePhaseAnalysis(mockPhaseData);

    expect(analysis).toBeDefined();
    expect(analysis.avgScore).toBeCloseTo(7, 1);
    expect(analysis.trend).toBe('上涨');
    expect(analysis.direction).toBe('LONG');
  });

  it('应该正确计算多头和空头数量', () => {
    const analysis = MultiTimeframe.generatePhaseAnalysis(mockPhaseData);

    expect(analysis.bullishCount).toBe(3);
    expect(analysis.bearishCount).toBe(0);
  });

  it('应该正确识别MA信号', () => {
    const analysis = MultiTimeframe.generatePhaseAnalysis(mockPhaseData);

    expect(analysis.maSignal).toContain('多头');
    expect(analysis.maBullish).toBeGreaterThan(0);
  });

  it('应该正确处理空数据', () => {
    const analysis = MultiTimeframe.generatePhaseAnalysis([]);

    expect(analysis.avgScore).toBe(0);
    expect(analysis.trend).toBe('中性');
    expect(analysis.direction).toBe('NEUTRAL');
    expect(analysis.suggestion).toBe('数据不足');
  });
});

describe('MultiTimeframe - 综合建议', () => {
  it('应该在三线一致看多时给出强烈做多建议', () => {
    const shortAnalysis = {
      avgScore: 7,
      direction: 'LONG',
      trend: '上涨'
    };
    const midAnalysis = {
      avgScore: 8,
      direction: 'LONG',
      trend: '上涨'
    };
    const longAnalysis = {
      avgScore: 7,
      direction: 'LONG',
      trend: '上涨'
    };

    const suggestion = MultiTimeframe.generateComprehensiveSuggestion(
      shortAnalysis,
      midAnalysis,
      longAnalysis
    );

    expect(suggestion.direction).toBe('LONG');
    expect(suggestion.strength).toBe('strong');
    expect(suggestion.text).toContain('强烈');
  });

  it('应该在信号不一致时给出谨慎建议', () => {
    const shortAnalysis = {
      avgScore: 7,
      direction: 'LONG',
      trend: '上涨'
    };
    const midAnalysis = {
      avgScore: 5,
      direction: 'NEUTRAL',
      trend: '震荡'
    };
    const longAnalysis = {
      avgScore: 4,
      direction: 'SHORT',
      trend: '下跌'
    };

    const suggestion = MultiTimeframe.generateComprehensiveSuggestion(
      shortAnalysis,
      midAnalysis,
      longAnalysis
    );

    // 一致性为0.33，平均分为5.33，应该是moderate
    expect(suggestion.strength).toBe('moderate');
    expect(suggestion.text).toContain('观望');
  });

  it('应该正确计算一致性分数', () => {
    const shortAnalysis = { direction: 'LONG', avgScore: 7 };
    const midAnalysis = { direction: 'LONG', avgScore: 8 };
    const longAnalysis = { direction: 'LONG', avgScore: 7 };

    const suggestion = MultiTimeframe.generateComprehensiveSuggestion(
      shortAnalysis,
      midAnalysis,
      longAnalysis
    );

    expect(suggestion.consistency).toBeCloseTo(1.0, 1);
  });
});

describe('MultiTimeframe - 周期名称映射', () => {
  it('应该正确映射周期名称', () => {
    expect(MultiTimeframe.getTimeframeName('30')).toBe('30分');
    expect(MultiTimeframe.getTimeframeName('60')).toBe('60分');
    expect(MultiTimeframe.getTimeframeName('daily')).toBe('日线');
    expect(MultiTimeframe.getTimeframeName('weekly')).toBe('周线');
    expect(MultiTimeframe.getTimeframeName('monthly')).toBe('月线');
  });

  it('应该处理未知周期', () => {
    expect(MultiTimeframe.getTimeframeName('unknown')).toBe('unknown');
  });
});

describe('MultiTimeframe - 趋势判断', () => {
  it('应该正确判断上涨趋势', () => {
    const analysis = {
      bullishCount: 3,
      bearishCount: 0,
      avgScore: 7
    };

    const trend = MultiTimeframe.determineTrend(analysis);
    expect(trend).toBe('上涨');
  });

  it('应该正确判断下跌趋势', () => {
    const analysis = {
      bullishCount: 0,
      bearishCount: 3,
      avgScore: 3
    };

    const trend = MultiTimeframe.determineTrend(analysis);
    expect(trend).toBe('下跌');
  });

  it('应该正确判断震荡趋势', () => {
    const analysis = {
      bullishCount: 1,
      bearishCount: 1,
      avgScore: 5
    };

    const trend = MultiTimeframe.determineTrend(analysis);
    expect(trend).toBe('震荡');
  });
});

describe('MultiTimeframe - 卡片渲染', () => {
  it('应该生成正确的阶段卡片HTML', () => {
    const analysis = {
      avgScore: 7.5,
      trend: '上涨',
      direction: 'LONG',
      maSignal: '多头排列',
      volumeSignal: '放量',
      wyckoffSignal: '上升',
      suggestion: '积极做多'
    };

    const html = MultiTimeframe.generatePhaseCardHTML(
      '⚡ 短线',
      analysis,
      '#3b82f6',
      '30分/60分/日线'
    );

    expect(html).toContain('⚡ 短线');
    expect(html).toContain('7.5');
    expect(html).toContain('上涨');
    expect(html).toContain('做多');
    expect(html).toContain('30分/60分/日线');
  });

  it('应该生成综合建议HTML', () => {
    const suggestion = {
      direction: 'LONG',
      strength: 'strong',
      text: '强烈做多信号',
      confidence: 0.85,
      consistency: 0.9,
      avgScore: 7.5
    };

    const html = MultiTimeframe.generateSuggestionHTML(suggestion);

    expect(html).toContain('强烈做多信号');
    expect(html).toContain('85%');
    expect(html).toContain('90%');
    expect(html).toContain('7.5');
  });

  it('应该生成完整的周期详情卡片HTML', () => {
    const phaseData = [
      {
        timeframe: '30',
        summary: {
          score: 6,
          direction: 'LONG',
          phase: 'U',
          wyckoff_phase: '上升'
        }
      }
    ];

    const html = MultiTimeframe.generatePhaseDetailCardsHTML(
      '⚡ 短线分析',
      phaseData
    );

    expect(html).toContain('⚡ 短线分析');
    expect(html).toContain('30分');
    expect(html).toContain('6');
    expect(html).toContain('做多');
  });

  it('应该生成空状态HTML', () => {
    const html = MultiTimeframe.generateEmptyStateHTML();

    expect(html).toContain('暂无数据');
    expect(html).toContain('请先分析股票');
  });
});

describe('MultiTimeframe - 批量分析', () => {
  it('应该正确加载多个周期数据', async () => {
    const { stocksApi } = await import('../../src/api/stocks.js');

    const timeframes = ['30', '60', 'daily'];
    const result = await MultiTimeframe.loadMultipleTimeframes('000001', timeframes);

    expect(stocksApi.analyze).toHaveBeenCalledTimes(3);
    expect(result).toBeDefined();
    expect(result.length).toBe(3);
  });

  it('应该正确处理加载错误', async () => {
    const { stocksApi } = await import('../../src/api/stocks.js');

    stocksApi.analyze.mockRejectedValueOnce(new Error('API错误'));

    // 组件会捕获错误并返回空数组
    const result = await MultiTimeframe.loadMultipleTimeframes('000001', ['30']);

    expect(result).toEqual([]);
  });
});

describe('MultiTimeframe - 颜色和样式', () => {
  it('应该正确获取趋势颜色', () => {
    expect(MultiTimeframe.getTrendColor('上涨')).toBe('var(--color-success)');
    expect(MultiTimeframe.getTrendColor('下跌')).toBe('var(--color-error)');
    expect(MultiTimeframe.getTrendColor('震荡')).toBe('var(--color-tertiary)');
  });

  it('应该正确获取方向图标', () => {
    expect(MultiTimeframe.getDirectionIcon('LONG')).toBe('📈');
    expect(MultiTimeframe.getDirectionIcon('SHORT')).toBe('📉');
    expect(MultiTimeframe.getDirectionIcon('NEUTRAL')).toBe('➡️');
  });

  it('应该正确获取评分等级', () => {
    expect(MultiTimeframe.getScoreGrade(9)).toBe('优秀');
    expect(MultiTimeframe.getScoreGrade(7)).toBe('良好');
    expect(MultiTimeframe.getScoreGrade(5)).toBe('中等');
    expect(MultiTimeframe.getScoreGrade(3)).toBe('较差');
  });

  it('应该正确获取评分等级颜色', () => {
    expect(MultiTimeframe.getScoreGradeColor(9)).toBe('var(--color-success)');
    expect(MultiTimeframe.getScoreGradeColor(7)).toBe('var(--color-primary)');
    expect(MultiTimeframe.getScoreGradeColor(5)).toBe('var(--color-warning)');
    expect(MultiTimeframe.getScoreGradeColor(3)).toBe('var(--color-error)');
  });
});
