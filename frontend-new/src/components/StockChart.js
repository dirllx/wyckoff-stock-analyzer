/**
 * 股票图表组件
 * 使用ECharts渲染K线图和成交量图
 */

import * as echarts from 'echarts';
import { logger } from '../utils/logger.js';

/**
 * 股票图表类
 */
export class StockChart {
  /**
   * 转换K线数据为ECharts candlestick格式
   * @param {Array} quotes - K线数据数组
   * @returns {Array} ECharts candlestick数据
   */
  static convertToCandlestickData(quotes) {
    if (!quotes || quotes.length === 0) return [];

    return quotes.map(quote => ({
      name: quote.date,
      value: [quote.open, quote.close, quote.low, quote.high],
      volume: quote.volume
    }));
  }

  /**
   * 转换MA均线数据为ECharts line格式
   * @param {Array} quotes - K线数据数组
   * @param {string} maKey - MA字段名（如'ma5', 'ma10'）
   * @returns {Array} ECharts line数据
   */
  static convertToMAData(quotes, maKey) {
    if (!quotes || quotes.length === 0) return [];

    return quotes
      .map(quote => {
        const value = quote[maKey];
        if (value == null || value === undefined) return null;
        return [quote.date, value];
      })
      .filter(item => item !== null);
  }

  /**
   * 转换成交量数据为ECharts bar格式
   * @param {Array} quotes - K线数据数组
   * @returns {Array} ECharts bar数据
   */
  static convertToVolumeData(quotes) {
    if (!quotes || quotes.length === 0) return [];

    let prevClose = null;

    return quotes.map((quote, index) => {
      const currentClose = quote.close;
      // 判断涨跌（当前收盘价 vs 前一日收盘价）
      // 第一天没有prevClose，不计算颜色
      const color = prevClose !== null ? (currentClose >= prevClose ? 1 : -1) : 0;

      prevClose = currentClose;

      return [quote.date, quote.volume, currentClose, color];
    });
  }

  /**
   * 生成K线图配置
   * @param {Array} candlestickData - K线数据
   * @param {Array} maDataList - MA数据数组
   * @returns {Object} ECharts配置对象
   */
  static generateMainChartOption(candlestickData, ...maDataList) {
    const dates = candlestickData.map(d => d.name);

    // MA配置
    const maColors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];
    const series = [
      {
        name: 'K线',
        type: 'candlestick',
        data: candlestickData.map(d => d.value),
        itemStyle: {
          color: '#ef5350', // 涨 - 红（中国股市）
          color0: '#26a69a', // 跌 - 绿（中国股市）
          borderColor: '#ef5350',
          borderColor0: '#26a69a'
        },
        barWidth: '60%'
      }
    ];

    // 添加MA线
    maDataList.forEach((maData, index) => {
      if (maData && maData.length > 0) {
        series.push({
          name: `MA${5 * (index + 1)}`,
          type: 'line',
          data: maData,
          smooth: true,
          lineStyle: {
            opacity: 0.8,
            width: 1
          },
          itemStyle: {
            opacity: 0
          }
        });
      }
    });

    return {
      animation: false,
      legend: {
        data: series.map(s => s.name).filter(n => n),
        top: 10,
        left: 'center',
        textStyle: {
          color: '#6b7280',
          fontSize: 12
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: function (params) {
          let result = params[0].name + '<br/>';
          params.forEach(param => {
            if (param.componentSubType === 'candlestick') {
              const data = param.data;
              result += `开: ${data[1]}<br/>`;
              result += `收: ${data[2]}<br/>`;
              result += `低: ${data[3]}<br/>`;
              result += `高: ${data[4]}<br/>`;
            } else if (param.seriesName.startsWith('MA')) {
              result += `${param.seriesName}: ${param.data[1]}<br/>`;
            }
          });
          return result;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: true
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series
    };
  }

  /**
   * 生成成交量图配置
   * @param {Array} volumeData - 成交量数据
   * @returns {Object} ECharts配置对象
   */
  static generateVolumeChartOption(volumeData) {
    const dates = volumeData.map(d => d[0]);
    const volumes = volumeData.map(d => d[1]);
    const colors = volumeData.map(d => d[3] >= 0 ? '#ef5350' : '#26a69a');

    return {
      animation: false,
      grid: {
        left: '10%',
        right: '10%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: dates,
        scale: true,
        boundaryGap: false,
        axisLine: { onZero: false },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      yAxis: {
        scale: true,
        splitArea: {
          show: true
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 50,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          top: '90%',
          start: 50,
          end: 100
        }
      ],
      series: [
        {
          name: '成交量',
          type: 'bar',
          data: volumes.map((v, i) => ({
            value: v,
            itemStyle: {
              color: colors[i]
            }
          }))
        }
      ]
    };
  }

  /**
   * 初始化主图（K线图）
   * @param {HTMLElement} container - 图表容器
   * @param {Array} quotes - K线数据
   * @param {string} timeframe - 时间周期
   * @returns {Object} ECharts实例
   */
  static initMainChart(container, quotes, timeframe = 'daily') {
    if (!container) {
      logger.error('Chart container is null');
      return null;
    }

    try {
      // 销毁已有图表实例，避免内存泄漏
      const existingInstance = echarts.getInstanceByDom(container);
      if (existingInstance) {
        existingInstance.dispose();
      }

      const chart = echarts.init(container);

      if (!quotes || quotes.length === 0) {
        chart.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#9ca3af',
              fontSize: 14
            }
          }
        });
        return chart;
      }

      // 转换数据
      const candlestickData = this.convertToCandlestickData(quotes);
      const ma5Data = this.convertToMAData(quotes, 'ma5');
      const ma10Data = this.convertToMAData(quotes, 'ma10');
      const ma20Data = this.convertToMAData(quotes, 'ma20');

      // 生成配置
      const option = this.generateMainChartOption(
        candlestickData,
        ma5Data,
        ma10Data,
        ma20Data
      );

      chart.setOption(option);
      logger.info('Main chart initialized successfully');

      return chart;
    } catch (error) {
      logger.error('Failed to initialize main chart:', error);
      return null;
    }
  }

  /**
   * 初始化成交量图
   * @param {HTMLElement} container - 图表容器
   * @param {Array} quotes - K线数据
   * @param {string} timeframe - 时间周期
   * @returns {Object} ECharts实例
   */
  static initVolumeChart(container, quotes, timeframe = 'daily') {
    if (!container) {
      logger.error('Chart container is null');
      return null;
    }

    try {
      // 销毁已有图表实例，避免内存泄漏
      const existingInstance = echarts.getInstanceByDom(container);
      if (existingInstance) {
        existingInstance.dispose();
      }

      const chart = echarts.init(container);

      if (!quotes || quotes.length === 0) {
        chart.setOption({
          title: {
            text: '暂无数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#9ca3af',
              fontSize: 14
            }
          }
        });
        return chart;
      }

      // 转换数据
      const volumeData = this.convertToVolumeData(quotes);

      // 生成配置
      const option = this.generateVolumeChartOption(volumeData);

      chart.setOption(option);
      logger.info('Volume chart initialized successfully');

      return chart;
    } catch (error) {
      logger.error('Failed to initialize volume chart:', error);
      return null;
    }
  }

  /**
   * 销毁图表
   * @param {Object} chart - ECharts实例
   */
  static disposeChart(chart) {
    if (chart && typeof chart.dispose === 'function') {
      chart.dispose();
      logger.debug('Chart disposed');
    }
  }

  /**
   * 调整图表尺寸
   * @param {Object} chart - ECharts实例
   * @param {Object} size - 尺寸 {width, height}
   */
  static resizeChart(chart, size) {
    if (chart && typeof chart.resize === 'function') {
      chart.resize(size);
      logger.debug('Chart resized', size);
    }
  }
}

export default StockChart;
