/**
 * 格式化工具函数
 * 统一的数据格式化、颜色编码、徽章样式生成
 */

/**
 * 获取涨跌颜色
 * @param {number} value - 数值
 * @param {number} prevValue - 前值
 * @returns {string} - 颜色类名
 */
export function getChangeColorClass(value, prevValue) {
  if (!prevValue || value === null || value === undefined) return '';

  const change = value - prevValue;
  if (change > 0) return 'kline-green'; // 上涨：绿色
  if (change < 0) return 'kline-red';    // 下跌：红色
  return 'kline-neutral';
}

/**
 * 获取涨跌颜色值
 * @param {number} value - 数值
 * @param {number} prevValue - 前值
 * @returns {string} - 颜色值
 */
export function getChangeColor(value, prevValue) {
  const cls = getChangeColorClass(value, prevValue);
  const colors = {
    'kline-green': '#10b981',
    'kline-red': '#ef4444',
    'kline-neutral': '#94a3b8'
  };
  return colors[cls] || colors['kline-neutral'];
}

/**
 * 格式化数字（千分位）
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的字符串
 */
export function formatNumber(num, decimals = 2) {
  if (num === null || num === undefined) return '-';
  if (isNaN(num)) return '-';

  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

/**
 * 格式化成交量
 * @param {number} volume - 成交量
 * @returns {string} - 格式化后的字符串
 */
export function formatVolume(volume) {
  if (!volume || volume === 0) return '-';

  if (volume >= 100000000) {
    return (volume / 100000000).toFixed(2) + '亿';
  } else if (volume >= 10000) {
    return (volume / 10000).toFixed(2) + '万';
  }
  return formatNumber(volume, 0);
}

/**
 * 格式化百分比
 * @param {number} value - 数值
 * @param {number} decimals - 小数位数
 * @returns {string} - 格式化后的百分比字符串
 */
export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  if (isNaN(value)) return '-';

  const sign = value >= 0 ? '+' : '';
  return sign + value.toFixed(decimals) + '%';
}

/**
 * 获取评分颜色类
 * @param {number} score - 评分 (1-5)
 * @returns {string} - 颜色类名
 */
export function getScoreColorClass(score) {
  if (score === null || score === undefined) return '';
  if (score >= 4) return 'score-high';
  if (score >= 3) return 'score-medium';
  return 'score-low';
}

/**
 * 获取评分颜色值
 * @param {number} score - 评分 (1-5)
 * @returns {string} - 颜色值
 */
export function getScoreColor(score) {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 4) return '#22c55e'; // 绿色
  if (score >= 3) return '#f59e0b'; // 橙色
  return '#6b7280'; // 灰色
}

/**
 * 获取信号方向样式
 * @param {string} direction - LONG/SHORT/NEUTRAL
 * @returns {object} - 样式对象
 */
export function getSignalStyle(direction) {
  const styles = {
    'LONG': {
      class: 'signal-bullish',
      text: '做多',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.15)',
      icon: '📈'
    },
    'SHORT': {
      class: 'signal-bearish',
      text: '做空',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      icon: '📉'
    },
    'NEUTRAL': {
      class: 'signal-neutral',
      text: '中性',
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
      icon: '➡️'
    }
  };

  return styles[direction] || styles['NEUTRAL'];
}

/**
 * 获取威科夫阶段样式
 * @param {string} phase - U/D/A/DS/震荡
 * @returns {object} - 样式对象
 */
export function getWyckoffPhaseStyle(phase) {
  const styles = {
    'U': {
      class: 'phase-U',
      text: '上升',
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.15)',
      border: '#22c55e'
    },
    'D': {
      class: 'phase-D',
      text: '下降',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      border: '#ef4444'
    },
    'A': {
      class: 'phase-A',
      text: '吸筹',
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.15)',
      border: '#8b5cf6'
    },
    'DS': {
      class: 'phase-DS',
      text: '派发',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: '#f59e0b'
    },
    '震荡': {
      class: 'phase-neutral',
      text: '震荡',
      color: '#94a3b8',
      bg: 'rgba(148, 163, 184, 0.15)',
      border: '#94a3b8'
    }
  };

  // 处理带括号的阶段，如 "U(放量上涨)"
  const basePhase = phase ? phase.split('(')[0] : '震荡';
  return styles[basePhase] || styles['震荡'];
}

/**
 * 格式化日期字符串
 * @param {string} dateStr - 日期字符串
 * @param {string} timeframe - 周期
 * @returns {string} - 格式化后的日期
 */
export function formatDateString(dateStr, timeframe = 'daily') {
  if (!dateStr) return '-';

  const date = new Date(dateStr);

  // 检查日期是否有效
  if (isNaN(date.getTime())) {
    return dateStr;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // 分钟线显示 MM-DD HH:MM
  if (['1', '5', '15', '30', '60'].includes(timeframe)) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  // 日线以上显示 MM-DD
  return `${month}-${day}`;
}

/**
 * 创建信号徽章HTML
 * @param {string} direction - LONG/SHORT/NEUTRAL
 * @param {number} score - 评分
 * @returns {string} - HTML字符串
 */
export function createSignalBadge(direction, score = null) {
  const style = getSignalStyle(direction);
  const scoreHtml = score !== null ? `<span class="signal-score">${formatNumber(score, 1)}</span>` : '';

  return `
    <span class="signal-badge ${style.class}" style="background: ${style.bg}; color: ${style.color}; border: 1px solid ${style.border}">
      ${style.icon} ${style.text}${scoreHtml}
    </span>
  `;
}

/**
 * 创建威科夫阶段徽章HTML
 * @param {string} phase - 阶段
 * @returns {string} - HTML字符串
 */
export function createPhaseBadge(phase) {
  const style = getWyckoffPhaseStyle(phase);

  return `
    <span class="phase-badge ${style.class}" style="background: ${style.bg}; color: ${style.color}; border: 1px solid ${style.border}">
      ${style.text}
    </span>
  `;
}

/**
 * 创建评分徽章HTML
 * @param {number} score - 评分
 * @returns {string} - HTML字符串
 */
export function createScoreBadge(score) {
  const colorClass = getScoreColorClass(score);
  const color = getScoreColor(score);
  const stars = '⭐'.repeat(Math.round(score));

  // 如果是整数，不显示小数点
  const formattedScore = Number.isInteger(score) ? score : formatNumber(score, 1);

  return `
    <span class="score-badge ${colorClass}" style="background: ${color}20; color: ${color}">
      ${stars} ${formattedScore}分
    </span>
  `;
}

/**
 * 格式化OHLC数据
 * @param {object} quote - K线数据
 * @returns {object} - 格式化后的数据
 */
export function formatQuote(quote) {
  const prevClose = quote.prev_close || quote.open;

  return {
    ...quote,
    openFormatted: formatNumber(quote.open),
    highFormatted: formatNumber(quote.high),
    lowFormatted: formatNumber(quote.low),
    closeFormatted: formatNumber(quote.close),
    volumeFormatted: formatVolume(quote.volume),
    change: quote.close - prevClose,
    changePercent: ((quote.close - prevClose) / prevClose * 100),
    changeColor: getChangeColorClass(quote.close, prevClose),
    changeColorValue: getChangeColor(quote.close, prevClose)
  };
}

/**
 * 导出所有格式化函数
 */
export default {
  getChangeColorClass,
  getChangeColor,
  formatNumber,
  formatVolume,
  formatPercent,
  getScoreColorClass,
  getScoreColor,
  getSignalStyle,
  getWyckoffPhaseStyle,
  createSignalBadge,
  createPhaseBadge,
  createScoreBadge,
  formatDateString,
  formatQuote
};
