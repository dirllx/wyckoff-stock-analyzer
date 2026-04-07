/**
 * 信号展示组件单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { Signals } from '../../src/components/Signals.js';

// Mock API
vi.mock('../../src/api/stocks.js', () => ({
  stocksApi: {
    getSignals: vi.fn(() => Promise.resolve([
      {
        id: 1,
        date: '2024-01-15T10:30:00',
        direction: 'LONG',
        score: 5,
        timeframe: '30',
        reason: '多条均线金叉，成交量放大'
      },
      {
        id: 2,
        date: '2024-01-15T14:00:00',
        direction: 'SHORT',
        score: 4,
        timeframe: '60',
        reason: 'MACD顶背离，价格跌破支撑位'
      },
      {
        id: 3,
        date: '2024-01-16T09:35:00',
        direction: 'NEUTRAL',
        score: 3,
        timeframe: 'daily',
        reason: '震荡整理，等待方向选择'
      }
    ]))
  }
}));

describe('Signals - 数据转换', () => {
  it('应该正确转换信号数据为卡片格式', () => {
    const data = [
      {
        id: 1,
        date: '2024-01-15T10:30:00',
        direction: 'LONG',
        score: 5,
        timeframe: '30',
        reason: '多条均线金叉，成交量放大'
      }
    ];

    const cards = Signals.convertToCards(data);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 1,
      direction: 'LONG',
      score: 5,
      timeframe: '30',
      reason: '多条均线金叉，成交量放大'
    });
    expect(cards[0]).toHaveProperty('directionName');
    expect(cards[0]).toHaveProperty('directionIcon');
    expect(cards[0]).toHaveProperty('directionColor');
    expect(cards[0]).toHaveProperty('scoreColor');
    expect(cards[0]).toHaveProperty('formattedDate');
  });

  it('应该正确处理方向显示名称', () => {
    expect(Signals.getDirectionDisplayName('LONG')).toBe('做多');
    expect(Signals.getDirectionDisplayName('SHORT')).toBe('做空');
    expect(Signals.getDirectionDisplayName('NEUTRAL')).toBe('中性');
  });

  it('应该正确处理方向图标', () => {
    expect(Signals.getDirectionIcon('LONG')).toBe('📈');
    expect(Signals.getDirectionIcon('SHORT')).toBe('📉');
    expect(Signals.getDirectionIcon('NEUTRAL')).toBe('➡️');
  });

  it('应该正确获取方向颜色', () => {
    expect(Signals.getDirectionColor('LONG')).toBe('var(--color-success)'); // 绿色
    expect(Signals.getDirectionColor('SHORT')).toBe('var(--color-error)'); // 红色
    expect(Signals.getDirectionColor('NEUTRAL')).toBe('var(--color-tertiary)'); // 灰色
  });

  it('应该正确获取评分颜色', () => {
    expect(Signals.getScoreColor(5)).toBe('var(--color-success)'); // 绿色
    expect(Signals.getScoreColor(4)).toBe('var(--color-warning)'); // 橙色
    expect(Signals.getScoreColor(3)).toBe('var(--color-tertiary)'); // 灰色
    expect(Signals.getScoreColor(2)).toBe('var(--color-tertiary)'); // 灰色
  });

  it('应该正确格式化日期（分钟线）', () => {
    const dateStr = '2024-01-15T10:30:00';
    const formatted = Signals.formatDate(dateStr, '30');
    expect(formatted).toMatch(/2024-01-15/);
    expect(formatted).toMatch(/10:30/);
  });

  it('应该正确格式化日期（日线）', () => {
    const dateStr = '2024-01-15T00:00:00';
    const formatted = Signals.formatDate(dateStr, 'daily');
    expect(formatted).toMatch(/2024-01-15/);
    expect(formatted).not.toMatch(/\d{2}:\d{2}/);
  });

  it('应该正确截断原因文本', () => {
    const longReason = '这是一个非常非常非常非常非常非常非常非常非常非常非常长的原因描述，肯定超过了六十个字符的限制，应该被截断并显示省略号，这样就可以看到截断的效果了';
    const truncated = Signals.truncateReason(longReason, 60);
    expect(Array.from(truncated).length).toBeLessThanOrEqual(63); // 60 + '...'
    expect(truncated).toContain('...');
  });

  it('不应该截断短原因文本', () => {
    const shortReason = '短原因';
    const truncated = Signals.truncateReason(shortReason, 60);
    expect(truncated).toBe(shortReason);
    expect(truncated).not.toContain('...');
  });
});

describe('Signals - 筛选功能', () => {
  const testData = [
    {
      id: 1,
      date: '2024-01-15T10:30:00',
      direction: 'LONG',
      score: 5,
      timeframe: '30',
      reason: '多条均线金叉'
    },
    {
      id: 2,
      date: '2024-01-15T14:00:00',
      direction: 'SHORT',
      score: 4,
      timeframe: '60',
      reason: 'MACD顶背离'
    },
    {
      id: 3,
      date: '2024-01-16T09:35:00',
      direction: 'NEUTRAL',
      score: 3,
      timeframe: 'daily',
      reason: '震荡整理'
    }
  ];

  it('应该正确按方向筛选', () => {
    const filtered = Signals.filterByDirection(testData, 'LONG');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].direction).toBe('LONG');
  });

  it('应该正确按评分筛选', () => {
    const filtered = Signals.filterByMinScore(testData, 4);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(s => s.score >= 4)).toBe(true);
  });

  it('应该正确按时间周期筛选', () => {
    const filtered = Signals.filterByTimeframe(testData, 'daily');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].timeframe).toBe('daily');
  });

  it('应该支持组合筛选', () => {
    let filtered = testData;
    filtered = Signals.filterByDirection(filtered, 'LONG');
    filtered = Signals.filterByMinScore(filtered, 4);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].direction).toBe('LONG');
    expect(filtered[0].score).toBeGreaterThanOrEqual(4);
  });

  it('应该支持搜索筛选', () => {
    const filtered = Signals.search(testData, 'MACD');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].reason).toContain('MACD');
  });
});

describe('Signals - 卡片渲染', () => {
  it('应该生成正确的信号卡片HTML', () => {
    const card = {
      id: 1,
      direction: 'LONG',
      directionName: '做多',
      directionIcon: '📈',
      directionColor: 'var(--color-success)',
      score: 5,
      scoreColor: 'var(--color-success)',
      timeframe: '30',
      formattedDate: '2024-01-15 10:30',
      reason: '多条均线金叉，成交量放大'
    };

    const html = Signals.generateCardHTML(card);

    expect(html).toContain('📈');
    expect(html).toContain('做多');
    expect(html).toContain('5分');
    expect(html).toContain('30');
    expect(html).toContain('2024-01-15 10:30');
    expect(html).toContain('多条均线金叉，成交量放大');
  });

  it('应该生成空状态HTML', () => {
    const html = Signals.generateEmptyState();

    expect(html).toContain('暂无信号');
    expect(html).toContain('当系统检测到交易信号时会在此显示');
  });

  it('应该生成完整的信号列表HTML', () => {
    const data = [
      {
        id: 1,
        date: '2024-01-15T10:30:00',
        direction: 'LONG',
        score: 5,
        timeframe: '30',
        reason: '多条均线金叉'
      }
    ];

    const html = Signals.render(data);

    expect(html).toContain('signals-grid');
    expect(html).toContain('📈');
    expect(html).toContain('做多');
  });

  it('应该在数据为空时显示空状态', () => {
    const html = Signals.render([]);
    expect(html).toContain('signals-empty');
  });
});

describe('Signals - 排序功能', () => {
  const testData = [
    { id: 1, date: '2024-01-15T10:30:00', score: 3 },
    { id: 2, date: '2024-01-16T10:30:00', score: 5 },
    { id: 3, date: '2024-01-14T10:30:00', score: 4 }
  ];

  it('应该按日期降序排序（最新的在前）', () => {
    const sorted = Signals.sortByDate(testData, 'desc');
    expect(sorted[0].id).toBe(2);
    expect(sorted[2].id).toBe(3);
  });

  it('应该按日期升序排序（最早的在前）', () => {
    const sorted = Signals.sortByDate(testData, 'asc');
    expect(sorted[0].id).toBe(3);
    expect(sorted[2].id).toBe(2);
  });

  it('应该按评分降序排序（最高的在前）', () => {
    const sorted = Signals.sortByScore(testData, 'desc');
    expect(sorted[0].id).toBe(2);
    expect(sorted[0].score).toBe(5);
    expect(sorted[2].id).toBe(1);
    expect(sorted[2].score).toBe(3);
  });

  it('应该按评分升序排序（最低的在前）', () => {
    const sorted = Signals.sortByScore(testData, 'asc');
    expect(sorted[0].id).toBe(1);
    expect(sorted[0].score).toBe(3);
    expect(sorted[2].id).toBe(2);
    expect(sorted[2].score).toBe(5);
  });
});

describe('Signals - 加载功能', () => {
  it('应该正确加载信号数据', async () => {
    const { stocksApi } = await import('../../src/api/stocks.js');

    const result = await Signals.loadSignals('000001');

    expect(stocksApi.getSignals).toHaveBeenCalledWith('000001');
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Signals - 统计功能', () => {
  const testData = [
    { direction: 'LONG', score: 5 },
    { direction: 'LONG', score: 4 },
    { direction: 'SHORT', score: 3 },
    { direction: 'NEUTRAL', score: 3 }
  ];

  it('应该正确统计信号数量', () => {
    const stats = Signals.getStatistics(testData);

    expect(stats.total).toBe(4);
    expect(stats.longCount).toBe(2);
    expect(stats.shortCount).toBe(1);
    expect(stats.neutralCount).toBe(1);
  });

  it('应该正确计算平均评分', () => {
    const stats = Signals.getStatistics(testData);

    expect(stats.averageScore).toBeCloseTo(3.75, 1);
  });

  it('应该正确找出最高评分', () => {
    const stats = Signals.getStatistics(testData);

    expect(stats.maxScore).toBe(5);
  });

  it('应该正确找出最低评分', () => {
    const stats = Signals.getStatistics(testData);

    expect(stats.minScore).toBe(3);
  });
});
