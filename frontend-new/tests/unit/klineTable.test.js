/**
 * K线表格组件单元测试
 */

import { describe, it, expect } from 'vitest';
import { KlineTable } from '../../src/components/KlineTable.js';

describe('KlineTable - 数据格式化', () => {
  it('应该正确格式化OHLC价格', () => {
    const quote = {
      open: 10.50,
      high: 11.00,
      low: 10.20,
      close: 10.80
    };

    expect(KlineTable.formatPrice(quote.open)).toBe('10.50');
    expect(KlineTable.formatPrice(quote.high)).toBe('11.00');
    expect(KlineTable.formatPrice(quote.low)).toBe('10.20');
    expect(KlineTable.formatPrice(quote.close)).toBe('10.80');
  });

  it('应该正确处理null价格', () => {
    expect(KlineTable.formatPrice(null)).toBe('-');
    expect(KlineTable.formatPrice(undefined)).toBe('-');
  });

  it('应该正确格式化成交量', () => {
    expect(KlineTable.formatVolume(1000000)).toBe('100万');
    expect(KlineTable.formatVolume(15000)).toBe('2万');
    expect(KlineTable.formatVolume(500000000)).toBe('50000万');
    expect(KlineTable.formatVolume(null)).toBe('-');
  });

  it('应该正确格式化日期', () => {
    // 日线、周线、月线只显示 MM-DD
    expect(KlineTable.formatDate('2024-01-15', 'daily')).toBe('01-15');
    expect(KlineTable.formatDate('2024-01-15', 'weekly')).toBe('01-15');
    expect(KlineTable.formatDate('2024-01-15', 'monthly')).toBe('01-15');

    // 分钟线显示 MM-DD HH:MM
    expect(KlineTable.formatDate('2024-01-15 10:30:00', '60m')).toBe('01-15 10:30');
    expect(KlineTable.formatDate('2024-01-15 14:25:00', '30m')).toBe('01-15 14:25');
  });

  it('应该正确格式化MA均线', () => {
    expect(KlineTable.formatMA(10.5234)).toBe('10.52');
    expect(KlineTable.formatMA(null)).toBe('-');
    expect(KlineTable.formatMA(undefined)).toBe('-');
  });
});

describe('KlineTable - 威科夫阶段判断', () => {
  it('应该正确识别U上升阶段', () => {
    const quote = {
      close: 11.00,
      ma20: 10.00,
      ma5: 10.80,
      ma10: 10.50
    };

    const phase = KlineTable.getWyckoffPhase(quote);
    expect(phase.code).toBe('U');
    expect(phase.name).toBe('上升');
    expect(phase.class).toBe('phase-U');
  });

  it('应该正确识别D下降阶段', () => {
    const quote = {
      close: 9.00,
      ma20: 10.00,
      ma5: 9.50,
      ma10: 9.80
    };

    const phase = KlineTable.getWyckoffPhase(quote);
    expect(phase.code).toBe('D');
    expect(phase.name).toBe('下降');
    expect(phase.class).toBe('phase-D');
  });

  it('应该正确识别A吸筹阶段', () => {
    const quote = {
      volume: 2000000,
      volume_ma5: 1000000
    };

    const phase = KlineTable.getWyckoffPhase(quote);
    expect(phase.code).toBe('A');
    expect(phase.name).toBe('吸筹');
    expect(phase.class).toBe('phase-A');
  });

  it('应该正确识别DS下跌吸筹阶段', () => {
    const quote = {
      close: 10.20,
      ma5: 10.50,
      ma20: 10.00
    };

    const phase = KlineTable.getWyckoffPhase(quote);
    expect(phase.code).toBe('DS');
    expect(phase.name).toBe('下跌吸筹');
    expect(phase.class).toBe('phase-DS');
  });

  it('应该正确识别震荡阶段', () => {
    const quote = {
      close: 10.00,
      ma5: 10.00,
      ma10: 10.00
    };

    const phase = KlineTable.getWyckoffPhase(quote);
    expect(phase.code).toBe('震荡');
    expect(phase.name).toBe('震荡');
    expect(phase.class).toBe('phase-neutral');
  });
});

describe('KlineTable - 颜色判断', () => {
  it('应该正确判断涨跌颜色', () => {
    const redQuote = { open: 10.00, close: 9.50 };
    expect(KlineTable.getPriceColorClass(redQuote)).toBe('kline-red');

    const greenQuote = { open: 10.00, close: 10.50 };
    expect(KlineTable.getPriceColorClass(greenQuote)).toBe('kline-green');
  });

  it('应该处理缺失的OHLC数据', () => {
    const invalidQuote = { open: null, close: null };
    expect(KlineTable.getPriceColorClass(invalidQuote)).toBe('');
  });
});

describe('KlineTable - 动态表头生成', () => {
  it('应该根据数据生成正确的表头', () => {
    const quotes = [
      { ma5: 10, ma10: 11, ma20: 12, ma30: null, ma60: null }
    ];

    const headers = KlineTable.generateHeaders(quotes);
    expect(headers).toContain('MA5');
    expect(headers).toContain('MA10');
    expect(headers).toContain('MA20');
    expect(headers).not.toContain('MA30');
    expect(headers).not.toContain('MA60');
  });

  it('应该包含所有基础列', () => {
    const quotes = [{ ma5: 10 }];
    const headers = KlineTable.generateHeaders(quotes);

    // 基础列（与旧版本保持一致）
    expect(headers).toContain('日期');
    expect(headers).toContain('开');
    expect(headers).toContain('高');
    expect(headers).toContain('低');
    expect(headers).toContain('收');
    expect(headers).toContain('成交量');
    expect(headers).toContain('MA5');
    expect(headers).toContain('MA10');
    // 信号列
    expect(headers).toContain('信号');
    // 威科夫阶段列
    expect(headers).toContain('阶段');
  });

  it('应该根据OBV数据动态添加列', () => {
    const quotesWithObv = [{ obv: 1000 }];
    const headersWithObv = KlineTable.generateHeaders(quotesWithObv);
    expect(headersWithObv).toContain('OBV');

    const quotesWithoutObv = [{ obv: null }];
    const headersWithoutObv = KlineTable.generateHeaders(quotesWithoutObv);
    expect(headersWithoutObv).not.toContain('OBV');
  });

  it('应该根据多空线数据动态添加列', () => {
    const quotesWithDuokong = [{ duokong_line: 10.5 }];
    const headersWithDuokong = KlineTable.generateHeaders(quotesWithDuokong);
    expect(headersWithDuokong).toContain('多空线');

    const quotesWithoutDuokong = [{ duokong_line: null }];
    const headersWithoutDuokong = KlineTable.generateHeaders(quotesWithoutDuokong);
    expect(headersWithoutDuokong).not.toContain('多空线');
  });
});

describe('KlineTable - 表格行生成', () => {
  it('应该生成正确的表格行HTML', () => {
    const quote = {
      date: '2024-01-15',
      open: 10.00,
      high: 10.50,
      low: 9.80,
      close: 10.20,
      volume: 1000000,
      ma5: 10.10,
      ma10: 10.05
    };

    const quotes = [quote];
    const headers = KlineTable.generateHeaders(quotes);
    const row = KlineTable.generateRow(quote, 0, 'daily', headers);

    expect(row).toContain('01-15'); // 日期格式为 MM-DD
    expect(row).toContain('10.00');
    expect(row).toContain('10.50');
    expect(row).toContain('9.80');
    expect(row).toContain('10.20');
    expect(row).toContain('100万');
    expect(row).toContain('10.10');
    expect(row).toContain('10.05');
  });

  it('应该限制最大行数', () => {
    // 使用150行数据（< 200行阈值），确保使用普通渲染
    const quotes = Array.from({ length: 150 }, (_, i) => ({
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: 10,
      close: 10.20
    }));

    const tableHTML = KlineTable.render(quotes, 'daily');
    const tbodyMatch = tableHTML.match(/<tbody>([\s\S]*?)<\/tbody>/);
    expect(tbodyMatch).toBeTruthy();

    const rows = tbodyMatch[1].match(/<tr/g);
    expect(rows.length).toBeLessThanOrEqual(150);
  });

  it('大数据量应启用虚拟滚动', () => {
    const quotes = Array.from({ length: 400 }, (_, i) => ({
      date: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: 10,
      close: 10.20
    }));

    const tableHTML = KlineTable.render(quotes, 'daily');
    // 虚拟滚动模式应包含 data-virtual 属性
    expect(tableHTML).toContain('data-virtual="true"');
  });
});

describe('KlineTable - 完整表格渲染', () => {
  it('应该渲染完整的表格', () => {
    const quotes = [
      {
        date: '2024-01-15',
        open: 10.00,
        high: 10.50,
        low: 9.80,
        close: 10.20,
        volume: 1000000,
        ma5: 10.10,
        ma10: 10.05,
        ma20: 10.00
      },
      {
        date: '2024-01-16',
        open: 10.20,
        high: 10.80,
        low: 10.10,
        close: 10.60,
        volume: 1500000,
        ma5: 10.30,
        ma10: 10.15,
        ma20: 10.02
      }
    ];

    const table = KlineTable.render(quotes, 'daily');
    expect(table).toContain('<table');
    expect(table).toContain('<thead>');
    expect(table).toContain('<tbody>');
    expect(table).toContain('01-15'); // 日期格式为 MM-DD
    expect(table).toContain('01-16');
  });
});
