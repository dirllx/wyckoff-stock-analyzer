export const WyckoffAnalyzer = {
  // 计算威科夫相位
  calculatePhase(quote) {
    if (!quote) {
      return { phase: 'U', text: '未知', color: '#9ca3af' };
    }

    const { close, high, low, volume } = quote;
    const ma = quote.ma15 || quote.ma20;

    if (!ma) {
      return { phase: 'U', text: '上升', color: '#10b981' };
    }

    // 价格在MA上方
    if (close > ma) {
      return { phase: 'U', text: 'U上升', color: '#10b981' };
    }

    // 价格在MA下方
    if (close < ma) {
      return { phase: 'D', text: 'D下降', color: '#ef4444' };
    }

    // 价格接近MA
    if (Math.abs(close - ma) / ma < 0.02) {
      return { phase: 'A', text: 'A吸筹', color: '#f59e0b' };
    }

    return { phase: 'R', text: '⚡ 震荡', color: '#9ca3af' };
  },

  // 获取相位颜色
  getPhaseColor(phase) {
    const colors = {
      'U': '#10b981',
      'D': '#ef4444',
      'A': '#f59e0b',
      'DS': '#8b5cf6',
      'R': '#9ca3af'
    };
    return colors[phase] || '#9ca3af';
  },

  // 获取标记位置
  getMarkerPosition(phase, quote) {
    if (!quote) return quote?.close || 0;

    if (phase === 'U' || phase === 'A') {
      return quote.low || quote.close;
    } else if (phase === 'D' || phase === 'DS') {
      return quote.high || quote.close;
    }
    return quote.close;
  },

  // 获取标记形状
  getMarkerShape(phase) {
    const shapes = {
      'U': 'arrowUp',
      'D': 'arrowDown',
      'A': 'circle',
      'DS': 'circle',
      'R': 'diamond'
    };
    return shapes[phase] || 'circle';
  }
};
