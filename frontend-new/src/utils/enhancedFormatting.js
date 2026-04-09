/**
 * 增强格式化工具函数
 * 从旧版本迁移的数据特效和格式化功能
 */

/**
 * 计算均线状态
 * @param {Object} quote - K线数据
 * @returns {Object} - { status, text, color, category, icon }
 */
export function calculateMAStatus(quote) {
  if (!quote || !quote.ma5 || !quote.ma10 || !quote.ma20) {
    return { status: 'unknown', text: '数据不足', color: '#9ca3af', category: '未知', icon: '➖' };
  }

  const { close, ma5, ma10, ma20 } = quote;

  // 多头排列
  if (close > ma20 && ma5 > ma10 && ma10 > ma20) {
    return { status: 'bullish_aligned', text: '多头排列', color: '#10b981', category: '多头排列', icon: '📈' };
  }
  // 空头排列
  else if (close < ma20 && ma5 < ma10 && ma10 < ma20) {
    return { status: 'bearish_aligned', text: '空头排列', color: '#ef4444', category: '空头排列', icon: '📉' };
  }
  // 金叉信号
  else if (ma5 > ma10 && quote.ma5_prev && quote.ma10_prev && ma5_prev <= ma10_prev) {
    return { status: 'golden_cross', text: '金叉', color: '#fbbf24', category: '金叉', icon: '⭐' };
  }
  // 死叉信号
  else if (ma5 < ma10 && quote.ma5_prev && quote.ma10_prev && ma5_prev >= ma10_prev) {
    return { status: 'death_cross', text: '死叉', color: '#ef4444', category: '死叉', icon: '💀' };
  }
  // 看涨但未形成多头排列
  else if (close > ma20) {
    return { status: 'bullish', text: '看涨', color: '#10b981', category: '看涨', icon: '↑' };
  }
  // 看跌但未形成空头排列
  else if (close < ma20) {
    return { status: 'bearish', text: '看跌', color: '#ef4444', category: '看跌', icon: '↓' };
  }
  // 震荡
  else {
    return { status: 'neutral', text: '震荡', color: '#9ca3af', category: '震荡', icon: '→' };
  }
}

/**
 * 计算量能状态
 * @param {Object} quote - K线数据
 * @returns {Object} - { status, text, color, category, ratio }
 */
export function calculateVolumeStatus(quote) {
  if (!quote || !quote.volume || !quote.volume_ma5) {
    return { status: 'unknown', text: '数据不足', color: '#9ca3af', category: '未知', ratio: 0 };
  }

  const { volume, volume_ma5 } = quote;
  const ratio = volume / volume_ma5;

  if (ratio >= 2.0) {
    return { status: 'very_high', text: '异常放量', color: '#ef4444', category: '放量', ratio, icon: '🔥' };
  } else if (ratio >= 1.2) {
    return { status: 'high', text: '放量', color: '#fbbf24', category: '放量', ratio, icon: '📈' };
  } else if (ratio >= 0.8) {
    return { status: 'normal', text: '正常', color: '#9ca3af', category: '平稳', ratio, icon: '➖' };
  } else {
    return { status: 'low', text: '缩量', color: '#6b7280', category: '缩量', ratio, icon: '📉' };
  }
}

/**
 * 生成信号强度指示器HTML
 * @param {Object} quote - K线数据
 * @returns {string} - HTML字符串
 */
export function getSignalStrength(quote) {
  if (!quote || quote.close == null) return '';

  const close = quote.close;
  let strength = 0;
  let tooltip = '';

  // 判断信号强度（从高到低判断）
  if (quote.ma250 != null && close > quote.ma250) {
    strength = 4;
    tooltip = '强势（4格）|收盘价站上250日线|长期上升趋势确立';
  } else if (quote.ma120 != null && close > quote.ma120) {
    strength = 3;
    tooltip = '较强（3格）|收盘价站上120日线|中期上升趋势';
  } else if (quote.ma90 != null && close > quote.ma90) {
    strength = 2;
    tooltip = '中等（2格）|收盘价站上90日线|短期有支撑';
  } else if (quote.ma60 != null && close > quote.ma60) {
    strength = 1;
    tooltip = '偏强（1格）|收盘价站上60日线|初步支撑位';
  } else {
    tooltip = '弱势（0格）|收盘价在60日线下方|处于下降趋势';
  }

  // 生成信号格条形样式
  const bars = [];
  const containerHeight = 8;
  const barWidth = 2;
  const gap = 1;

  for (let i = 1; i <= 4; i++) {
    const barHeight = 2 + i * 1.5;
    const isActive = i <= strength;
    const color = isActive ? '#10b981' : '#374151';

    bars.push(`<span style="display: inline-block; width: ${barWidth}px; height: ${barHeight}px; background: ${color}; border-radius: 1px; margin-right: ${gap}px; vertical-align: bottom; opacity: ${isActive ? '1' : '0.3'}; transition: all 0.2s;" class="signal-strength-bar"></span>`);
  }

  return `<span class="signal-strength" style="display: inline-block; cursor: help; line-height:8px;" title="${tooltip}">${bars.join('')}</span>`;
}

/**
 * 格式化涨跌幅
 * @param {number} changePercent - 涨跌幅百分比
 * @returns {Object} - { text, color, arrow }
 */
export function formatChangePercent(changePercent) {
  if (changePercent == null || isNaN(changePercent)) {
    return { text: '-', color: '#9ca3af', arrow: '' };
  }

  const arrow = changePercent > 0 ? '↑' : changePercent < 0 ? '↓' : '→';
  const color = changePercent > 0 ? '#ef4444' : changePercent < 0 ? '#10b981' : '#9ca3af';
  const text = changePercent > 0 ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`;

  return { text, color, arrow };
}

/**
 * 生成周期共振分析
 * @param {Array} analysisData - 多周期分析数据
 * @param {Object} timeframeNames - 周期名称映射
 * @returns {Object} - 共振分析结果
 */
export function generateResonanceAnalysis(analysisData, timeframeNames = {}) {
  const stats = {
    direction: { LONG: 0, SHORT: 0, NEUTRAL: 0 },
    phase: { U: 0, D: 0, A: 0, DS: 0, '震荡': 0 },
    maStatus: { '多头排列': 0, '空头排列': 0, '金叉': 0, '死叉': 0, '看涨': 0, '看跌': 0, '震荡': 0 },
    volumeStatus: { '放量': 0, '缩量': 0, '平稳': 0 },
    pricePosition: { aboveDuokong: 0, aboveMa250: 0, aboveBoth: 0 }
  };

  const details = [];

  analysisData.forEach(data => {
    const summary = data.summary || {};
    const quote = data.quote || {};
    const tfName = timeframeNames[data.timeframe] || data.timeframe;

    // 统计方向
    if (summary.direction) {
      stats.direction[summary.direction]++;
    }

    // 统计阶段
    const phase = (summary.wyckoff_phase || '')[0];
    if (phase && stats.phase[phase] !== undefined) {
      stats.phase[phase]++;
    } else {
      stats.phase['震荡']++;
    }

    // 计算MA状态
    const maStatus = calculateMAStatus(quote);
    if (stats.maStatus[maStatus.category] !== undefined) {
      stats.maStatus[maStatus.category]++;
    }

    // 计算量能状态
    const volStatus = calculateVolumeStatus(quote);
    if (stats.volumeStatus[volStatus.category] !== undefined) {
      stats.volumeStatus[volStatus.category]++;
    }

    // 统计价格位置
    const duokongAbove = quote.duokong_line && quote.close > quote.duokong_line;
    const ma250Above = quote.ma250 && quote.close > quote.ma250;

    if (duokongAbove) stats.pricePosition.aboveDuokong++;
    if (ma250Above) stats.pricePosition.aboveMa250++;
    if (duokongAbove && ma250Above) stats.pricePosition.aboveBoth++;

    details.push({
      timeframe: tfName,
      direction: summary.direction,
      phase: phase,
      maStatus,
      volStatus,
      pricePosition: { duokongAbove, ma250Above }
    });
  });

  // 计算一致性分数
  const total = analysisData.length;
  const directionConsistency = Math.max(stats.direction.LONG, stats.direction.SHORT, stats.direction.NEUTRAL) / total;
  const phaseConsistency = Math.max(...Object.values(stats.phase)) / total;

  return {
    stats,
    details,
    consistency: {
      direction: directionConsistency,
      phase: phaseConsistency,
      overall: (directionConsistency + phaseConsistency) / 2
    },
    summary: generateResonanceSummary(stats, total)
  };
}

/**
 * 生成共振摘要
 */
function generateResonanceSummary(stats, total) {
  const items = [];

  if (stats.direction.LONG >= 2) {
    items.push({ text: `做多共振(${stats.direction.LONG}/${total})`, type: 'bullish' });
  } else if (stats.direction.SHORT >= 2) {
    items.push({ text: `做空共振(${stats.direction.SHORT}/${total})`, type: 'bearish' });
  }

  if (stats.maStatus['多头排列'] >= 2) {
    items.push({ text: `MA多头(${stats.maStatus['多头排列']}/${total})`, type: 'bullish' });
  } else if (stats.maStatus['空头排列'] >= 2) {
    items.push({ text: `MA空头(${stats.maStatus['空头排列']}/${total})`, type: 'bearish' });
  }

  if (stats.volumeStatus['放量'] >= 2) {
    items.push({ text: `放量(${stats.volumeStatus['放量']}/${total})`, type: 'volume' });
  }

  return items;
}

export default {
  calculateMAStatus,
  calculateVolumeStatus,
  getSignalStrength,
  formatChangePercent,
  generateResonanceAnalysis
};
