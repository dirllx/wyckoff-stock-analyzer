/**
 * K线表格组件
 * 负责渲染股票K线数据表格
 */

import { WyckoffAnalyzer } from '../utils/wyckoff.js';
import { formatDateString, formatNumber } from '../utils/helpers.js';

/**
 * K线表格类
 */
export class KlineTable {
  /**
   * 格式化价格
   * @param {number|null} price - 价格值
   * @returns {string} 格式化后的价格
   */
  static formatPrice(price) {
    if (price == null) return '-';
    return formatNumber(price, 2);
  }

  /**
   * 格式化成交量
   * @param {number|null} volume - 成交量
   * @returns {string} 格式化后的成交量
   */
  static formatVolume(volume) {
    if (volume == null) return '-';

    const wan = Math.round(volume / 10000);
    return `${wan}万`;
  }

  /**
   * 格式化日期
   * @param {string} dateStr - 日期字符串
   * @param {string} timeframe - 时间周期
   * @returns {string} 格式化后的日期
   */
  static formatDate(dateStr, timeframe = 'daily') {
    return formatDateString(dateStr, timeframe);
  }

  /**
   * 格式化MA均线
   * @param {number|null} ma - MA值
   * @returns {string} 格式化后的MA值
   */
  static formatMA(ma) {
    if (ma == null) return '-';
    return formatNumber(ma, 2);
  }

  /**
   * 获取威科夫阶段
   * @param {Object} quote - K线数据
   * @returns {Object} 阶段信息 {code, name, class, tooltip}
   */
  static getWyckoffPhase(quote) {
    const { close, ma5, ma10, ma20, volume, volume_ma5 } = quote;

    // U上升阶段：均线多头排列
    if (ma20 && ma5 && ma10 && close > ma20 && ma5 > ma10 && ma10 > ma20) {
      return {
        code: 'U',
        name: '上升',
        class: 'phase-U',
        tooltip: 'U上升阶段：均线多头排列。判断理由：收盘价高于MA20，且MA5>MA10>MA20呈多头排列。'
      };
    }

    // D下降阶段：均线空头排列
    if (ma20 && ma5 && ma10 && close < ma20 && ma5 < ma10 && ma10 < ma20) {
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
    const headers = ['日期', '开', '高', '低', '收', '成交量', 'MA5', 'MA10'];

    // 检查可选的MA列
    const optionalMA = [15, 20, 30, 60, 90, 120, 250];
    optionalMA.forEach(period => {
      const hasData = quotes.some(q => q[`ma${period}`] != null);
      if (hasData) {
        headers.push(`MA${period}`);
      }
    });

    // OBV列
    const hasObv = quotes.some(q => q.obv != null);
    if (hasObv) headers.push('OBV');

    // 信号列（始终显示）
    headers.push('信号');

    // 多空线列
    const hasDuokong = quotes.some(q => q.duokong_line != null);
    if (hasDuokong) headers.push('多空线');

    // 威科夫阶段列（始终显示）
    headers.push('阶段');

    return headers;
  }

  /**
   * 生成表格行HTML
   * @param {Object} quote - K线数据
   * @param {number} index - 数据索引
   * @param {string} timeframe - 时间周期
   * @param {Array} headers - 表头数组
   * @returns {string} 表格行HTML
   */
  static generateRow(quote, index, timeframe, headers) {
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
          rowHtml += `>${this.formatPrice(quote[key])}</td>`;
          break;

        case '收':
          rowHtml += ` class="${priceClass}">${this.formatPrice(quote.close)}</td>`;
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
          rowHtml += ' style="color: var(--color-primary);">' + this.formatMA(quote[maKey]) + '</td>';
          break;

        case 'OBV':
          rowHtml += `>${quote.obv != null ? quote.obv.toFixed(0) : '-'}</td>`;
          break;

        case '信号':
          // TODO: 实现信号计算逻辑
          rowHtml += '>-</td>';
          break;

        case '多空线':
          rowHtml += `>${quote.duokong_line != null ? quote.duokong_line.toFixed(2) : '-'}</td>`;
          break;

        case '阶段':
          rowHtml += ` class="${phase.class}" title="${phase.tooltip}">${phase.code}</td>`;
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
   * @returns {string} 表格行HTML
   */
  static generateRows(quotes, timeframe, headers) {
    // 倒序并限制最大行数
    const reversedQuotes = quotes.slice().reverse().slice(0, 350);

    return reversedQuotes.map((quote, i) => {
      // 计算原始索引
      const originalIndex = quotes.length - 1 - i;
      return this.generateRow(quote, originalIndex, timeframe, headers);
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
      if (header === 'OBV') titleAttr = ' title="OBV能量潮指标"';
      if (header === '信号') titleAttr = ' title="信号强度指标"';
      if (header === '多空线') titleAttr = ' title="多空线指标"';
      if (header === '阶段') titleAttr = ' title="威科夫阶段"';

      headerHtml += `<th style="cursor: help;"${titleAttr}>${header}</th>`;
    });
    headerHtml += '</tr>';
    return headerHtml;
  }

  /**
   * 渲染完整表格
   * @param {Array} quotes - K线数据数组
   * @param {string} timeframe - 时间周期
   * @returns {string} 完整表格HTML
   */
  static render(quotes, timeframe = 'daily') {
    if (!quotes || quotes.length === 0) {
      return '<div class="table-empty">暂无数据</div>';
    }

    const headers = this.generateHeaders(quotes);
    const headerHTML = this.generateHeaderHTML(headers);
    const rowsHTML = this.generateRows(quotes, timeframe, headers);

    return `
      <div class="kline-table-container">
        <table class="kline-table">
          <thead>${headerHTML}</thead>
          <tbody>${rowsHTML}</tbody>
        </table>
      </div>
    `;
  }
}

export default KlineTable;
