/**
 * 图表组件单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock echarts - 必须在 import StockChart 之前
const mockChartInstance = {
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  getOption: vi.fn()
};

vi.mock('echarts', () => ({
  init: vi.fn(() => mockChartInstance),
  getInstanceByDom: vi.fn(() => null)
}));

import { StockChart } from '../../src/components/StockChart.js';

describe('StockChart - 数据转换', () => {
  it('应该正确转换K线数据为ECharts格式', () => {
    const quotes = [
      { date: '2024-01-15', open: 10.00, high: 10.50, low: 9.80, close: 10.20, volume: 1000000 },
      { date: '2024-01-16', open: 10.20, high: 10.80, low: 10.10, close: 10.60, volume: 1500000 }
    ];

    const candlestickData = StockChart.convertToCandlestickData(quotes);

    expect(candlestickData).toHaveLength(2);
    expect(candlestickData[0]).toEqual({
      name: '2024-01-15',
      value: [10.00, 10.20, 9.80, 10.50], // ECharts格式: [open, close, low, high]
      volume: 1000000
    });
  });

  it('应该正确转换MA均线数据', () => {
    const quotes = [
      { date: '2024-01-15', ma5: 10.10, ma10: 10.05, ma20: 10.00 },
      { date: '2024-01-16', ma5: 10.30, ma10: 10.15, ma20: 10.02 }
    ];

    const ma5Data = StockChart.convertToMAData(quotes, 'ma5');
    const ma10Data = StockChart.convertToMAData(quotes, 'ma10');
    const ma20Data = StockChart.convertToMAData(quotes, 'ma20');

    expect(ma5Data).toEqual([
      ['2024-01-15', 10.10],
      ['2024-01-16', 10.30]
    ]);

    expect(ma10Data).toEqual([
      ['2024-01-15', 10.05],
      ['2024-01-16', 10.15]
    ]);

    expect(ma20Data).toEqual([
      ['2024-01-15', 10.00],
      ['2024-01-16', 10.02]
    ]);
  });

  it('应该过滤掉null和undefined的MA值', () => {
    const quotes = [
      { date: '2024-01-15', ma5: 10.10, ma10: null, ma20: undefined },
      { date: '2024-01-16', ma5: null, ma10: 10.15, ma20: 10.02 }
    ];

    const ma5Data = StockChart.convertToMAData(quotes, 'ma5');
    const ma10Data = StockChart.convertToMAData(quotes, 'ma10');
    const ma20Data = StockChart.convertToMAData(quotes, 'ma20');

    expect(ma5Data).toEqual([
      ['2024-01-15', 10.10]
    ]);

    expect(ma10Data).toEqual([
      ['2024-01-16', 10.15]
    ]);

    expect(ma20Data).toEqual([
      ['2024-01-16', 10.02]
    ]);
  });

  it('应该正确转换成交量数据', () => {
    const quotes = [
      { date: '2024-01-15', close: 10.20, volume: 1000000 },
      { date: '2024-01-16', close: 10.60, volume: 1500000 },
      { date: '2024-01-17', close: 10.40, volume: 800000 }
    ];

    const volumeData = StockChart.convertToVolumeData(quotes);

    expect(volumeData).toEqual([
      ['2024-01-15', 1000000, 10.20, 0], // 第一天没有颜色
      ['2024-01-16', 1500000, 10.60, 1],  // 上涨
      ['2024-01-17', 800000, 10.40, -1]   // 下跌
    ]);
  });
});

describe('StockChart - 配置生成', () => {
  it('应该生成K线图配置', () => {
    const candlestickData = [
      { name: '2024-01-15', value: [10.00, 10.50, 9.80, 10.20] }
    ];
    const ma5Data = [['2024-01-15', 10.10]];
    const ma10Data = [['2024-01-15', 10.05]];

    const option = StockChart.generateMainChartOption(candlestickData, ma5Data, ma10Data);

    expect(option).toHaveProperty('tooltip');
    expect(option).toHaveProperty('xAxis');
    expect(option).toHaveProperty('yAxis');
    expect(option).toHaveProperty('series');
    expect(option.series).toHaveLength(3); // candlestick + ma5 + ma10
  });

  it('应该生成成交量图配置', () => {
    const volumeData = [
      ['2024-01-15', 1000000, 10.20, 1]
    ];

    const option = StockChart.generateVolumeChartOption(volumeData);

    expect(option).toHaveProperty('xAxis');
    expect(option).toHaveProperty('yAxis');
    expect(option).toHaveProperty('series');
    expect(option.series).toHaveLength(1);
    expect(option.series[0].type).toBe('bar');
  });

  it('应该使用正确的颜色配置（中国股市：红涨绿跌）', () => {
    const candlestickData = [
      { name: '2024-01-15', value: [10.00, 10.50, 9.80, 10.20] }
    ];
    const option = StockChart.generateMainChartOption(candlestickData, [], []);

    // K线图颜色
    const candlestickSeries = option.series.find(s => s.type === 'candlestick');
    expect(candlestickSeries.itemStyle).toHaveProperty('color', '#ef5350'); // 涨 - 红
    expect(candlestickSeries.itemStyle).toHaveProperty('color0', '#26a69a'); // 跌 - 绿
    expect(candlestickSeries.itemStyle).toHaveProperty('borderColor', '#ef5350');
    expect(candlestickSeries.itemStyle).toHaveProperty('borderColor0', '#26a69a');
  });
});

describe('StockChart - 图表初始化', () => {
  let mockContainer;

  beforeEach(() => {
    // 重置mock函数调用记录
    mockChartInstance.setOption.mockClear();
    mockChartInstance.resize.mockClear();
    mockChartInstance.dispose.mockClear();
    mockChartInstance.on.mockClear();
    mockChartInstance.off.mockClear();
    mockChartInstance.getOption.mockClear();

    mockContainer = {
      clientWidth: 800,
      clientHeight: 400
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('应该初始化主图', () => {
    const quotes = [
      { date: '2024-01-15', open: 10.00, high: 10.50, low: 9.80, close: 10.20, volume: 1000000, ma5: 10.10, ma10: 10.05 }
    ];

    const chart = StockChart.initMainChart(mockContainer, quotes, 'daily');

    expect(chart).toBeDefined();
    expect(chart).toBe(mockChartInstance);
    expect(mockChartInstance.setOption).toHaveBeenCalled();
  });

  it('应该初始化成交量图', () => {
    const quotes = [
      { date: '2024-01-15', open: 10.00, high: 10.50, low: 9.80, close: 10.20, volume: 1000000 }
    ];

    const chart = StockChart.initVolumeChart(mockContainer, quotes, 'daily');

    expect(chart).toBeDefined();
    expect(chart).toBe(mockChartInstance);
    expect(mockChartInstance.setOption).toHaveBeenCalled();
  });

  it('应该处理空数据', () => {
    const chart = StockChart.initMainChart(mockContainer, [], 'daily');

    expect(chart).toBeDefined();
    // 应该显示空状态
    expect(mockChartInstance.setOption).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.objectContaining({
          text: '暂无数据'
        })
      })
    );
  });
});

describe('StockChart - 图表销毁', () => {
  it('应该正确销毁图表', () => {
    const mockChart = {
      dispose: vi.fn()
    };

    StockChart.disposeChart(mockChart);

    expect(mockChart.dispose).toHaveBeenCalled();
  });

  it('应该处理null图表', () => {
    expect(() => {
      StockChart.disposeChart(null);
    }).not.toThrow();
  });
});

describe('StockChart - 图表尺寸', () => {
  it('应该正确设置图表尺寸', () => {
    const mockChart = {
      resize: vi.fn()
    };

    StockChart.resizeChart(mockChart, { width: 800, height: 400 });

    expect(mockChart.resize).toHaveBeenCalledWith({
      width: 800,
      height: 400
    });
  });
});
