/**
 * 模态框/弹窗工具
 * 显示K线详情弹窗 - 完全匹配旧版本功能
 */

import {
  formatNumber,
  formatVolume,
  formatPercent,
  getChangeColor,
  formatDateString,
  getWyckoffPhaseStyle
} from './formatting.js';

/**
 * 获取信号强度指示器
 * @param {object} q - K线数据
 * @param {object} prevQ - 前一根K线数据
 * @returns {string} - HTML字符串
 */
function getSignalStrength(q, prevQ) {
  if (!q || !q.close || !q.open || !q.high || !q.low) return '';

  const bodySize = Math.abs(q.close - q.open);
  const totalRange = q.high - q.low;
  const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;

  // 上影线
  const upperShadow = q.high - Math.max(q.open, q.close);
  // 下影线
  const lowerShadow = Math.min(q.open, q.close) - q.low;

  let signals = [];

  // 大实体线（实体占60%以上）
  if (bodyRatio >= 0.6) {
    signals.push(q.close > q.open ? '🔥强阳' : '💀强阴');
  }
  // 中实体线
  else if (bodyRatio >= 0.3) {
    signals.push(q.close > q.open ? '📈中阳' : '📉中阴');
  }
  // 小实体线（星线）
  else {
    signals.push('⭐星线');
  }

  // 影线分析
  const shadowRatio = totalRange > 0 ? Math.max(upperShadow, lowerShadow) / totalRange : 0;
  if (shadowRatio > 0.5) {
    if (upperShadow > lowerShadow * 2) {
      signals.push('🔺上影');
    } else if (lowerShadow > upperShadow * 2) {
      signals.push('🔻下影');
    }
  }

  return signals.length > 0 ? `<div style="font-size: 9px; color: #9ca3af; margin-top: 2px;">${signals.join(' ')}</div>` : '';
}

/**
 * 获取威科夫阶段
 * @param {object} q - K线数据
 * @returns {object} - {phase, color, tooltip}
 */
function getWyckoffPhase(q) {
  if (!q) return { phase: '震荡', color: '#9ca3af', tooltip: '无数据' };

  let phase = '震荡';
  let color = '#9ca3af';
  let tooltip = '';

  if (q.ma20 && q.ma5 && q.ma10 && q.close > q.ma20 && q.ma5 > q.ma10 && q.ma10 > q.ma20) {
    phase = 'U';
    color = '#10b981';
    tooltip = '均线多头排列\n条件：close > ma20 且 ma5 > ma10 > ma20';
  } else if (q.ma20 && q.ma5 && q.ma10 && q.close < q.ma20 && q.ma5 < q.ma10 && q.ma10 < q.ma20) {
    phase = 'D';
    color = '#ef4444';
    tooltip = '均线空头排列\n条件：close < ma20 且 ma5 < ma10 < ma20';
  } else if (q.volume_ma5 && q.volume > q.volume_ma5 * 1.5) {
    phase = 'A';
    color = '#f59e0b';
    tooltip = '成交量异常放大\n条件：volume > volume_ma5 × 1.5';
  } else if (q.ma5 && q.ma20 && q.close < q.ma5 && q.close > q.ma20) {
    phase = 'DS';
    color = '#8b5cf6';
    tooltip = '价格回调\n条件：close < ma5 且 close > ma20';
  } else {
    tooltip = '无明显特征，市场横盘整理';
  }

  return { phase, color, tooltip };
}

/**
 * 创建元素的辅助函数
 * @param {string} tag - HTML标签名
 * @param {object} options - 选项 {className, style, text, innerHTML}
 * @returns {HTMLElement} 创建的元素
 */
function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  if (options.className) el.className = options.className;
  if (options.style) el.style.cssText = options.style;
  if (options.text) el.textContent = options.text;
  if (options.innerHTML) el.innerHTML = options.innerHTML;
  return el;
}

/**
 * 模态框管理器
 */
class ModalManager {
  constructor() {
    this.currentModal = null;
    this.modalContainer = null;
    this.init();
  }

  init() {
    // 创建模态框容器
    this.modalContainer = document.createElement('div');
    this.modalContainer.id = 'modal-container';
    this.modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
    `;

    // 添加到页面
    document.body.appendChild(this.modalContainer);

    // 绑定关闭事件
    this.modalContainer.addEventListener('click', (e) => {
      if (e.target === this.modalContainer) {
        this.close();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.currentModal) {
        this.close();
      }
    });
  }

  /**
   * 显示原始HTML模态框（完全匹配旧版本）
   * @param {string} htmlContent - HTML内容
   */
  showRaw(htmlContent) {
    this.modalContainer.innerHTML = htmlContent;
    this.modalContainer.style.display = 'flex';
    this.currentModal = this.modalContainer.firstElementChild;

    // 防止页面滚动
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭模态框
   */
  close() {
    if (this.currentModal) {
      this.currentModal.remove();
      this.modalContainer.style.display = 'none';
      this.currentModal = null;
      document.body.style.overflow = '';
    }
  }
}

// 全局实例
const modalManager = new ModalManager();

/**
 * 显示K线详情弹窗 - 完全匹配旧版本功能
 * @param {object} q - K线数据
 * @param {object} prevQ - 前一根K线数据
 * @param {string} currentTimeframe - 当前时间周期
 */
export function showQuoteDetailModal(q, prevQ = null, currentTimeframe = 'daily') {
  if (!q) return;

  const isRed = q.close < q.open;
  const change = prevQ ? ((q.close - prevQ.close) / prevQ.close * 100).toFixed(2) : '0.00';
  const changeSign = change >= 0 ? '+' : '';

  // 获取威科夫阶段
  const { phase: currentPhase, color: phaseColor, tooltip: phaseTooltip } = getWyckoffPhase(q);
  const { phase: prevPhase } = prevQ ? getWyckoffPhase(prevQ) : { phase: '震荡' };

  // MA趋势分析
  const maTrend = [];
  if (q.ma5 && q.ma10 && q.ma20 && q.ma30) {
    const ma5 = q.ma5;
    const ma10 = q.ma10;
    const ma20 = q.ma20;
    const ma30 = q.ma30;

    // 多头排列
    if (ma5 > ma10 && ma10 > ma20 && ma20 > ma30) {
      maTrend.push({ type: '📈 多头排列', color: '#10b981' });
    }
    // 空头排列
    else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma30) {
      maTrend.push({ type: '📉 空头排列', color: '#ef4444' });
    }

    // 收敛性判断（均线间距）
    const prev_gap = prevQ && prevQ.ma5 && prevQ.ma30 ? Math.abs(prevQ.ma5 - prevQ.ma30) : 0;
    const curr_gap = Math.abs(ma5 - ma30);

    if (prev_gap > 0) {
      if (curr_gap < prev_gap * 0.7) {
        maTrend.push({ type: '🔄 均线收敛', color: '#f59e0b' });
      } else if (curr_gap > prev_gap * 1.3) {
        maTrend.push({ type: '📊 均线发散', color: '#9ca3af' });
      }
    }

    // 金叉死叉判断
    if (prevQ && prevQ.ma5 && prevQ.ma10 && q.ma5 && q.ma10) {
      if (prevQ.ma5 <= prevQ.ma10 && q.ma5 > q.ma10) {
        maTrend.push({ type: '🔥 MA5金叉', color: '#10b981' });
      }
      if (prevQ.ma5 >= prevQ.ma10 && q.ma5 < q.ma10) {
        maTrend.push({ type: '💀 MA5死叉', color: '#ef4444' });
      }
    }

    if (prevQ && prevQ.ma10 && prevQ.ma20 && q.ma10 && q.ma20) {
      if (prevQ.ma10 <= prevQ.ma20 && q.ma10 > q.ma20) {
        maTrend.push({ type: '🔥 MA10金叉MA20', color: '#10b981' });
      }
      if (prevQ.ma10 >= prevQ.ma20 && q.ma10 < q.ma20) {
        maTrend.push({ type: '💀 MA10死叉MA20', color: '#ef4444' });
      }
    }
  }

  // 量能分析
  const volumeTrend = [];
  if (q.volume && q.volume_ma5) {
    const volRatio = (q.volume / q.volume_ma5).toFixed(2);
    if (q.volume > q.volume_ma5 * 2) {
      volumeTrend.push({ type: `🔥 放量${volRatio}倍`, color: '#10b981' });
    } else if (q.volume > q.volume_ma5 * 1.5) {
      volumeTrend.push({ type: `📈 温和放量${volRatio}倍`, color: '#10b981' });
    } else if (q.volume < q.volume_ma5 * 0.5) {
      volumeTrend.push({ type: `📉 缩量${volRatio}倍`, color: '#ef4444' });
    } else if (q.volume < q.volume_ma5 * 0.8) {
      volumeTrend.push({ type: `⚠️ 地量`, color: '#f59e0b' });
    }

    if (prevQ && prevQ.volume) {
      const volChange = ((q.volume - prevQ.volume) / prevQ.volume * 100).toFixed(0);
      if (q.volume > prevQ.volume * 1.5) {
        volumeTrend.push({ type: `↗ 激增${volChange}%`, color: '#10b981' });
      } else if (q.volume < prevQ.volume * 0.7) {
        volumeTrend.push({ type: `↘ 暴减${volChange}%`, color: '#ef4444' });
      }
    }
  }

  // 计算阶段变化
  let phaseChange = '';
  let phaseChangeStrength = '';
  let phaseChangeColor = '';
  let operationAdvice = '';
  let operationColor = '';

  const phaseStrength = { 'U': 5, 'D': -5, 'A': 3, 'DS': 2, '震荡': 0 };
  const currentStrength = phaseStrength[currentPhase] || 0;
  const prevStrength = phaseStrength[prevPhase] || 0;
  const strengthDiff = currentStrength - prevStrength;

  if (currentPhase === prevPhase) {
    if (currentPhase === 'U') {
      phaseChange = '持续强势上涨';
      phaseChangeStrength = '📈 多头趋势延续';
      phaseChangeColor = '#10b981';
      operationAdvice = '✅ 持仓/逢低买入';
      operationColor = '#10b981';
    } else if (currentPhase === 'D') {
      phaseChange = '持续弱势下跌';
      phaseChangeStrength = '📉 空头趋势延续';
      phaseChangeColor = '#ef4444';
      operationAdvice = '⚠️ 观望/轻仓试探';
      operationColor = '#ef4444';
    } else if (currentPhase === 'A') {
      phaseChange = '持续吸筹';
      phaseChangeStrength = '🔄 主力继续吸筹';
      phaseChangeColor = '#f59e0b';
      operationAdvice = '👀 密切关注';
      operationColor = '#f59e0b';
    } else if (currentPhase === 'DS') {
      phaseChange = '持续下跌吸筹';
      phaseChangeStrength = '📥 洗盘吸筹延续';
      phaseChangeColor = '#8b5cf6';
      operationAdvice = '💎 关注低吸机会';
      operationColor = '#8b5cf6';
    } else {
      phaseChange = '持续震荡';
      phaseChangeStrength = '⚡ 震荡延续';
      phaseChangeColor = '#9ca3af';
      operationAdvice = '⏸️ 继续等待';
      operationColor = '#9ca3af';
    }
  } else {
    const transitions = {
      '震荡->U': { change: '转强向上', emoji: '🚀', color: '#10b981', advice: '🔥 积极买入', strength: '强势转强' },
      '震荡->D': { change: '转弱向下', emoji: '🔻', color: '#ef4444', advice: '⚠️ 及时止盈', strength: '强势转弱' },
      '震荡->A': { change: '进入吸筹', emoji: '🎯', color: '#f59e0b', advice: '👀 跟踪观察', strength: '开始活跃' },
      '震荡->DS': { change: '进入洗盘', emoji: '📥', color: '#8b5cf6', advice: '💎 准备低吸', strength: '开始调整' },
      'D->震荡': { change: '止跌企稳', emoji: '🛡️', color: '#9ca3af', advice: '⏸️ 观望为主', strength: '下跌趋缓' },
      'D->DS': { change: '下跌吸筹', emoji: '📥', color: '#8b5cf6', advice: '💎 分批低吸', strength: '止跌信号' },
      'D->A': { change: '反弹吸筹', emoji: '🔄', color: '#f59e0b', advice: '👀 谨慎参与', strength: '短线反弹' },
      'U->震荡': { change: '上涨乏力', emoji: '😰', color: '#f59e0b', advice: '⚠️ 获利了结', strength: '上涨趋缓' },
      'U->DS': { change: '回调洗盘', emoji: '📥', color: '#8b5cf6', advice: '💎 逢低介入', strength: '正常回调' },
      'U->A': { change: '高位吸筹', emoji: '⚠️', color: '#f59e0b', advice: '🚨 谨慎观望', strength: '派发风险' },
      'U->D': { change: '趋势反转', emoji: '💀', color: '#ef4444', advice: '🚨 果断离场', strength: '重大转弱' },
      'DS->U': { change: '重拾升势', emoji: '🚀', color: '#10b981', advice: '🔥 积极跟进', strength: '强势反转' },
      'DS->D': { change: '破位下行', emoji: '📉', color: '#ef4444', advice: '⚠️ 止损观望', strength: '继续下跌' },
      'A->U': { change: '吸筹完成', emoji: '🚀', color: '#10b981', advice: '🔥 积极买入', strength: '启动拉升' },
      'A->D': { change: '吸筹失败', emoji: '💔', color: '#ef4444', advice: '⚠️ 继续观望', strength: '转弱下跌' },
    };

    const transitionKey = `${prevPhase}->${currentPhase}`;
    if (transitions[transitionKey]) {
      const t = transitions[transitionKey];
      phaseChange = t.change;
      phaseChangeStrength = `${t.emoji} ${t.strength}`;
      phaseChangeColor = t.color;
      operationAdvice = t.advice;
      operationColor = t.color;
    } else {
      phaseChange = `${prevPhase}转${currentPhase}`;
      phaseChangeStrength = strengthDiff > 0 ? '📈 趋势转强' : '📉 趋势转弱';
      phaseChangeColor = strengthDiff > 0 ? '#10b981' : '#ef4444';
      operationAdvice = strengthDiff > 0 ? '👀 积极关注' : '⚠️ 谨慎观望';
      operationColor = strengthDiff > 0 ? '#10b981' : '#ef4444';
    }
  }

  // 检测是否为移动端
  const isMobile = window.innerWidth < 768;

  // 计算综合评分
  let maScore = 0;
  let phaseScore = 0;
  let volScore = 0;
  let trendBonus = 0;
  let warnings = [];
  let positives = [];

  const isBullishAlign = q.ma5 > q.ma10 && q.ma10 > q.ma20;
  const isBearishAlign = q.ma5 < q.ma10 && q.ma10 < q.ma20;

  if (isBullishAlign) {
    positives.push('均线多头排列');
    maScore = 2;
  } else if (isBearishAlign) {
    maScore = -2;
  } else {
    maScore = 0;
  }

  const phaseScores = { 'U': 2, 'A': 2, 'DS': 1, '震荡': 0, 'D': -2 };
  phaseScore = phaseScores[currentPhase] || 0;

  if (currentPhase === 'U') positives.push('威科夫上升阶段');
  else if (currentPhase === 'A') positives.push('威科夫吸筹阶段');
  else if (currentPhase === 'DS') positives.push('威科夫下跌吸筹');
  else if (currentPhase === 'D') warnings.push('威科夫下降阶段');

  if (q.volume && q.volume_ma5) {
    const volRatio = q.volume / q.volume_ma5;
    if (volRatio > 1.5) {
      volScore = 1;
      positives.push(`量能放大(${volRatio.toFixed(2)}倍)`);
    } else if (volRatio < 0.7) {
      volScore = -1;
      warnings.push(`缩量(${volRatio.toFixed(2)}倍)`);
    } else {
      volScore = 0;
    }
  }

  if (prevQ) {
    const phaseRank = { 'D': -2, '震荡': -1, 'DS': 0, 'A': 1, 'U': 2 };
    const currentPhaseRank = phaseRank[currentPhase] || 0;
    const prevPhaseRank = phaseRank[prevPhase] || 0;

    if (currentPhaseRank > prevPhaseRank) {
      trendBonus += 1;
      positives.push('阶段改善');
    }
  }

  const totalScore = maScore + phaseScore + volScore + trendBonus;

  const adviceColor = totalScore >= 4 ? '#10b981' : totalScore >= 2 ? '#10b981' : totalScore >= 0 ? '#f59e0b' : totalScore >= -2 ? '#9ca3af' : '#ef4444';
  const adviceEmoji = totalScore >= 4 ? '🚀' : totalScore >= 2 ? '📈' : totalScore >= 0 ? '⚖️' : totalScore >= -2 ? '👁️' : '⚠️';

  let advice = '';
  if (totalScore >= 4) {
    advice = '三指标共振向上，适合积极买入或持有';
  } else if (totalScore >= 2) {
    advice = '指标偏多，可适量参与，注意风险控制';
  } else if (totalScore >= 0) {
    advice = '多空平衡，可观察等待，关注趋势变化';
  } else if (totalScore >= -2) {
    advice = '指标偏弱但有改善迹象，建议观望等待';
  } else {
    advice = '三指标偏弱，建议减仓或空仓等待';
  }

  let detailHtml = '';
  if (warnings.length > 0 || positives.length > 0) {
    detailHtml = '<div style="font-size: 11px; margin-top: 6px; line-height: 1.5;">';
    if (warnings.length > 0) {
      detailHtml += `<div style="color: #f87171;">⚠️ ${warnings.join('，')}</div>`;
    }
    if (positives.length > 0) {
      detailHtml += `<div style="color: #34d399;">✅ ${positives.join('，')}</div>`;
    }
    detailHtml += '</div>';
  }

  // 创建弹窗HTML
  const modalHtml = `
    <div id="quoteModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    ">
      <div style="
        background: #1f2937;
        border-radius: 12px;
        max-width: 800px;
        width: 95%;
        max-height: ${isMobile ? '90vh' : '72.6vh'};
        padding: ${isMobile ? '12px' : '16px'};
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: ${isMobile ? '10px' : '12px'};
          border-bottom: 1px solid #374151;
          padding-bottom: ${isMobile ? '8px' : '10px'};
          flex-shrink: 0;
        ">
          <h2 style="font-size: ${isMobile ? '18px' : '16px'}; font-weight: 600; color: #f9fafb; margin: 0;">K线详情</h2>
          <button id="closeModalBtn" style="
            background: rgba(156, 163, 175, 0.2);
            border: 1px solid #9ca3af;
            color: #f9fafb;
            font-size: ${isMobile ? '28px' : '20px'};
            font-weight: bold;
            cursor: pointer;
            padding: 0;
            width: ${isMobile ? '40px' : '32px'};
            height: ${isMobile ? '40px' : '32px'};
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
          " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.borderColor='#ef4444';" onmouseout="this.style.background='rgba(156, 163, 175, 0.2)'; this.style.borderColor='#9ca3af';">&times;</button>
        </div>

        <div style="margin-bottom: 10px; overflow-y: auto; flex: 1;">
          <!-- 第1行：3列布局 -->
          <div style="display: grid; grid-template-columns: ${isMobile ? '50px 1fr 55px' : '75px 1fr 70px'}; gap: ${isMobile ? '6px' : '8px'}; margin-bottom: ${isMobile ? '10px' : '8px'};">
            <!-- 左侧：日期/涨跌幅 -->
            <div style="display: flex; flex-direction: column; gap: ${isMobile ? '6px' : '8px'};">
              <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px; flex: 1;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '9px' : '11px'}; margin-bottom: 2px;">日期</div>
                <div style="font-size: ${isMobile ? '11px' : '14px'}; font-weight: 600;">${formatDateString(q.date, currentTimeframe)}</div>
              </div>
              <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px; flex: 1;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '9px' : '11px'}; margin-bottom: 2px;">涨跌幅</div>
                <div style="font-size: ${isMobile ? '12px' : '14px'}; font-weight: 600; color: ${change >= 0 ? '#ef4444' : '#10b981'};">
                  ${changeSign}${change}%
                </div>
              </div>
            </div>

            <!-- 中间：OHLC -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: ${isMobile ? '4px' : '6px'};">
              <div style="background: #111827; padding: ${isMobile ? '4px' : '6px'}; border-radius: 4px;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '8px' : '10px'}; margin-bottom: 1px;">开</div>
                <div style="font-size: ${isMobile ? '16px' : '24px'}; font-weight: 600;">${q.open != null ? q.open.toFixed(2) : 'N/A'}</div>
              </div>
              <div style="background: #111827; padding: ${isMobile ? '4px' : '6px'}; border-radius: 4px;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '8px' : '10px'}; margin-bottom: 1px;">高</div>
                <div style="font-size: ${isMobile ? '16px' : '24px'}; font-weight: 600; color: #10b981;">${q.high != null ? q.high.toFixed(2) : 'N/A'}</div>
              </div>
              <div style="background: #111827; padding: ${isMobile ? '4px' : '6px'}; border-radius: 4px;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '8px' : '10px'}; margin-bottom: 1px;">低</div>
                <div style="font-size: ${isMobile ? '16px' : '24px'}; font-weight: 600; color: #ef4444;">${q.low != null ? q.low.toFixed(2) : 'N/A'}</div>
              </div>
              <div style="background: #111827; padding: ${isMobile ? '4px' : '6px'}; border-radius: 4px;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '8px' : '10px'}; margin-bottom: 1px;">收</div>
                <div style="font-size: ${isMobile ? '16px' : '24px'}; font-weight: 600; color: ${isRed ? '#ef4444' : '#10b981'};">${q.close != null ? q.close.toFixed(2) : 'N/A'}</div>
                ${getSignalStrength(q, prevQ)}
              </div>
            </div>

            <!-- 右侧：成交量/成交额/OBV -->
            <div style="display: flex; flex-direction: column; gap: ${isMobile ? '6px' : '8px'};">
              <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px; flex: 1;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '9px' : '11px'}; margin-bottom: ${isMobile ? '2px' : '4px'};">成交量</div>
                <div style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 500;">${q.volume ? (q.volume / 10000).toFixed(0) + '万' : 'N/A'}</div>
                ${q.volume_ma5 ? `<div style="font-size: ${isMobile ? '9px' : '11px'}; color: #9ca3af; margin-top: 2px;">均量${(q.volume_ma5 / 10000).toFixed(0)}万</div>` : ''}
              </div>
              <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px; flex: 1;">
                <div style="color: #9ca3af; font-size: ${isMobile ? '9px' : '11px'}; margin-bottom: ${isMobile ? '2px' : '4px'};">成交额</div>
                <div style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 500;">${q.amount ? (q.amount / 100000000).toFixed(2) + '亿' : 'N/A'}</div>
                ${q.obv ? `<div style="font-size: ${isMobile ? '9px' : '11px'}; color: #9ca3af; margin-top: 2px; cursor: help;" title="OBV能量潮：${(q.obv / 1000000).toFixed(1)}M\n\n指标说明：\n上涨日累加成交量\n下跌日累减成交量\n用于验证价格趋势">OBV${(q.obv / 1000000).toFixed(1)}M</div>` : ''}
              </div>
            </div>
          </div>

          <!-- 综合操作建议 -->
          <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15)); padding: 10px; border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(139, 92, 246, 0.3);">
            <div style="font-size: 11px; font-weight: 600; color: #8b5cf6; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">💡 今日综合操作建议</div>
            <div style="font-size: 13px; font-weight: 600; color: #f9fafb; margin-bottom: 6px;">
              <span style="color: ${adviceColor};">${adviceEmoji} ${advice}</span>${detailHtml}
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #d1d5db;">
              <span>均线:${(() => {
                const score = (q.ma5 > q.ma10 ? 1 : -1) + (q.ma10 > q.ma20 ? 1 : -1) + (q.close > q.ma20 ? 1 : -1);
                if (score >= 2) return '↗多头';
                if (score <= -2) return '↘空头';
                return '→中性';
              })()}</span>
              <span>量能:${q.volume_ma5 && q.volume > q.volume_ma5 * 1.2 ? '↗放量' : q.volume_ma5 && q.volume < q.volume_ma5 * 0.8 ? '↘缩量' : '→平稳'}</span>
              <span class="wyckoff-tooltip" style="cursor: help;" data-tooltip="${phaseTooltip}">威科夫:${currentPhase === 'U' ? '📈上升' : currentPhase === 'D' ? '📉下降' : currentPhase === 'A' ? '🔄吸筹' : currentPhase === 'DS' ? '📥下跌吸筹' : '⚡震荡'}</span>
            </div>
          </div>

          <!-- 三列布局 -->
          <div style="display: ${isMobile ? 'flex' : 'grid'}; ${isMobile ? 'flex-direction: column; gap: 6px;' : 'grid-template-columns: 1fr 1fr 1fr; gap: 10px;'} margin-bottom: 8px;">
            <!-- 1. 均线分析 -->
            <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px;">
              <div style="color: #9ca3af; font-size: ${isMobile ? '10px' : '11px'}; margin-bottom: ${isMobile ? '4px' : '6px'}; font-weight: 600;">均线指标 (MA5-MA250)</div>
              <div style="margin-bottom: ${isMobile ? '6px' : '8px'};">
                ${maTrend.length > 0 ? `
                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: ${isMobile ? '4px' : '6px'};">
                  ${maTrend.slice(0, 2).map(trend => `
                    <span style="padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: 600; background: ${trend.color}20; color: ${trend.color}; border: 1px solid ${trend.color};">${trend.type}</span>
                  `).join('')}
                </div>
                ` : ''}

                <!-- 短线指标 -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-bottom: 4px;">
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #3b82f6;">MA5:</span>${q.ma5?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma5 ? `<span style="font-size: 8px; color: ${q.ma5 > prevQ.ma5 ? '#10b981' : '#ef4444'};">(${q.ma5 > prevQ.ma5 ? '+' : ''}${(q.ma5 - prevQ.ma5).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #8b5cf6;">MA10:</span>${q.ma10?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma10 ? `<span style="font-size: 8px; color: ${q.ma10 > prevQ.ma10 ? '#10b981' : '#ef4444'};">(${q.ma10 > prevQ.ma10 ? '+' : ''}${(q.ma10 - prevQ.ma10).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #10b981;">MA15:</span>${q.ma15?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma15 ? `<span style="font-size: 8px; color: ${q.ma15 > prevQ.ma15 ? '#10b981' : '#ef4444'};">(${q.ma15 > prevQ.ma15 ? '+' : ''}${(q.ma15 - prevQ.ma15).toFixed(2)})</span>` : ''}
                  </div>
                </div>

                <!-- 中线指标 -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;">
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #ec4899;">MA20:</span>${q.ma20?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma20 ? `<span style="font-size: 8px; color: ${q.ma20 > prevQ.ma20 ? '#10b981' : '#ef4444'};">(${q.ma20 > prevQ.ma20 ? '+' : ''}${(q.ma20 - prevQ.ma20).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #f43f5e;">MA30:</span>${q.ma30?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma30 ? `<span style="font-size: 8px; color: ${q.ma30 > prevQ.ma30 ? '#10b981' : '#ef4444'};">(${q.ma30 > prevQ.ma30 ? '+' : ''}${(q.ma30 - prevQ.ma30).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #a855f7;">MA60:</span>${q.ma60?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma60 ? `<span style="font-size: 8px; color: ${q.ma60 > prevQ.ma60 ? '#10b981' : '#ef4444'};">(${q.ma60 > prevQ.ma60 ? '+' : ''}${(q.ma60 - prevQ.ma60).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #6366f1;">MA90:</span>${q.ma90?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma90 ? `<span style="font-size: 8px; color: ${q.ma90 > prevQ.ma90 ? '#10b981' : '#ef4444'};">(${q.ma90 > prevQ.ma90 ? '+' : ''}${(q.ma90 - prevQ.ma90).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #f97316;">MA120:</span>${q.ma120?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma120 ? `<span style="font-size: 8px; color: ${q.ma120 > prevQ.ma120 ? '#10b981' : '#ef4444'};">(${q.ma120 > prevQ.ma120 ? '+' : ''}${(q.ma120 - prevQ.ma120).toFixed(2)})</span>` : ''}
                  </div>
                  <div style="font-size: 9px; background: #1f2937; padding: 3px 4px; border-radius: 3px;">
                    <span style="color: #eab308;">MA250:</span>${q.ma250?.toFixed(2) || '-'}
                    ${prevQ && prevQ.ma250 ? `<span style="font-size: 8px; color: ${q.ma250 > prevQ.ma250 ? '#10b981' : '#ef4444'};">(${q.ma250 > prevQ.ma250 ? '+' : ''}${(q.ma250 - prevQ.ma250).toFixed(2)})</span>` : ''}
                  </div>
                </div>
              </div>
              <!-- 历史对比 -->
              ${prevQ && prevQ.ma5 && prevQ.ma10 && prevQ.ma20 ? `
              <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); padding: 6px; border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af; margin-bottom: 1px;">上期</div>
                    <div style="font-size: 12px; font-weight: 600; color: #d1d5db;">
                      ${(() => {
                        const score = (prevQ.ma5 > prevQ.ma10 ? 1 : -1) + (prevQ.ma10 > prevQ.ma20 ? 1 : -1) + (prevQ.close > prevQ.ma20 ? 1 : -1);
                        if (score >= 2) return '↗';
                        if (score <= -2) return '↘';
                        return '→';
                      })()}
                    </div>
                  </div>
                  <div style="font-size: 14px; color: ${phaseChangeColor};">${phaseChangeStrength}</div>
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af; margin-bottom: 1px;">本期</div>
                    <div style="font-size: 12px; font-weight: 600; color: #d1d5db;">
                      ${(() => {
                        const score = (q.ma5 > q.ma10 ? 1 : -1) + (q.ma10 > q.ma20 ? 1 : -1) + (q.close > q.ma20 ? 1 : -1);
                        if (score >= 2) return '↗';
                        if (score <= -2) return '↘';
                        return '→';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              ` : '<div style="text-align: center; color: #9ca3af; font-size: 9px; padding: 10px 0;">无历史数据</div>'}
            </div>

            <!-- 2. 量能分析 -->
            <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px;">
              <div style="color: #9ca3af; font-size: ${isMobile ? '10px' : '11px'}; margin-bottom: ${isMobile ? '4px' : '6px'}; font-weight: 600;">量能分析与对比</div>
              <div style="margin-bottom: ${isMobile ? '6px' : '8px'};">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div style="font-size: 9px; color: #9ca3af;">当天成交量</div>
                  <div style="font-size: 14px; font-weight: 600; color: #f9fafb;">${q.volume ? (q.volume / 10000).toFixed(0) + '万' : '-'}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div style="font-size: 9px; color: #9ca3af;">量MA5</div>
                  <div style="font-size: 12px; color: #d1d5db;">${q.volume_ma5 ? (q.volume_ma5 / 10000).toFixed(0) + '万' : '-'}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <div style="font-size: 9px; color: #9ca3af;">量能倍数</div>
                  <div style="font-size: 12px; font-weight: 600; color: ${q.volume && q.volume_ma5 ? (q.volume / q.volume_ma5 > 1.2 ? '#10b981' : q.volume / q.volume_ma5 < 0.8 ? '#ef4444' : '#f59e0b') : '#9ca3af'};">
                    ${q.volume && q.volume_ma5 ? (q.volume / q.volume_ma5).toFixed(2) + 'x' : '-'}
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: ${q.volume && q.volume_ma5 && q.volume > q.volume_ma5 * 1.2 ? 'rgba(16, 185, 129, 0.1)' : q.volume && q.volume_ma5 && q.volume < q.volume_ma5 * 0.8 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(156, 163, 175, 0.1)'}; border-radius: 4px; border: 1px solid ${q.volume && q.volume_ma5 && q.volume > q.volume_ma5 * 1.2 ? '#10b98140' : q.volume && q.volume_ma5 && q.volume < q.volume_ma5 * 0.8 ? '#ef444440' : '#9ca3af40'};">
                  <div style="font-size: 9px; color: #9ca3af;">量能状态</div>
                  <div style="font-size: 10px; font-weight: 600; color: ${q.volume_ma5 && q.volume > q.volume_ma5 * 1.2 ? '#10b981' : q.volume_ma5 && q.volume < q.volume_ma5 * 0.8 ? '#ef4444' : '#9ca3af'};">
                    ${q.volume_ma5 && q.volume > q.volume_ma5 * 1.2 ? '↗ 放量' : q.volume_ma5 && q.volume < q.volume_ma5 * 0.8 ? '↘ 缩量' : '→ 平稳'}
                  </div>
                </div>
              </div>
              <!-- 历史对比 -->
              ${prevQ && prevQ.volume && q.volume ? `
              <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); padding: 6px; border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3);">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af; margin-bottom: 1px;">上期</div>
                    <div style="font-size: 11px; font-weight: 600; color: #d1d5db;">${(prevQ.volume / 10000).toFixed(0)}万</div>
                  </div>
                  <div style="font-size: 14px; color: ${q.volume > prevQ.volume ? '#10b981' : q.volume < prevQ.volume ? '#ef4444' : '#9ca3af'};">
                    ${q.volume > prevQ.volume ? '↗' : q.volume < prevQ.volume ? '↘' : '→'}
                  </div>
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af; margin-bottom: 1px;">本期</div>
                    <div style="font-size: 11px; font-weight: 600; color: #d1d5db;">${(q.volume / 10000).toFixed(0)}万</div>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 4px; font-size: 9px; color: ${q.volume > prevQ.volume ? '#10b981' : q.volume < prevQ.volume ? '#ef4444' : '#9ca3af'};">
                  ${q.volume > prevQ.volume ? '+' : ''}${((q.volume - prevQ.volume) / prevQ.volume * 100).toFixed(1)}%
                </div>
              </div>
              ` : '<div style="text-align: center; color: #9ca3af; font-size: 9px; padding: 10px 0;">无历史数据</div>'}
            </div>

            <!-- 3. 威科夫阶段 -->
            <div style="background: #111827; padding: ${isMobile ? '6px' : '8px'}; border-radius: 4px;">
              <div style="color: #9ca3af; font-size: ${isMobile ? '10px' : '11px'}; margin-bottom: ${isMobile ? '6px' : '8px'}; font-weight: 600;">威科夫阶段</div>

              <div class="modal-wyckoff-tooltip" style="display: flex; align-items: center; justify-content: space-between; cursor: help; margin-bottom: ${isMobile ? '8px' : '10px'}; padding: ${isMobile ? '4px 6px' : '6px 8px'}; background: rgba(0,0,0,0.2); border-radius: 4px;" data-tooltip="${phaseTooltip}">
                <div style="font-size: ${isMobile ? '11px' : '13px'}; font-weight: 600; color: ${phaseColor};">
                  ${currentPhase === 'U' ? 'U 上升' : currentPhase === 'D' ? 'D 下降' : currentPhase === 'A' ? 'A 吸筹' : currentPhase === 'DS' ? 'DS 下跌吸筹' : '震荡'}
                </div>
                <div style="font-size: ${isMobile ? '20px' : '24px'}; line-height: 1;">${currentPhase === 'U' ? '📈' : currentPhase === 'D' ? '📉' : currentPhase === 'A' ? '🔄' : currentPhase === 'DS' ? '📥' : '⚡'}</div>
              </div>

              ${prevQ ? `
              <div style="display: flex; flex-direction: column; gap: ${isMobile ? '6px' : '8px'};">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: ${isMobile ? '4px' : '6px'}; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); border-radius: 4px; border: 1px solid rgba(139, 92, 246, 0.3);">
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af;">上期</div>
                    <div style="font-size: ${isMobile ? '12px' : '14px'};">${prevPhase === 'U' ? '📈' : prevPhase === 'D' ? '📉' : prevPhase === 'A' ? '🔄' : prevPhase === 'DS' ? '📥' : '⚡'}</div>
                  </div>
                  <div style="font-size: ${isMobile ? '12px' : '14px'}; color: ${phaseChangeColor};">${phaseChangeStrength}</div>
                  <div style="text-align: center;">
                    <div style="font-size: 8px; color: #9ca3af;">本期</div>
                    <div style="font-size: ${isMobile ? '12px' : '14px'};">${currentPhase === 'U' ? '📈' : currentPhase === 'D' ? '📉' : currentPhase === 'A' ? '🔄' : currentPhase === 'DS' ? '📥' : '⚡'}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; padding: ${isMobile ? '4px' : '6px'}; background: ${operationColor}15; border-radius: 4px; border-left: 3px solid ${operationColor};">
                  <span style="font-size: ${isMobile ? '12px' : '14px'};">💡</span>
                  <span style="font-size: ${isMobile ? '10px' : '11px'}; font-weight: 600; color: ${operationColor}; flex: 1;">${operationAdvice}</span>
                </div>
              </div>
              ` : '<div style="text-align: center; color: #9ca3af; font-size: 9px; padding: 15px 0;">无历史数据</div>'}
            </div>
          </div>
        </div>
      </div>
    </div>
    <style>
      .modal-wyckoff-tooltip:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(17, 24, 39, 0.98);
        color: #e5e7eb;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 10px;
        white-space: pre-line;
        z-index: 1000;
        margin-bottom: 6px;
        min-width: 200px;
        text-align: center;
        border: 1px solid #374151;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        pointer-events: none;
      }
      .wyckoff-tooltip:hover::after {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: 10px;
        padding: 12px 16px;
        background: rgba(31, 41, 55, 0.98);
        color: #f9fafb;
        border-radius: 8px;
        font-size: 12px;
        white-space: pre-line;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s;
        border: 1px solid #4b5563;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        z-index: 99999;
        min-width: 200px;
        max-width: 350px;
        text-align: left;
        line-height: 1.6;
        backdrop-filter: blur(10px);
      }
      .wyckoff-tooltip:hover::after {
        opacity: 1;
      }
    </style>
  `;

  modalManager.showRaw(modalHtml);

  // 绑定关闭按钮
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modalManager.close());
  }

  // 点击背景关闭
  const modal = document.getElementById('quoteModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modalManager.close();
      }
    });
  }
}

export default modalManager;
