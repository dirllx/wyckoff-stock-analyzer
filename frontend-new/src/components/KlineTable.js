/**
 * K线表格组件
 * 负责渲染股票K线数据表格
 */

import { formatDateString } from '../utils/helpers.js';
import { VirtualScroll } from './VirtualScroll.js';
import { showQuoteDetailModal } from '../utils/modal.js';
import { AppState } from '../config.js';

/**
 * 表格筛选状态
 */
const tableFilterState = {
  phase: 'all', // 'all', 'U', 'D', 'A', 'DS', '震荡'
  signal: 'all', // 'all', 'LONG', 'SHORT', 'NEUTRAL'
  search: '' // 日期搜索
};

/**
 * K线表格类
 */
export class KlineTable {
  /**
   * 格式化价格 - 与旧版本一致
   * @param {number|null} price - 价格值
   * @returns {string} 格式化后的价格
   */
  static formatPrice(price) {
    if (price == null) return '-';
    return price.toFixed(2);
  }

  /**
   * 格式化成交量 - 与旧版本一致
   * @param {number|null} volume - 成交量
   * @returns {string} 格式化后的成交量
   */
  static formatVolume(volume) {
    if (volume == null) return '-';
    const wan = Math.round(volume / 10000);
    return `${wan}万`;
  }

  /**
   * 格式化日期 - 与旧版本一致
   * @param {string} dateStr - 日期字符串
   * @param {string} timeframe - 时间周期
   * @returns {string} 格式化后的日期
   */
  static formatDate(dateStr, timeframe = 'daily') {
    return formatDateString(dateStr, timeframe);
  }

  /**
   * 格式化MA均线 - 与旧版本一致（无趋势箭头）
   * @param {number|null} ma - MA值
   * @param {number|null} prevMa - 前一期MA值
   * @returns {string} 格式化后的MA值
   */
  static formatMA(ma, prevMa = null) {
    if (ma == null) return '-';
    return ma.toFixed(2);
  }

  /**
   * 获取MA趋势类名
   * @param {number} ma - 当前MA值
   * @param {number} prevMa - 前一期MA值
   * @returns {string} 趋势类名
   */
  static getMATrendClass(ma, prevMa) {
    if (ma == null || prevMa == null) return '';
    if (ma > prevMa) return 'ma-trend-up';
    if (ma < prevMa) return 'ma-trend-down';
    return 'ma-trend-flat';
  }

  /**
   * 检测MA金叉/死叉
   * @param {number} fastMa - 快速MA值（如MA5）
   * @param {number} slowMa - 慢速MA值（如MA10）
   * @param {number} prevFastMa - 前一期快速MA值
   * @param {number} prevSlowMa - 前一期慢速MA值
   * @returns {string|null} 交叉类型 'golden' | 'death' | null
   */
  static detectMACross(fastMa, slowMa, prevFastMa, prevSlowMa) {
    if (fastMa == null || slowMa == null || prevFastMa == null || prevSlowMa == null) {
      return null;
    }

    // 金叉：快线从下向上穿过慢线
    if (prevFastMa <= prevSlowMa && fastMa > slowMa) {
      return 'golden';
    }

    // 死叉：快线从上向下穿过慢线
    if (prevFastMa >= prevSlowMa && fastMa < slowMa) {
      return 'death';
    }

    return null;
  }

  /**
   * 获取信号强度指示器（与旧版本一致）
   * @param {Object} quote - K线数据
   * @returns {string} 信号强度HTML
   */
  static getSignalStrength(quote) {
    if (!quote || quote.close == null) return '';

    const close = quote.close;
    let strength = 0;
    let tooltip = '';

    // 判断信号强度（从高到低判断）
    if (quote.ma250 != null && close > quote.ma250) {
      strength = 4;
      tooltip = '▰▰▰▰ 强势（4格）|收盘价站上250日线|长期上升趋势确立';
    } else if (quote.ma120 != null && close > quote.ma120) {
      strength = 3;
      tooltip = '▰▰▰▱ 较强（3格）|收盘价站上120日线|中期上升趋势';
    } else if (quote.ma90 != null && close > quote.ma90) {
      strength = 2;
      tooltip = '▰▰▱▱ 中等（2格）|收盘价站上90日线|短期有支撑';
    } else if (quote.ma60 != null && close > quote.ma60) {
      strength = 1;
      tooltip = '▰▱▱▱ 偏强（1格）|收盘价站上60日线|初步支撑位';
    } else {
      tooltip = '▱▱▱▱ 弱势（0格）|收盘价在60日线下方|处于下降趋势';
    }

    // 生成苹果手机信号的条形样式（缩小50%）
    const bars = [];
    const containerHeight = 8;
    const barWidth = 2;
    const gap = 1;

    for (let i = 1; i <= 4; i++) {
      const barHeight = (5 + (i * 4)) * 0.4;
      const isActive = i <= strength;
      const color = isActive ? '#10b981' : '#ffffff';
      bars.push(`<span style="display: inline-block; width: ${barWidth}px; height: ${barHeight}px; background: ${color}; border-radius: 1px; margin-right: ${gap}px; vertical-align: bottom; opacity: ${isActive ? '1' : '0.4'};"></span>`);
    }

    return `<span style="display: inline-block; cursor: help; line-height: ${containerHeight}px;" title="${tooltip}">${bars.join('')}</span>`;
  }

  /**
   * 计算MA状态（与旧版本一致）
   * @param {Object} quote - K线数据
   * @returns {Object} - { status, text, color, category }
   */
  static calculateMAStatus(quote) {
    if (!quote || !quote.ma5 || !quote.ma10 || !quote.ma20) {
      return { status: 'unknown', text: '数据不足', color: '#9ca3af', category: '未知' };
    }

    const { close, ma5, ma10, ma20 } = quote;

    // 多头排列
    if (close > ma20 && ma5 > ma10 && ma10 > ma20) {
      return { status: 'bullish_aligned', text: '📈 多头排列', color: '#10b981', category: '多头排列' };
    }
    // 空头排列
    else if (close < ma20 && ma5 < ma10 && ma10 < ma20) {
      return { status: 'bearish_aligned', text: '📉 空头排列', color: '#ef4444', category: '空头排列' };
    }
    // 金叉信号
    else if (ma5 > ma10 && ma10 < ma20) {
      return { status: 'golden_cross', text: '⭐ 金叉', color: '#fbbf24', category: '金叉' };
    }
    // 死叉信号
    else if (ma5 < ma10 && ma10 > ma20) {
      return { status: 'death_cross', text: '💀 死叉', color: '#ef4444', category: '死叉' };
    }
    // 看涨但未形成多头排列
    else if (close > ma20) {
      return { status: 'bullish', text: '看涨', color: '#10b981', category: '看涨' };
    }
    // 看跌但未形成空头排列
    else if (close < ma20) {
      return { status: 'bearish', text: '看跌', color: '#ef4444', category: '看跌' };
    }
    else {
      return { status: 'neutral', text: '中性', color: '#9ca3af', category: '中性' };
    }
  }

  /**
   * 计算量能状态（与旧版本一致）
   * @param {Object} quote - K线数据
   * @returns {Object} - { status, text, color, category, ratio }
   */
  static calculateVolumeStatus(quote) {
    if (!quote || !quote.volume || !quote.volume_ma5) {
      return { status: 'unknown', text: '数据不足', color: '#9ca3af', category: '未知', ratio: 0 };
    }

    const { volume, volume_ma5 } = quote;
    const ratio = volume / volume_ma5;

    if (ratio >= 2.0) {
      return { status: 'very_high', text: '🔥 异常放量', color: '#ef4444', category: '放量', ratio };
    } else if (ratio >= 1.2) {
      return { status: 'high', text: '📈 放量', color: '#fbbf24', category: '放量', ratio };
    } else if (ratio >= 0.8) {
      return { status: 'normal', text: '正常', color: '#9ca3af', category: '平稳', ratio };
    } else {
      return { status: 'low', text: '📉 缩量', color: '#6b7280', category: '缩量', ratio };
    }
  }

  /**
   * 计算涨跌幅（与旧版本一致）
   * @param {Object} quote - 当前K线数据
   * @param {Object} prevQuote - 前一日K线数据
   * @returns {Object} - { change, changePercent, color }
   */
  static calculateChangePercent(quote, prevQuote) {
    if (!quote || !quote.close || !prevQuote || !prevQuote.close) {
      return { change: null, changePercent: null, color: '#9ca3af' };
    }

    const change = quote.close - prevQuote.close;
    const changePercent = (change / prevQuote.close * 100);
    const color = changePercent >= 0 ? '#ef4444' : '#10b981';

    return { change, changePercent, color };
  }

  /**
   * 获取OBV能量潮详细提示（与旧版本一致）
   * @param {Object} quote - 当前K线数据
   * @param {Object} prevQuote - 前一日K线数据
   * @param {Array} allQuotes - 所有K线数据
   * @param {number} currentIndex - 当前索引
   * @returns {string} Tooltip内容
   */
  static getOBVTooltip(quote, prevQuote, allQuotes, currentIndex) {
    if (quote.obv == null) {
      return 'OBV能量潮指标||说明：|累计成交量指标|上涨日加成交量|下跌日减成交量|用于验证价格趋势';
    }

    const currentObv = quote.obv;
    const currentObvM = (currentObv / 1000000).toFixed(2);
    let tooltip = `OBV能量潮：${currentObvM}M`;

    // 如果有前一天的OBV数据，计算差异
    if (prevQuote && prevQuote.obv != null) {
      const prevObv = prevQuote.obv;
      const change = currentObv - prevObv;
      const changePercent = (change / Math.abs(prevObv) * 100).toFixed(2);
      const changeM = (change / 1000000).toFixed(2);

      let changeText = '';
      let trendText = '';

      if (change > 0) {
        changeText = `+${changeM}M (+${changePercent}%)`;
        trendText = '📈 资金流入';
      } else if (change < 0) {
        changeText = `${changeM}M (${changePercent}%)`;
        trendText = '📉 资金流出';
      } else {
        changeText = '0.00M (0.00%)';
        trendText = '➡️ 持平';
      }

      tooltip += `||较昨日：${changeText}|${trendText}`;

      // 判断OBV趋势状态
      const recentQuotes = allQuotes.slice(Math.max(0, currentIndex - 5), currentIndex + 1);
      const recentObv = recentQuotes.map(q => q.obv).filter(obv => obv != null);

      if (recentObv.length >= 3) {
        const obvTrend = recentObv[recentObv.length - 1] - recentObv[0];
        if (obvTrend > 0) {
          tooltip += '|趋势：持续流入';
        } else if (obvTrend < 0) {
          tooltip += '|趋势：持续流出';
        } else {
          tooltip += '|趋势：震荡';
        }
      }
    }

    return tooltip;
  }

  /**
   * 应用筛选条件
   * @param {Array} quotes - K线数据
   * @param {Object} signalsMap - 信号映射
   * @returns {Array} 筛选后的数据
   */
  static applyFilters(quotes, signalsMap = null) {
    // 筛选功能已移除，直接返回原数据
    return [...quotes];
  }

  /**
   * 设置筛选条件
   * @param {string} type - 筛选类型 ('phase' | 'signal' | 'search')
   * @param {string} value - 筛选值
   */
  static setFilter(type, value) {
    tableFilterState[type] = value;
  }

  /**
   * 获取当前筛选状态
   * @returns {Object} 筛选状态
   */
  static getFilterState() {
    return { ...tableFilterState };
  }

  /**
   * 重置所有筛选
   */
  static resetFilters() {
    tableFilterState.phase = 'all';
    tableFilterState.signal = 'all';
    tableFilterState.search = '';
  }

  /**
   * 生成筛选栏HTML
   * @returns {string} 筛选栏HTML
   */
  static generateFilterBarHTML() {
    const phases = [
      { value: 'all', label: '全部阶段' },
      { value: 'U', label: '上升 U' },
      { value: 'D', label: '下降 D' },
      { value: 'A', label: '吸筹 A' },
      { value: 'DS', label: '派发 DS' },
      { value: '震荡', label: '震荡' }
    ];

    const signals = [
      { value: 'all', label: '全部信号' },
      { value: 'LONG', label: '做多' },
      { value: 'SHORT', label: '做空' },
      { value: 'NEUTRAL', label: '中性' }
    ];

    return '';
  }

  /**
   * 获取威科夫阶段
   * @param {Object} quote - K线数据
   * @returns {Object} 阶段信息 {code, name, class, tooltip}
   */
  static getWyckoffPhase(quote) {
    const { close, ma5, ma10, ma20, volume, volume_ma5 } = quote;

    // 判断是否放量（成交量超过量MA5的1.3倍）
    const isHighVolume = volume_ma5 && volume && volume > volume_ma5 * 1.3;
    const volumeRatio = volume_ma5 ? (volume / volume_ma5).toFixed(1) : '-';

    // U上升阶段：均线多头排列
    if (ma20 && ma5 && ma10 && close > ma20 && ma5 > ma10 && ma10 > ma20) {
      if (isHighVolume) {
        return {
          code: 'U',
          name: '上升',
          class: 'phase-U',
          tooltip: `U上升阶段(放量)：均线多头排列。判断理由：收盘价高于MA20，且MA5>MA10>MA20呈多头排列。成交量是MA5的${volumeRatio}倍。`
        };
      }
      return {
        code: 'U',
        name: '上升',
        class: 'phase-U',
        tooltip: 'U上升阶段：均线多头排列。判断理由：收盘价高于MA20，且MA5>MA10>MA20呈多头排列。'
      };
    }

    // D下降阶段：均线空头排列
    if (ma20 && ma5 && ma10 && close < ma20 && ma5 < ma10 && ma10 < ma20) {
      if (isHighVolume) {
        return {
          code: 'D',
          name: '下降',
          class: 'phase-D',
          tooltip: `D下降阶段(放量)：均线空头排列。判断理由：收盘价低于MA20，且MA5<MA10<MA20呈空头排列。成交量是MA5的${volumeRatio}倍。`
        };
      }
      return {
        code: 'D',
        name: '下降',
        class: 'phase-D',
        tooltip: 'D下降阶段：均线空头排列。判断理由：收盘价低于MA20，且MA5<MA10<MA20呈空头排列。'
      };
    }

    // A吸筹阶段：成交量异常放大
    if (volume_ma5 && volume && volume > volume_ma5 * 1.5) {
      return {
        code: 'A',
        name: '吸筹',
        class: 'phase-A',
        tooltip: 'A吸筹阶段：成交量异常放大。判断理由：成交量超过量MA5的1.5倍，显示资金积极进场。'
      };
    }

    // DS下跌吸筹：价格回调
    if (ma5 && ma20 && close && close < ma5 && close > ma20) {
      return {
        code: 'DS',
        name: '下跌吸筹',
        class: 'phase-DS',
        tooltip: 'DS下跌吸筹：价格回调。判断理由：收盘价低于MA5但高于MA20，在上升趋势中回调。'
      };
    }

    // 默认震荡阶段
    return {
      code: '震荡',
      name: '震荡',
      class: 'phase-neutral',
      tooltip: '震荡阶段：无明显特征。判断理由：不满足上述任何阶段条件，市场处于横盘整理状态。'
    };
  }

  /**
   * 获取价格颜色类名
   * @param {Object} quote - K线数据
   * @returns {string} 颜色类名
   */
  static getPriceColorClass(quote) {
    const { open, close } = quote;
    if (open == null || close == null) return '';
    return close < open ? 'kline-red' : 'kline-green';
  }

  /**
   * 生成表头数组
   * @param {Array} quotes - K线数据数组
   * @returns {Array} 表头数组
   */
  static generateHeaders(quotes) {
    // 基础列（与旧版本完全一致）
    const headers = ['日期', '开', '高', '低', '收', '成交量', 'MA5', 'MA10'];

    // MA15 是可选列（有数据才显示）
    const hasMa15 = quotes && quotes.length > 0 && quotes.some(q => q.ma15 != null);
    if (hasMa15) headers.push('MA15');

    // MA20 是基础列（始终显示，即使数据为空）
    headers.push('MA20');

    // MA30 是可选列（有数据才显示）
    const hasMa30 = quotes && quotes.length > 0 && quotes.some(q => q.ma30 != null);
    if (hasMa30) headers.push('MA30');

    // MA60 是可选列（有数据才显示）
    const hasMa60 = quotes && quotes.length > 0 && quotes.some(q => q.ma60 != null);
    if (hasMa60) headers.push('MA60');

    // MA90 是可选列（有数据才显示）
    const hasMa90 = quotes && quotes.length > 0 && quotes.some(q => q.ma90 != null);
    if (hasMa90) headers.push('MA90');

    // MA120 是可选列（有数据才显示）
    const hasMa120 = quotes && quotes.length > 0 && quotes.some(q => q.ma120 != null);
    if (hasMa120) headers.push('MA120');

    // MA250 是可选列（有数据才显示）
    const hasMa250 = quotes && quotes.length > 0 && quotes.some(q => q.ma250 != null);
    if (hasMa250) headers.push('MA250');

    // OBV列
    const hasObv = quotes && quotes.length > 0 && quotes.some(q => q.obv != null);
    if (hasObv) headers.push('OBV');

    // 信号列
    headers.push('信号');

    // 多空线列
    const hasDuokong = quotes && quotes.length > 0 && quotes.some(q => q.duokong_line != null);
    if (hasDuokong) headers.push('多空线');

    // 涨跌幅列（新功能）
    headers.push('涨跌幅');

    // MA状态列（新功能）
    headers.push('MA状态');

    // 量能状态列（新功能）
    headers.push('量能');

    // 威科夫阶段列
    headers.push('阶段');

    return headers;
  }

  /**
   * 根据信号数据获取某日的信号显示文本（增强版：包含信号强度）
   * @param {Object} quote - K线数据
   * @param {Object} signalsMap - 按日期索引的信号映射 { '2024-01-15': signal }
   * @returns {string} 信号单元格HTML
   */
  static formatSignal(quote, signalsMap) {
    if (!signalsMap) return '-';

    const dateStr = quote.date ? quote.date.substring(0, 10) : null;
    const signal = signalsMap[dateStr];

    if (!signal) {
      // 没有信号数据时，仍然显示信号强度指示器
      const strengthIndicator = this.getSignalStrength(quote);
      return strengthIndicator || '-';
    }

    const isLong = signal.direction === 'LONG';
    const color = isLong ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
    const arrow = isLong ? '↑' : '↓';
    const label = isLong ? '多' : '空';
    const score = signal.score || '';
    const title = signal.reason || `${signal.direction} ${score}分`;

    // 添加信号强度指示器（新功能）
    const strengthIndicator = this.getSignalStrength(quote);

    return `<span style="color:${color};cursor:help;" title="${title}">${arrow}${label}${score}</span>${strengthIndicator}`;
  }

  /**
   * 将信号数组转换为按日期索引的映射
   * @param {Array} signals - 信号数组
   * @returns {Object} 按日期索引的信号映射
   */
  static buildSignalsMap(signals) {
    if (!signals || !Array.isArray(signals)) return null;

    const map = {};
    signals.forEach(signal => {
      if (signal.date) {
        const dateStr = signal.date.substring(0, 10);
        // 保留评分最高的信号
        if (!map[dateStr] || (signal.score > map[dateStr].score)) {
          map[dateStr] = signal;
        }
      }
    });

    return Object.keys(map).length > 0 ? map : null;
  }

  /**
   * 生成表格行HTML
   * @param {Object} quote - K线数据
   * @param {number} index - 数据索引
   * @param {string} timeframe - 时间周期
   * @param {Array} headers - 表头数组
   * @param {Object} signalsMap - 按日期索引的信号映射
   * @param {Array} quotes - 完整K线数据数组（用于计算趋势）
   * @returns {string} 表格行HTML
   */
  static generateRow(quote, index, timeframe, headers, signalsMap, quotes = null) {
    const priceClass = this.getPriceColorClass(quote);
    const phase = this.getWyckoffPhase(quote);

    let rowHtml = '<tr style="cursor: pointer;" data-index="' + index + '">';

    // 遍历表头生成对应的单元格
    headers.forEach(header => {
      rowHtml += '<td';

      // 根据列类型设置样式和内容
      switch (header) {
        case '日期':
          rowHtml += `>${this.formatDate(quote.date, timeframe)}</td>`;
          break;

        case '开':
        case '高':
        case '低':
          const key = header === '开' ? 'open' : header === '高' ? 'high' : 'low';
          rowHtml += `>${quote[key] != null ? quote[key].toFixed(2) : '-'}</td>`;
          break;

        case '收':
          rowHtml += ` class="${priceClass}">${quote.close != null ? quote.close.toFixed(2) : '-'}</td>`;
          break;

        case '成交量':
          rowHtml += `>${this.formatVolume(quote.volume)}</td>`;
          break;

        case 'MA5':
        case 'MA10':
        case 'MA15':
        case 'MA20':
        case 'MA30':
        case 'MA60':
        case 'MA90':
        case 'MA120':
        case 'MA250':
          const maKey = header.toLowerCase();
          // 根据旧版本的MA颜色编码（完全匹配）
          const maColors = {
            'MA5': '#3b82f6',   // 蓝色
            'MA10': '#8b5cf6',  // 紫色
            'MA15': '#f59e0b',  // 橙色
            'MA20': '#10b981',  // 绿色
            'MA30': '#10b981',  // 绿色（与MA20相同）
            'MA60': '#ec4899',  // 粉色
            'MA90': '#14b8a6',  // 青色
            'MA120': '#f97316', // 深橙色
            'MA250': '#06b6d4'  // 天蓝色
          };
          const maColor = maColors[header] || 'var(--color-primary)';
          const maValue = quote[maKey];
          rowHtml += ` style="color: ${maColor};">${maValue != null ? maValue.toFixed(2) : '-'}</td>`;
          break;

        case 'OBV':
          // 添加OBV能量潮详细提示（新功能）
          const obvTooltip = this.getOBVTooltip(quote, quotes && index > 0 ? quotes[index - 1] : null, quotes, index);
          const obvValue = quote.obv != null ? (quote.obv / 1000000).toFixed(1) + 'M' : '-';
          rowHtml += ` class="tooltip-cell" data-tooltip="${obvTooltip}">${obvValue}</td>`;
          break;

        case '信号':
          rowHtml += `>${this.formatSignal(quote, signalsMap)}</td>`;
          break;

        case '多空线':
          // 与旧版本一致：收盘价>多空线显示绿色，否则白色
          const duokongColor = quote.duokong_line != null && quote.close != null
            ? (quote.close > quote.duokong_line ? '#10b981' : '#ffffff')
            : '#6b7280';
          rowHtml += ` style="color: ${duokongColor}; font-weight: 600;">${quote.duokong_line ? quote.duokong_line.toFixed(2) : '-'}</td>`;
          break;

        case '涨跌幅':
          // 计算与前一日的变化（新功能）
          // 注意：在虚拟滚动中，quotes是reversedQuotes（反转后的），所以前一日是index+1
          if (quotes && index < quotes.length - 1) {
            const prevQuote = quotes[index + 1];
            const { changePercent, color } = this.calculateChangePercent(quote, prevQuote);
            if (changePercent != null) {
              const sign = changePercent >= 0 ? '+' : '';
              rowHtml += ` style="color: ${color}; font-weight: 600;">${sign}${changePercent.toFixed(2)}%</td>`;
            } else {
              rowHtml += '>-</td>';
            }
          } else {
            rowHtml += '>-</td>';
          }
          break;

        case 'MA状态':
          // 显示MA排列状态（新功能）
          const maStatus = this.calculateMAStatus(quote);
          rowHtml += ` style="color: ${maStatus.color}; font-size: 11px;">${maStatus.text}</td>`;
          break;

        case '量能':
          // 显示量能状态（新功能）
          const volumeStatus = this.calculateVolumeStatus(quote);
          rowHtml += ` style="color: ${volumeStatus.color}; font-size: 11px;">${volumeStatus.text}</td>`;
          break;

        case '阶段':
          // 与旧版本一致：显示"阶段"后缀
          const phaseDisplay = `<span class="phase-badge ${phase.class}" style="cursor: help;" data-tooltip="${phase.tooltip}">${phase.code}阶段</span>`;
          rowHtml += `>${phaseDisplay}</td>`;
          break;

        default:
          rowHtml += '>-</td>';
      }
    });

    rowHtml += '</tr>';
    return rowHtml;
  }

  /**
   * 生成所有表格行
   * @param {Array} quotes - K线数据数组
   * @param {string} timeframe - 时间周期
   * @param {Array} headers - 表头数组
   * @param {Object} signalsMap - 按日期索引的信号映射
   * @returns {string} 表格行HTML
   */
  static generateRows(quotes, timeframe, headers, signalsMap) {
    // 倒序并限制最大行数
    const reversedQuotes = quotes.slice().reverse().slice(0, 350);

    return reversedQuotes.map((quote, i) => {
      // 计算原始索引
      const originalIndex = quotes.length - 1 - i;
      return this.generateRow(quote, originalIndex, timeframe, headers, signalsMap, quotes);
    }).join('');
  }

  /**
   * 生成表头HTML
   * @param {Array} headers - 表头数组
   * @returns {string} 表头HTML
   */
  static generateHeaderHTML(headers) {
    let headerHtml = '<tr>';
    headers.forEach(header => {
      let titleAttr = '';

      // 添加tooltip说明（增强版）
      const tooltips = {
        'OBV': 'OBV能量潮指标|悬停查看详细资金流向',
        '信号': '信号强度指标|4格显示价格趋势强度',
        '多空线': '多空线指标|判断多空力量对比',
        '阶段': '威科夫阶段|U上升/D下降/A吸筹/DS派发',
        '涨跌幅': '涨跌幅|与前一日收盘价比较',
        'MA状态': '均线状态|多头/空头排列或金叉死叉',
        '量能': '量能状态|放量/缩量/异常放量'
      };

      if (tooltips[header]) {
        titleAttr = ` title="${tooltips[header]}"`;
      }

      headerHtml += `<th${titleAttr}>${header}</th>`;
    });
    headerHtml += '</tr>';
    return headerHtml;
  }

  /**
   * 渲染完整表格
   * @param {Array} quotes - K线数据数组
   * @param {string} timeframe - 时间周期
   * @param {Array} signals - 可选的信号数据数组
   * @returns {string} 完整表格HTML
   */
  static render(quotes, timeframe = 'daily', signals = null) {
    if (!quotes || quotes.length === 0) {
      return '<div class="table-empty">暂无数据</div>';
    }

    const signalsMap = this.buildSignalsMap(signals);

    // 应用筛选
    const filteredQuotes = this.applyFilters(quotes, signalsMap);

    // 数据量大于50时使用虚拟滚动
    if (filteredQuotes.length > 50) {
      return this.renderVirtual(filteredQuotes, timeframe, signalsMap);
    }

    const filterBarHTML = this.generateFilterBarHTML();
    const headers = this.generateHeaders(filteredQuotes);
    const headerHTML = this.generateHeaderHTML(headers);
    const rowsHTML = this.generateRows(filteredQuotes, timeframe, headers, signalsMap);

    return `
      <div class="kline-table-wrapper">
        ${filterBarHTML}
        <div class="kline-table-container" style="max-height: 600px; overflow: auto;">
          <table class="kline-table">
            <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-secondary, #1f2937);">${headerHTML}</thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * 使用虚拟滚动渲染大数据量表格
   * @param {Array} quotes - K线数据数组
   * @param {string} timeframe - 时间周期
   * @param {Object} signalsMap - 按日期索引的信号映射
   * @returns {string} 包含虚拟滚动容器的HTML
   */
  static renderVirtual(quotes, timeframe = 'daily', signalsMap = null) {
    const filterBarHTML = this.generateFilterBarHTML();
    const headers = this.generateHeaders(quotes);
    const reversedQuotes = quotes.slice().reverse().slice(0, 1000);

    return `
      <div class="kline-table-wrapper">
        ${filterBarHTML}
        <div class="kline-table-container kline-table-virtual" data-virtual="true"
             data-rows="${reversedQuotes.length}" data-timeframe="${timeframe}">
          <!-- 单一滚动区域，表头使用sticky固定 -->
          <div class="vs-scroll-area" style="height: 400px; overflow: auto;">
            <table class="kline-table" style="table-layout: auto; width: auto; min-width: 100%;">
              <thead style="position: sticky; top: 0; z-index: 10; background: var(--bg-secondary, #1f2937);">
                ${this.generateHeaderHTML(headers)}
              </thead>
              <tbody class="virtual-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初始化虚拟滚动（在DOM插入后调用）
   * @param {HTMLElement} container - 表格容器
   * @param {Array} quotes - K线数据
   * @param {string} timeframe - 时间周期
   * @param {Object} signalsMap - 按日期索引的信号映射
   * @returns {VirtualScroll|null} 虚拟滚动实例
   */
  static initVirtualScroll(container, quotes, timeframe, signalsMap = null) {
    const scrollArea = container.querySelector('.vs-scroll-area');
    if (!scrollArea) return null;

    const headers = this.generateHeaders(quotes);
    const reversedQuotes = quotes.slice().reverse().slice(0, 1000);

    const vs = new VirtualScroll(scrollArea, {
      rowHeight: 24,  // 与旧版本一致：padding 6px + font-size 12px
      bufferRows: 10,
      renderHeader: null,
      renderRow: (quote, index) => {
        return this.generateRow(quote, index, timeframe, headers, signalsMap, reversedQuotes);
      },
      onRowClick: (index, quote) => {
        // 在原始quotes中找到对应的索引
        const originalIndex = quotes.findIndex(q => q.date === quote.date);
        if (originalIndex === -1) return;

        // 获取前一根K线（在原始quotes中）
        const prevQ = originalIndex > 0 ? quotes[originalIndex - 1] : null;
        const currentTimeframe = AppState.currentStock.timeframe || 'daily';

        // 显示弹窗
        showQuoteDetailModal(quote, prevQ, currentTimeframe);
      }
    });

    vs.setData(reversedQuotes);
    return vs;
  }
}

export default KlineTable;
