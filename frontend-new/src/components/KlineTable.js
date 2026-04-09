/**
 * K线表格组件
 * 负责渲染股票K线数据表格
 */

import { WyckoffAnalyzer } from '../utils/wyckoff.js';
import { formatDateString, formatNumber } from '../utils/helpers.js';
import { VirtualScroll } from './VirtualScroll.js';
import { calculateMAStatus, calculateVolumeStatus, getSignalStrength, formatChangePercent } from '../utils/enhancedFormatting.js';

/**
 * 表格排序状态
 */
const tableSortState = {
  column: null,
  direction: 'desc' // 'asc' or 'desc'
};

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
   * @param {number|null} prevMa - 前一期MA值
   * @returns {string} 格式化后的MA值（带趋势指示）
   */
  static formatMA(ma, prevMa = null) {
    if (ma == null) return '-';

    const formatted = formatNumber(ma, 2);

    // 如果有前期数据，添加趋势指示
    if (prevMa != null) {
      if (ma > prevMa) {
        return `<span class="ma-trend ma-bullish">${formatted} ↑</span>`;
      } else if (ma < prevMa) {
        return `<span class="ma-trend ma-bearish">${formatted} ↓</span>`;
      }
    }

    return formatted;
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
   * 处理表头点击排序
   * @param {string} column - 列名
   * @param {Array} quotes - K线数据
   * @returns {Array} 排序后的数据
   */
  static handleSort(column, quotes) {
    // 切换排序方向
    if (tableSortState.column === column) {
      tableSortState.direction = tableSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      tableSortState.column = column;
      tableSortState.direction = 'desc'; // 默认降序
    }

    const { direction } = tableSortState;
    const multiplier = direction === 'asc' ? 1 : -1;

    // 创建排序后的数据副本
    const sortedQuotes = [...quotes];

    switch (column) {
      case '日期':
        sortedQuotes.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return (dateA - dateB) * multiplier;
        });
        break;

      case '开':
      case '高':
      case '低':
      case '收':
        const key = column === '开' ? 'open' : column === '高' ? 'high' : column === '低' ? 'low' : 'close';
        sortedQuotes.sort((a, b) => {
          const valA = a[key] || 0;
          const valB = b[key] || 0;
          return (valA - valB) * multiplier;
        });
        break;

      case '成交量':
        sortedQuotes.sort((a, b) => {
          const volA = a.volume || 0;
          const volB = b.volume || 0;
          return (volA - volB) * multiplier;
        });
        break;

      case '涨跌幅':
        sortedQuotes.sort((a, b) => {
          const changeA = a.close && a.open ? ((a.close - a.open) / a.open) : 0;
          const changeB = b.close && b.open ? ((b.close - b.open) / b.open) : 0;
          return (changeA - changeB) * multiplier;
        });
        break;

      default:
        // MA列排序
        if (column.startsWith('MA')) {
          const maKey = column.toLowerCase();
          sortedQuotes.sort((a, b) => {
            const maA = a[maKey] || 0;
            const maB = b[maKey] || 0;
            return (maA - maB) * multiplier;
          });
        }
    }

    return sortedQuotes;
  }

  /**
   * 获取排序图标
   * @param {string} column - 列名
   * @returns {string} 排序图标HTML
   */
  static getSortIcon(column) {
    if (tableSortState.column !== column) {
      return '<span class="sort-icon">⇅</span>';
    }
    return tableSortState.direction === 'asc'
      ? '<span class="sort-icon sort-asc">↑</span>'
      : '<span class="sort-icon sort-desc">↓</span>';
  }

  /**
   * 应用筛选条件
   * @param {Array} quotes - K线数据
   * @param {Object} signalsMap - 信号映射
   * @returns {Array} 筛选后的数据
   */
  static applyFilters(quotes, signalsMap = null) {
    let filtered = [...quotes];

    // 按阶段筛选
    if (tableFilterState.phase !== 'all') {
      filtered = filtered.filter(quote => {
        const phase = this.getWyckoffPhase(quote);
        return phase.code === tableFilterState.phase;
      });
    }

    // 按信号筛选
    if (tableFilterState.signal !== 'all' && signalsMap) {
      filtered = filtered.filter(quote => {
        const dateStr = quote.date ? quote.date.substring(0, 10) : null;
        if (!dateStr || !signalsMap[dateStr]) return false;
        return signalsMap[dateStr].direction === tableFilterState.signal;
      });
    }

    // 按日期搜索
    if (tableFilterState.search) {
      const searchTerm = tableFilterState.search.toLowerCase();
      filtered = filtered.filter(quote => {
        const dateStr = quote.date || '';
        return dateStr.toLowerCase().includes(searchTerm);
      });
    }

    return filtered;
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

    return `
      <div class="kline-filter-bar">
        <div class="filter-group">
          <label class="filter-label">阶段筛选:</label>
          <select class="filter-select" data-filter-type="phase">
            ${phases.map(p => `<option value="${p.value}" ${tableFilterState.phase === p.value ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">信号筛选:</label>
          <select class="filter-select" data-filter-type="signal">
            ${signals.map(s => `<option value="${s.value}" ${tableFilterState.signal === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">日期搜索:</label>
          <input type="text" class="filter-input" data-filter-type="search" placeholder="输入日期..." value="${tableFilterState.search}">
        </div>
        <button class="filter-btn filter-btn-reset" data-action="reset">重置</button>
        <div class="filter-stats">
          共 <span class="filter-count">0</span> 条数据
        </div>
      </div>
    `;
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
    const headers = ['日期', '开', '高', '低', '收', '涨跌幅', '信号强度', '成交量', 'MA5', 'MA10'];

    // 检查可选的MA列
    const optionalMA = [15, 20, 30, 60, 90, 120, 250];
    optionalMA.forEach(period => {
      const hasData = quotes.some(q => q[`ma${period}`] != null);
      if (hasData) {
        headers.push(`MA${period}`);
      }
    });

    // MA状态列（始终显示）
    headers.push('MA状态');

    // 量能状态列（始终显示）
    headers.push('量能');

    // OBV列
    const hasObv = quotes.some(q => q.obv != null);
    if (hasObv) headers.push('OBV');

    // 多空线列
    const hasDuokong = quotes.some(q => q.duokong_line != null);
    if (hasDuokong) headers.push('多空线');

    // 威科夫阶段列（始终显示）
    headers.push('阶段');

    // 信号方向列
    headers.push('方向');

    return headers;
  }

  /**
   * 根据信号数据获取某日的信号显示文本
   * @param {Object} quote - K线数据
   * @param {Object} signalsMap - 按日期索引的信号映射 { '2024-01-15': signal }
   * @returns {string} 信号单元格HTML
   */
  static formatSignal(quote, signalsMap) {
    if (!signalsMap) return '-';

    const dateStr = quote.date ? quote.date.substring(0, 10) : null;
    const signal = signalsMap[dateStr];

    if (!signal) return '-';

    const isLong = signal.direction === 'LONG';
    const color = isLong ? 'var(--color-success, #10b981)' : 'var(--color-error, #ef4444)';
    const arrow = isLong ? '↑' : '↓';
    const label = isLong ? '多' : '空';
    const score = signal.score || '';
    const title = signal.reason || `${signal.direction} ${score}分`;

    return `<span style="color:${color};cursor:help;" title="${title}">${arrow}${label}${score}</span>`;
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
          rowHtml += `>${this.formatPrice(quote[key])}</td>`;
          break;

        case '收':
          rowHtml += ` class="${priceClass}">${this.formatPrice(quote.close)}</td>`;
          break;

        case '涨跌幅':
          const changePercent = quote.change_percent || 0;
          const changeData = formatChangePercent(changePercent);
          rowHtml += ` style="color: ${changeData.color}; font-weight: 600;">${changeData.arrow} ${changeData.text}</td>`;
          break;

        case '信号强度':
          rowHtml += ` class="tooltip-cell">${getSignalStrength(quote)}</td>`;
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
          // 获取前一期MA值用于趋势判断
          const prevQuote = (quotes && index > 0) ? quotes[index - 1] : null;
          const prevMa = prevQuote ? prevQuote[maKey] : null;
          rowHtml += ' style="color: var(--color-primary);">' + this.formatMA(quote[maKey], prevMa) + '</td>';
          break;

        case 'MA状态':
          const maStatus = calculateMAStatus(quote);
          rowHtml += ` class="tooltip-cell" style="color: ${maStatus.color}; font-size: 11px;" data-tooltip="${maStatus.text}">${maStatus.icon} ${maStatus.text}</td>`;
          break;

        case '量能':
          const volStatus = calculateVolumeStatus(quote);
          const volRatio = volStatus.ratio ? ` (${volStatus.ratio.toFixed(1)}x)` : '';
          rowHtml += ` class="tooltip-cell" style="color: ${volStatus.color}; font-size: 11px;" data-tooltip="${volStatus.text}">${volStatus.icon}${volRatio}</td>`;
          break;

        case 'OBV':
          rowHtml += `>${quote.obv != null ? (quote.obv / 1000000).toFixed(2) + 'M' : '-'}</td>`;
          break;

        case '信号':
          rowHtml += `>${this.formatSignal(quote, signalsMap)}</td>`;
          break;

        case '多空线':
          const duokongColor = quote.duokong_line && quote.close ? (quote.duokong_line < quote.close ? '#10b981' : '#ef4444') : '#6b7280';
          rowHtml += ` style="color: ${duokongColor}; font-weight: 600;">${quote.duokong_line ? quote.duokong_line.toFixed(2) : '-'}</td>`;
          break;

        case '阶段':
          rowHtml += ` class="${phase.class} tooltip-cell" data-tooltip="${phase.tooltip}">${phase.code}</td>`;
          break;

        case '方向':
          const signal = signalsMap && quote.date ? signalsMap[quote.date.substring(0, 10)] : null;
          const direction = signal?.direction || 'NEUTRAL';
          const dirColor = direction === 'LONG' ? '#10b981' : direction === 'SHORT' ? '#ef4444' : '#9ca3af';
          const dirText = direction === 'LONG' ? '看涨' : direction === 'SHORT' ? '看跌' : '中性';
          const dirTooltip = signal ? `${direction}: ${signal.reason || '无详细原因'}` : '中性：无明确信号';
          rowHtml += ` class="tooltip-cell" style="color: ${dirColor}; font-weight: 600;" data-tooltip="${dirTooltip}">${dirText}</td>`;
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
      let sortableAttr = '';
      let sortableClass = '';

      // 可排序的列
      const sortableColumns = ['日期', '开', '高', '低', '收', '成交量', '涨跌幅'];
      const isSortable = sortableColumns.includes(header) || header.startsWith('MA');

      if (header === 'OBV') titleAttr = ' title="OBV能量潮指标"';
      if (header === '信号') titleAttr = ' title="信号强度指标"';
      if (header === '多空线') titleAttr = ' title="多空线指标"';
      if (header === '阶段') titleAttr = ' title="威科夫阶段"';

      if (isSortable) {
        sortableAttr = ` data-sort-column="${header}"`;
        sortableClass = ' sortable-header';
        if (tableSortState.column === header) {
          sortableClass += tableSortState.direction === 'asc' ? ' sort-asc' : ' sort-desc';
        }
      }

      const sortIcon = isSortable ? this.getSortIcon(header) : '';
      headerHtml += `<th class="${sortableClass}"${titleAttr}${sortableAttr}>${header}${sortIcon}</th>`;
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

    // 数据量大于200时使用虚拟滚动
    if (filteredQuotes.length > 200) {
      return this.renderVirtual(filteredQuotes, timeframe, signalsMap);
    }

    const filterBarHTML = this.generateFilterBarHTML();
    const headers = this.generateHeaders(filteredQuotes);
    const headerHTML = this.generateHeaderHTML(headers);
    const rowsHTML = this.generateRows(filteredQuotes, timeframe, headers, signalsMap);

    return `
      <div class="kline-table-wrapper">
        ${filterBarHTML}
        <div class="kline-table-container">
          <table class="kline-table">
            <thead>${headerHTML}</thead>
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
          <table class="kline-table">
            <thead>${this.generateHeaderHTML(headers)}</thead>
          </table>
          <div class="vs-scroll-area" style="height: 500px; overflow-y: auto;"></div>
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
      rowHeight: 30,
      bufferRows: 10,
      renderHeader: null,
      renderRow: (quote, index) => {
        return this.generateRow(quote, index, timeframe, headers, signalsMap, reversedQuotes);
      }
    });

    vs.setData(reversedQuotes);
    return vs;
  }
}

export default KlineTable;
