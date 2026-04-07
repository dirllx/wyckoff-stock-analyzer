/**
 * 自选股组件单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import { Watchlist } from '../../src/components/Watchlist.js';

// Mock API
vi.mock('../../src/api/watchlist.js', () => ({
  watchlistApi: {
    getAll: vi.fn(() => Promise.resolve([
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入' },
      { stock_code: '000002', stock_name: '万科A', phase: 'D', signal: '卖出' }
    ])),
    add: vi.fn(() => Promise.resolve({ success: true })),
    remove: vi.fn(() => Promise.resolve({ success: true })),
    update: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

vi.mock('../../src/api/stocks.js', () => ({
  stocksApi: {
    batchAnalyze: vi.fn(() => Promise.resolve({ success: true })),
    analyze: vi.fn(() => Promise.resolve({}))
  }
}));

describe('Watchlist - 数据转换', () => {
  it('应该正确转换自选股数据为卡片格式', () => {
    const data = [
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入', last_update: '2024-01-15' }
    ];

    const cards = Watchlist.convertToCards(data);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      code: '000001',
      name: '平安银行',
      phase: 'U',
      signal: '买入'
    });
  });

  it('应该正确处理阶段显示名称', () => {
    const phaseName = Watchlist.getPhaseDisplayName('U');
    expect(phaseName).toBe('上升');

    const phaseName2 = Watchlist.getPhaseDisplayName('D');
    expect(phaseName2).toBe('下降');

    const phaseName3 = Watchlist.getPhaseDisplayName('A');
    expect(phaseName3).toBe('吸筹');

    const phaseName4 = Watchlist.getPhaseDisplayName('DS');
    expect(phaseName4).toBe('下跌吸筹');

    const phaseName5 = Watchlist.getPhaseDisplayName('震荡');
    expect(phaseName5).toBe('震荡');
  });

  it('应该正确获取阶段颜色', () => {
    expect(Watchlist.getPhaseColor('U')).toBe('var(--color-error)'); // 红色
    expect(Watchlist.getPhaseColor('D')).toBe('var(--color-success)'); // 绿色
    expect(Watchlist.getPhaseColor('A')).toBe('var(--color-warning)'); // 橙色
    expect(Watchlist.getPhaseColor('DS')).toBe('var(--color-info)'); // 蓝色
  });

  it('应该正确处理信号显示名称', () => {
    expect(Watchlist.getSignalDisplayName('买入')).toBe('买入');
    expect(Watchlist.getSignalDisplayName('卖出')).toBe('卖出');
    expect(Watchlist.getSignalDisplayName('持有')).toBe('持有');
    expect(Watchlist.getSignalDisplayName('观望')).toBe('观望');
  });

  it('应该正确获取信号颜色', () => {
    expect(Watchlist.getSignalColor('买入')).toBe('var(--color-error)'); // 红色
    expect(Watchlist.getSignalColor('卖出')).toBe('var(--color-success)'); // 绿色
    expect(Watchlist.getSignalColor('持有')).toBe('var(--color-warning)'); // 橙色
    expect(Watchlist.getSignalColor('观望')).toBe('var(--color-tertiary)'); // 灰色
  });
});

describe('Watchlist - 卡片渲染', () => {
  it('应该生成正确的卡片HTML', () => {
    const card = {
      code: '000001',
      name: '平安银行',
      phase: 'U',
      signal: '买入'
    };

    const html = Watchlist.generateCardHTML(card);

    expect(html).toContain('000001');
    expect(html).toContain('平安银行');
    expect(html).toContain('上升');
    expect(html).toContain('买入');
  });

  it('应该生成空状态HTML', () => {
    const html = Watchlist.generateEmptyState();

    expect(html).toContain('没有自选股');
    expect(html).toContain('输入股票代码并点击'); // 修复匹配字符串
  });

  it('应该生成完整的自选股HTML', () => {
    const data = [
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入' },
      { stock_code: '000002', stock_name: '万科A', phase: 'D', signal: '卖出' }
    ];

    const html = Watchlist.render(data);

    expect(html).toContain('watchlist-grid');
    expect(html).toContain('000001');
    expect(html).toContain('平安银行');
    expect(html).toContain('000002');
    expect(html).toContain('万科A');
  });
});

describe('Watchlist - 筛选功能', () => {
  it('应该正确筛选自选股数据', () => {
    const data = [
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入' },
      { stock_code: '000002', stock_name: '万科A', phase: 'D', signal: '卖出' },
      { stock_code: '000003', stock_name: '万科A', phase: 'U', signal: '持有' }
    ];

    // 筛选阶段为U的股票
    const filtered = Watchlist.filterByPhase(data, 'U');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].stock_code).toBe('000001');
    expect(filtered[1].stock_code).toBe('000003');
  });

  it('应该正确筛选信号', () => {
    const data = [
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入' },
      { stock_code: '000002', stock_name: '万科A', phase: 'D', signal: '卖出' },
      { stock_code: '000003', stock_name: '万科A', phase: 'U', signal: '持有' }
    ];

    // 筛选信号为买入的股票
    const filtered = Watchlist.filterBySignal(data, '买入');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].stock_code).toBe('000001');
  });

  it('应该支持搜索筛选', () => {
    const data = [
      { stock_code: '000001', stock_name: '平安银行', phase: 'U', signal: '买入' },
      { stock_code: '000002', stock_name: '万科A', phase: 'D', signal: '卖出' },
      { stock_code: '600036', stock_name: '招商银行', phase: 'U', signal: '持有' }
    ];

    // 搜索"银行"
    const filtered = Watchlist.search(data, '银行');
    expect(filtered).toHaveLength(2);
    expect(filtered[0].stock_code).toBe('000001');
    expect(filtered[1].stock_code).toBe('600036');
  });
});

describe('Watchlist - 操作功能', () => {
  it('应该正确添加股票到自选股', async () => {
    const { watchlistApi } = await import('../../src/api/watchlist.js');

    const result = await Watchlist.addToWatchlist('000001');

    expect(watchlistApi.add).toHaveBeenCalledWith('000001');
    expect(result.success).toBe(true);
  });

  it('应该正确从自选股删除', async () => {
    const { watchlistApi } = await import('../../src/api/watchlist.js');

    const result = await Watchlist.removeFromWatchlist('000001');

    expect(watchlistApi.remove).toHaveBeenCalledWith('000001');
    expect(result.success).toBe(true);
  });

  it('应该正确批量分析', async () => {
    const { stocksApi } = await import('../../src/api/stocks.js');

    const watchlistData = [
      { stock_code: '000001', stock_name: '平安银行' },
      { stock_code: '000002', stock_name: '万科A' }
    ];

    // 增加超时时间到10000ms
    await Watchlist.batchAnalyze(watchlistData);

    expect(stocksApi.batchAnalyze).toHaveBeenCalled();
  }, 10000);
});

describe('Watchlist - 刷新功能', () => {
  it('应该正确刷新自选股数据', async () => {
    const { watchlistApi } = await import('../../src/api/watchlist.js');

    const result = await Watchlist.refresh();

    expect(watchlistApi.getAll).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
