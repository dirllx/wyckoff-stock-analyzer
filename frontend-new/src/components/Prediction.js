/**
 * K线预测组件
 * 基于多因子模型预测未来K线走势
 */

export class Prediction {
  /**
   * 计算MA趋势因子
   * @param {Array} quotes - K线数据数组
   * @returns {Object} MA趋势因子 { direction, strength, slope }
   */
  static calculateMATrendFactor(quotes) {
    if (!quotes || quotes.length < 10) {
      return { direction: 'NEUTRAL', strength: 0, slope: 0 };
    }

    const recent = quotes.slice(-10);
    const ma5Values = recent.map(q => q.ma5).filter(v => v != null);
    const ma10Values = recent.map(q => q.ma10).filter(v => v != null);
    const ma20Values = recent.map(q => q.ma20).filter(v => v != null);

    if (ma5Values.length < 5 || ma10Values.length < 5) {
      return { direction: 'NEUTRAL', strength: 0, slope: 0 };
    }

    // 计算MA斜率（简单线性回归）
    const calculateSlope = (values) => {
      const n = values.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
      return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    };

    const ma5Slope = calculateSlope(ma5Values);
    const ma10Slope = calculateSlope(ma10Values);
    const ma20Slope = calculateSlope(ma20Values);

    // 判断多头排列（MA5 > MA10 > MA20）
    const isBullishArrangement = ma5Values[ma5Values.length - 1] > ma10Values[ma10Values.length - 1] &&
                                  ma10Values[ma10Values.length - 1] > ma20Values[ma20Values.length - 1];

    // 判断空头排列
    const isBearishArrangement = ma5Values[ma5Values.length - 1] < ma10Values[ma10Values.length - 1] &&
                                  ma10Values[ma10Values.length - 1] < ma20Values[ma20Values.length - 1];

    // 计算综合斜率
    const avgSlope = (ma5Slope + ma10Slope + ma20Slope) / 3;

    // 计算强度（基于斜率和排列）
    let strength = 0;
    if (isBullishArrangement && avgSlope > 0) {
      strength = Math.min(1, Math.abs(avgSlope) * 10);
    } else if (isBearishArrangement && avgSlope < 0) {
      strength = Math.min(1, Math.abs(avgSlope) * 10);
    }

    // 判断方向
    let direction = 'NEUTRAL';
    if (avgSlope > 0.1) {
      direction = 'UP';
    } else if (avgSlope < -0.1) {
      direction = 'DOWN';
    }

    return { direction, strength, slope: avgSlope };
  }

  /**
   * 计算成交量趋势因子
   * @param {Array} quotes - K线数据数组
   * @returns {Object} 成交量趋势因子 { trend, strength, obvTrend }
   */
  static calculateVolumeTrendFactor(quotes) {
    if (!quotes || quotes.length < 10) {
      return { trend: 'NEUTRAL', strength: 0, obvTrend: 'NEUTRAL' };
    }

    const recent = quotes.slice(-10);
    const volumes = recent.map(q => q.volume).filter(v => v != null);
    const obvs = recent.map(q => q.obv).filter(v => v != null);

    if (volumes.length < 5) {
      return { trend: 'NEUTRAL', strength: 0, obvTrend: 'NEUTRAL' };
    }

    // 计算OBV趋势
    let obvTrend = 'NEUTRAL';
    if (obvs.length >= 2) {
      const obvChange = obvs[obvs.length - 1] - obvs[0];
      if (obvChange > 0) {
        obvTrend = 'UP';
      } else if (obvChange < 0) {
        obvTrend = 'DOWN';
      }
    }

    // 比较前半段和后半段的平均成交量
    const mid = Math.floor(volumes.length / 2);
    const firstHalfAvg = volumes.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalfAvg = volumes.slice(mid).reduce((a, b) => a + b, 0) / (volumes.length - mid);

    // 计算变化率
    const changeRate = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    // 判断成交量趋势
    let trend = 'NEUTRAL';
    let strength = 0;

    if (changeRate > 0.05) {
      trend = 'UP';
      strength = Math.min(1, changeRate * 5);
    } else if (changeRate < -0.05) {
      trend = 'DOWN';
      strength = Math.min(1, Math.abs(changeRate) * 5);
    }

    return { trend, strength, obvTrend };
  }

  /**
   * 计算动量因子（RSI和变化率）
   * @param {Array} quotes - K线数据数组
   * @returns {Object} 动量因子 { rsi, changeRate, isOverbought, isOversold, strength }
   */
  static calculateMomentumFactor(quotes) {
    if (!quotes || quotes.length < 15) {
      return {
        rsi: 50,
        changeRate: 0,
        isOverbought: false,
        isOversold: false,
        strength: 0
      };
    }

    const closes = quotes.map(q => q.close).filter(c => c != null);
    if (closes.length < 15) {
      return {
        rsi: 50,
        changeRate: 0,
        isOverbought: false,
        isOversold: false,
        strength: 0
      };
    }

    // 计算RSI（14周期）
    const calculateRSI = (prices, period = 14) => {
      if (prices.length < period + 1) return 50;

      let gains = 0;
      let losses = 0;

      for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };

    const rsi = calculateRSI(closes);

    // 计算变化率（5日）
    const changeRate = closes.length >= 5
      ? (closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]
      : 0;

    const isOverbought = rsi > 70;
    const isOversold = rsi < 30;

    // 计算动量强度
    let strength = 0;
    if (isOversold && changeRate > 0) {
      strength = 0.8; // 超卖后反弹
    } else if (isOverbought && changeRate < 0) {
      strength = 0.8; // 超买后回调
    } else if (rsi > 50 && changeRate > 0) {
      strength = 0.6;
    } else if (rsi < 50 && changeRate < 0) {
      strength = 0.6;
    }

    return {
      rsi: Math.round(rsi * 100) / 100,
      changeRate: Math.round(changeRate * 10000) / 10000,
      isOverbought,
      isOversold,
      strength
    };
  }

  /**
   * 计算支撑阻力因子
   * @param {Array} quotes - K线数据数组
   * @returns {Object} 支撑阻力因子 { supportLevel, resistanceLevel, supportDistance, resistanceDistance, strength }
   */
  static calculateSupportResistanceFactor(quotes) {
    if (!quotes || quotes.length < 10) {
      return {
        supportLevel: 0,
        resistanceLevel: 0,
        supportDistance: 0,
        resistanceDistance: 0,
        strength: 0
      };
    }

    const recent = quotes.slice(-20);
    const highs = recent.map(q => q.high).filter(h => h != null);
    const lows = recent.map(q => q.low).filter(l => l != null);
    const closes = recent.map(q => q.close).filter(c => c != null);

    if (highs.length < 5 || lows.length < 5 || closes.length === 0) {
      return {
        supportLevel: 0,
        resistanceLevel: 0,
        supportDistance: 0,
        resistanceDistance: 0,
        strength: 0
      };
    }

    // 找支撑位（近期低点）
    const supportLevel = Math.min(...lows);

    // 找阻力位（近期高点）
    const resistanceLevel = Math.max(...highs);

    const currentPrice = closes[closes.length - 1];

    // 计算距离支撑位和阻力位的距离（百分比）
    const supportDistance = (currentPrice - supportLevel) / currentPrice;
    const resistanceDistance = (resistanceLevel - currentPrice) / currentPrice;

    // 计算强度（价格处于中间位置时强度较高）
    const totalRange = resistanceLevel - supportLevel;
    const position = (currentPrice - supportLevel) / totalRange;
    const strength = 1 - Math.abs(position - 0.5) * 2; // 中间位置强度最高

    return {
      supportLevel: Math.round(supportLevel * 100) / 100,
      resistanceLevel: Math.round(resistanceLevel * 100) / 100,
      supportDistance: Math.round(supportDistance * 10000) / 10000,
      resistanceDistance: Math.round(resistanceDistance * 10000) / 10000,
      strength: Math.round(strength * 100) / 100
    };
  }

  /**
   * 计算威科夫阶段因子
   * @param {Object} summary - 分析摘要
   * @returns {Object} 威科夫阶段因子 { phase, strength }
   */
  static calculateWyckoffPhaseFactor(summary) {
    if (!summary || !summary.phase) {
      return { phase: 'NEUTRAL', strength: 0 };
    }

    const phaseMap = {
      'A': 'DOWN',    // Accumulation（吸筹）→ 可能下跌
      'D': 'DOWN',    // Distribution（派发）→ 可能下跌
      'U': 'UP',      // Upward（上升）→ 上涨
      'R': 'NEUTRAL'  // Range/Reaction（震荡）→ 横盘
    };

    const phase = phaseMap[summary.phase] || 'NEUTRAL';
    const strength = (summary.score || 0) / 10;

    return { phase, strength };
  }

  /**
   * 计算预测方向
   * @param {Object} factors - 各因子对象
   * @returns {string} 方向 'UP' | 'DOWN' | 'SIDEWAYS'
   */
  static calculatePredictionDirection(factors) {
    const { maTrend, volumeTrend, momentum, supportResistance, wyckoffPhase } = factors;

    // 权重配置
    const weights = {
      maTrend: 0.30,
      wyckoffPhase: 0.25,
      volumeTrend: 0.20,
      momentum: 0.15,
      supportResistance: 0.10
    };

    // 计算多头得分
    let bullScore = 0;
    let bearScore = 0;

    // MA趋势
    if (maTrend.direction === 'UP') {
      bullScore += weights.maTrend * maTrend.strength;
    } else if (maTrend.direction === 'DOWN') {
      bearScore += weights.maTrend * maTrend.strength;
    }

    // 威科夫阶段
    if (wyckoffPhase.phase === 'UP') {
      bullScore += weights.wyckoffPhase * wyckoffPhase.strength;
    } else if (wyckoffPhase.phase === 'DOWN') {
      bearScore += weights.wyckoffPhase * wyckoffPhase.strength;
    }

    // 成交量趋势
    if (volumeTrend.trend === 'UP') {
      bullScore += weights.volumeTrend * volumeTrend.strength;
    } else if (volumeTrend.trend === 'DOWN') {
      bearScore += weights.volumeTrend * volumeTrend.strength;
    }

    // 动量因子
    if (momentum.isOversold) {
      bullScore += weights.momentum * momentum.strength;
    } else if (momentum.isOverbought) {
      bearScore += weights.momentum * momentum.strength;
    }

    // 支撑阻力
    if (supportResistance.supportDistance < 0.05) {
      bullScore += weights.supportResistance * supportResistance.strength;
    } else if (supportResistance.resistanceDistance < 0.05) {
      bearScore += weights.supportResistance * supportResistance.strength;
    }

    // 判断方向
    const threshold = 0.15;
    if (bullScore - bearScore > threshold) {
      return 'UP';
    } else if (bearScore - bullScore > threshold) {
      return 'DOWN';
    } else {
      return 'SIDEWAYS';
    }
  }

  /**
   * 预测OHLC数据
   * @param {Object} lastQuote - 最新K线数据
   * @param {string} direction - 预测方向
   * @param {number} day - 第几天（1-5）
   * @param {Object} trends - 趋势数据
   * @param {Object} momentum - 动量数据
   * @returns {Object} OHLC数据
   */
  static predictOHLC(lastQuote, direction, day, trends, momentum) {
    const { close: lastClose, volume: lastVolume } = lastQuote;

    // 基础变化率（随天数递减）
    const baseChangeRate = {
      'UP': 0.02,
      'DOWN': -0.02,
      'SIDEWAYS': 0
    }[direction] || 0;

    // MA趋势影响
    const maTrendImpact = trends.maTrend || 0;

    // 动量影响（RSI回归）
    const momentumImpact = momentum && momentum.rsi
      ? (50 - momentum.rsi) / 100 * 0.01
      : 0;

    // 成交量趋势影响
    const volumeTrend = trends.volumeTrend || 0.5;

    // 计算最终变化率
    const changeRate = baseChangeRate * (1 - day * 0.15) + maTrendImpact + momentumImpact;

    // 生成OHLC
    const open = lastClose * (1 + Math.random() * 0.005 - 0.0025);
    const close = open * (1 + changeRate);

    let high, low;
    if (direction === 'UP') {
      high = Math.max(open, close) * (1 + Math.random() * 0.01);
      low = Math.min(open, close) * (1 - Math.random() * 0.008);
    } else if (direction === 'DOWN') {
      high = Math.max(open, close) * (1 + Math.random() * 0.008);
      low = Math.min(open, close) * (1 - Math.random() * 0.01);
    } else {
      high = Math.max(open, close) * (1 + Math.random() * 0.005);
      low = Math.min(open, close) * (1 - Math.random() * 0.005);
    }

    // 预测成交量（基于成交量趋势）
    const volume = lastVolume * (0.8 + Math.random() * 0.4) * volumeTrend;

    return {
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(volume)
    };
  }

  /**
   * 计算预测置信度
   * @param {Object} factors - 各因子对象
   * @param {number} day - 第几天（1-5）
   * @returns {number} 置信度（0-1）
   */
  static calculatePredictionConfidence(factors, day) {
    // 各因子强度
    const maTrendStrength = factors.maTrend?.strength || 0;
    const volumeTrendStrength = factors.volumeTrend?.strength || 0;
    const momentumStrength = factors.momentum?.strength || 0;
    const supportResistanceStrength = factors.supportResistance?.strength || 0;
    const wyckoffPhaseStrength = factors.wyckoffPhase?.strength || 0;

    // 加权平均强度
    const baseConfidence = (
      maTrendStrength * 0.30 +
      wyckoffPhaseStrength * 0.25 +
      volumeTrendStrength * 0.20 +
      momentumStrength * 0.15 +
      supportResistanceStrength * 0.10
    );

    // 时间衰减（每天衰减15%）
    const decayFactor = Math.pow(0.85, day - 1);

    return Math.max(0, Math.min(1, baseConfidence * decayFactor));
  }

  /**
   * 预测未来K线
   * @param {Array} quotes - K线数据数组
   * @param {Object} summary - 分析摘要
   * @returns {Array} 预测的K线数组
   */
  static predictFutureCandles(quotes, summary) {
    if (!quotes || quotes.length < 10) {
      return [];
    }

    const lastQuote = quotes[quotes.length - 1];

    // 计算各因子
    const maTrend = this.calculateMATrendFactor(quotes);
    const volumeTrend = this.calculateVolumeTrendFactor(quotes);
    const momentum = this.calculateMomentumFactor(quotes);
    const supportResistance = this.calculateSupportResistanceFactor(quotes);
    const wyckoffPhase = this.calculateWyckoffPhaseFactor(summary);

    // 计算预测方向
    const factors = { maTrend, volumeTrend, momentum, supportResistance, wyckoffPhase };
    const direction = this.calculatePredictionDirection(factors);

    // 生成5天预测
    const predictions = [];
    const baseTime = lastQuote.time || Date.now() / 1000;
    const dayInSeconds = 24 * 60 * 60;

    for (let day = 1; day <= 5; day++) {
      const ohlc = this.predictOHLC(
        lastQuote,
        direction,
        day,
        { maTrend: maTrend.slope, volumeTrend: volumeTrend.strength },
        momentum
      );

      const confidence = this.calculatePredictionConfidence(factors, day);

      predictions.push({
        time: baseTime + day * dayInSeconds,
        ...ohlc,
        confidence: Math.round(confidence * 1000) / 1000,
        direction,
        isPredicted: true
      });
    }

    return predictions;
  }

  /**
   * 获取方向显示名称
   * @param {string} direction - 方向代码
   * @returns {string} 显示名称
   */
  static getDirectionDisplayName(direction) {
    const names = {
      'UP': '上涨',
      'DOWN': '下跌',
      'SIDEWAYS': '横盘'
    };
    return names[direction] || '未知';
  }

  /**
   * 获取方向图标
   * @param {string} direction - 方向代码
   * @returns {string} 图标
   */
  static getDirectionIcon(direction) {
    const icons = {
      'UP': '📈',
      'DOWN': '📉',
      'SIDEWAYS': '➡️'
    };
    return icons[direction] || '❓';
  }

  /**
   * 获取方向颜色
   * @param {string} direction - 方向代码
   * @returns {string} 颜色变量
   */
  static getDirectionColor(direction) {
    const colors = {
      'UP': 'var(--color-success)',
      'DOWN': 'var(--color-error)',
      'SIDEWAYS': 'var(--color-tertiary)'
    };
    return colors[direction] || 'var(--color-text-secondary)';
  }

  /**
   * 获取置信度等级
   * @param {number} confidence - 置信度（0-1）
   * @returns {string} 等级
   */
  static getConfidenceLevel(confidence) {
    if (confidence >= 0.7) return '强烈';
    if (confidence >= 0.5) return '中等';
    if (confidence >= 0.3) return '较弱';
    return '低';
  }

  /**
   * 获取置信度等级颜色
   * @param {string} level - 等级
   * @returns {string} 颜色变量
   */
  static getConfidenceLevelColor(level) {
    const colors = {
      '强烈': 'var(--color-success)',
      '中等': 'var(--color-primary)',
      '较弱': 'var(--color-warning)',
      '低': 'var(--color-error)'
    };
    return colors[level] || 'var(--color-text-secondary)';
  }

  /**
   * 生成预测卡片HTML
   * @param {Array} predictions - 预测数据数组
   * @returns {string} HTML字符串
   */
  static generatePredictionCardHTML(predictions) {
    if (!predictions || predictions.length === 0) {
      return this.generateEmptyStateHTML();
    }

    const firstPrediction = predictions[0];
    const direction = firstPrediction.direction;
    const icon = this.getDirectionIcon(direction);
    const directionName = this.getDirectionDisplayName(direction);
    const directionColor = this.getDirectionColor(direction);
    const confidence = firstPrediction.confidence;
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const confidenceColor = this.getConfidenceLevelColor(confidenceLevel);

    return `
      <div class="prediction-card">
        <div class="prediction-header">
          <h3 class="prediction-title">K线预测</h3>
          <div class="prediction-direction" style="color: ${directionColor}">
            <span class="prediction-icon">${icon}</span>
            <span class="prediction-text">${directionName}</span>
          </div>
        </div>

        <div class="prediction-body">
          <div class="prediction-summary">
            <div class="prediction-summary-item">
              <span class="prediction-label">预测方向</span>
              <span class="prediction-value" style="color: ${directionColor}">
                ${icon} ${directionName}
              </span>
            </div>
            <div class="prediction-summary-item">
              <span class="prediction-label">置信度</span>
              <span class="prediction-value" style="color: ${confidenceColor}">
                ${Math.round(confidence * 100)}% (${confidenceLevel})
              </span>
            </div>
          </div>

          <div class="prediction-table-container">
            <table class="prediction-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>开盘</th>
                  <th>最高</th>
                  <th>最低</th>
                  <th>收盘</th>
                  <th>成交量</th>
                  <th>置信度</th>
                </tr>
              </thead>
              <tbody>
                ${predictions.map((p, index) => {
                  const date = new Date(p.time * 1000);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                  const confLevel = this.getConfidenceLevel(p.confidence);
                  const confColor = this.getConfidenceLevelColor(confLevel);

                  return `
                    <tr class="prediction-row ${index === 0 ? 'prediction-row-first' : ''}">
                      <td>${dateStr}</td>
                      <td>${p.open.toFixed(2)}</td>
                      <td>${p.high.toFixed(2)}</td>
                      <td>${p.low.toFixed(2)}</td>
                      <td>${p.close.toFixed(2)}</td>
                      <td>${(p.volume / 10000).toFixed(0)}万</td>
                      <td>
                        <span class="prediction-confidence" style="color: ${confColor}">
                          ${Math.round(p.confidence * 100)}%
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="prediction-footer">
            <p class="prediction-note">
              ⚠️ 预测仅供参考，不构成投资建议。实际走势可能受多种因素影响。
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="prediction-empty">
        <div class="prediction-empty-icon">📊</div>
        <h3 class="prediction-empty-title">暂无预测</h3>
        <p class="prediction-empty-text">请先分析股票以生成K线预测</p>
      </div>
    `;
  }

  /**
   * 渲染预测组件
   * @param {string} containerId - 容器ID
   * @param {Array} predictions - 预测数据数组
   */
  static render(containerId, predictions) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Prediction: Container ${containerId} not found`);
      return;
    }

    if (!predictions || predictions.length === 0) {
      container.innerHTML = this.generateEmptyStateHTML();
      return;
    }

    container.innerHTML = this.generatePredictionCardHTML(predictions);
  }
}
