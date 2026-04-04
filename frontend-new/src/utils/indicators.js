import Logger from './logger.js';

const logger = Logger;

/**
 * 技术指标计算工具类
 * 提供常用的技术指标计算方法
 */
export class Indicators {
  /**
   * 计算简单移动平均线 (SMA)
   * @param {Array<number>} data - 价格数据数组
   * @param {number} period - 周期
   * @returns {number|null} - MA值或null（数据不足时）
   */
  static calculateMA(data, period) {
    if (!Array.isArray(data) || data.length < period || period <= 0) {
      logger.debug('calculateMA: 数据不足或参数无效', { dataLength: data?.length, period });
      return null;
    }

    const sum = data.slice(-period).reduce((acc, val) => acc + val, 0);
    const ma = sum / period;

    logger.debug('计算MA', { period, ma });
    return ma;
  }

  /**
   * 判断成交量状态
   * @param {number} current - 当日成交量
   * @param {number} prev - 前一日成交量
   * @returns {string} - '放量' | '缩量' | '平稳'
   */
  static calculateVolumeStatus(current, prev) {
    if (prev === 0 || current === 0) {
      logger.debug('calculateVolumeStatus: 成交量为0', { current, prev });
      return '平稳';
    }

    const changePercent = ((current - prev) / prev) * 100;

    let status;
    if (changePercent >= 20) {
      status = '放量';
    } else if (changePercent <= -20) {
      status = '缩量';
    } else {
      status = '平稳';
    }

    logger.debug('判断成交量状态', { current, prev, changePercent, status });
    return status;
  }

  /**
   * 计算涨跌幅
   * @param {number} current - 当前价格
   * @param {number} prev - 前一日价格
   * @returns {number|null} - 涨跌幅百分比或null（前一日价格为0时）
   */
  static calculateChangePercent(current, prev) {
    if (prev === 0) {
      logger.debug('calculateChangePercent: 前一日价格为0', { current, prev });
      return null;
    }

    const changePercent = ((current - prev) / prev) * 100;
    logger.debug('计算涨跌幅', { current, prev, changePercent });
    return changePercent;
  }

  /**
   * 判断均线排列状态
   * @param {Array<Object>} quotes - K线数据数组，每个元素包含 ma5, ma10, ma20
   * @returns {string} - '多头排列' | '空头排列' | '震荡'
   */
  static calculateMAStatus(quotes) {
    if (!Array.isArray(quotes) || quotes.length === 0) {
      logger.debug('calculateMAStatus: 数据为空');
      return '震荡';
    }

    const latest = quotes[quotes.length - 1];
    const { ma5, ma10, ma20 } = latest;

    // 检查均线数据是否完整
    if (ma5 === null || ma10 === null || ma20 === null ||
        ma5 === undefined || ma10 === undefined || ma20 === undefined) {
      logger.debug('calculateMAStatus: 均线数据不完整', { ma5, ma10, ma20 });
      return '震荡';
    }

    let status;
    if (ma5 > ma10 && ma10 > ma20) {
      status = '多头排列';
    } else if (ma5 < ma10 && ma10 < ma20) {
      status = '空头排列';
    } else {
      status = '震荡';
    }

    logger.debug('判断均线排列', { ma5, ma10, ma20, status });
    return status;
  }
}
