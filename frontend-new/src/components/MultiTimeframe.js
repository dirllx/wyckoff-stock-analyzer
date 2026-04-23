/**
 * 多周期分析组件
 * 同时分析多个时间周期并生成综合建议
 * 完全匹配旧版本功能
 */

import { stocksApi } from '../api/stocks.js';
import apiClient from '../api/client.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { formatDateString } from '../utils/formatting.js';

/**
 * 多周期分析类
 */
export class MultiTimeframe {
  /**
   * 周期名称映射
   */
  static TIMEFRAME_NAMES = {
    '30': '30分',
    '60': '60分',
    'daily': '日线',
    'weekly': '周线',
    'monthly': '月线'
  };

  /**
   * 按时间周期类型分组（与旧版本一致）
   * @param {Array} analysisData - 分析数据数组
   * @returns {Object} 分组后的数据 {shortTerm, midTerm, longTerm}
   */
  static groupTimeframesByType(analysisData) {
    if (!analysisData || analysisData.length === 0) {
      return { shortTerm: [], midTerm: [], longTerm: [] };
    }

    // 短线：30分钟、60分钟、日线
    const shortTerm = analysisData.filter(d => ['30', '60', 'daily'].includes(d.timeframe));

    // 中线：60分钟、日线、周线
    const midTerm = analysisData.filter(d => ['60', 'daily', 'weekly'].includes(d.timeframe));

    // 长线：日线、周线、月线
    const longTerm = analysisData.filter(d => ['daily', 'weekly', 'monthly'].includes(d.timeframe));

    return { shortTerm, midTerm, longTerm };
  }

  /**
   * 生成各阶段综合分析（与旧版本一致）
   * @param {Array} phaseData - 阶段数据
   * @param {string} phaseName - 阶段名称（用于日志）
   * @returns {Object} 阶段分析结果
   */
  static generatePhaseAnalysis(phaseData, phaseName = '') {
    if (!phaseData || phaseData.length === 0) {
      return {
        avgScore: 0,
        trend: '中性',
        direction: 'NEUTRAL',
        maSignal: '无信号',
        volumeSignal: '无明显量能',
        wyckoffSignal: '震荡',
        suggestion: '数据不足',
        bullishCount: 0,
        bearishCount: 0
      };
    }

    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let maBullish = 0;
    let maBearish = 0;
    let volumeHigh = 0;
    const phaseTypes = {};

    phaseData.forEach(data => {
      const summary = data.summary || data;
      const score = summary.score || 0;
      totalScore += score;

      const direction = summary.direction || 'NEUTRAL';
      if (direction === 'LONG') bullishCount++;
      if (direction === 'SHORT') bearishCount++;

      // 统计均线趋势
      if (summary.ma_trend && Array.isArray(summary.ma_trend)) {
        summary.ma_trend.forEach(trend => {
          if (trend.type && trend.type.includes('多头')) maBullish++;
          if (trend.type && trend.type.includes('空头')) maBearish++;
          if (trend.type && trend.type.includes('金叉')) maBullish++;
          if (trend.type && trend.type.includes('死叉')) maBearish++;
        });
      }

      // 统计量能
      if (summary.volume_signal === 'HIGH') volumeHigh++;

      // 使用后端返回的威科夫阶段
      const wyckoffPhase = summary.wyckoff_phase || '';
      let phaseCode = '震荡';
      if (wyckoffPhase.includes('U') || wyckoffPhase.includes('上升')) {
        phaseCode = 'U';
      } else if (wyckoffPhase.includes('D') && !wyckoffPhase.includes('DS')) {
        phaseCode = 'D';
      } else if (wyckoffPhase.includes('A') || wyckoffPhase.includes('吸筹')) {
        phaseCode = 'A';
      } else if (wyckoffPhase.includes('DS')) {
        phaseCode = 'DS';
      }

      phaseTypes[phaseCode] = (phaseTypes[phaseCode] || 0) + 1;
    });

    const avgScore = totalScore / phaseData.length;

    // 确定趋势
    let trend = '震荡';
    if (bullishCount > bearishCount && bullishCount > phaseData.length / 2) {
      trend = '上涨';
    } else if (bearishCount > bullishCount && bearishCount > phaseData.length / 2) {
      trend = '下跌';
    } else if (bullishCount > bearishCount) {
      trend = '偏多';
    } else if (bearishCount > bullishCount) {
      trend = '偏空';
    }

    // 确定方向
    let direction = 'NEUTRAL';
    if (avgScore >= 6) {
      direction = 'LONG';
    } else if (avgScore <= 4) {
      direction = 'SHORT';
    } else if (bullishCount > bearishCount) {
      direction = 'LONG';
    } else if (bearishCount > bullishCount) {
      direction = 'SHORT';
    }

    // MA信号描述
    let maSignal = '中性';
    if (maBullish > maBearish) {
      maSignal = maBullish >= 2 ? '多头排列' : '偏多';
    } else if (maBearish > maBullish) {
      maSignal = maBearish >= 2 ? '空头排列' : '偏空';
    }

    // 量能信号描述
    let volumeSignal = '无明显量能';
    if (volumeHigh >= 2) {
      volumeSignal = '持续放量';
    } else if (volumeHigh === 1) {
      volumeSignal = '温和放量';
    }

    // 威科夫信号描述 - 取出现最多的阶段
    let wyckoffSignal = '震荡';
    let maxCount = 0;
    Object.entries(phaseTypes).forEach(([phase, count]) => {
      if (count > maxCount) {
        maxCount = count;
        wyckoffSignal = phase;
      }
    });

    // 生成建议
    let suggestion = '观望等待';
    if (direction === 'LONG' && trend === '上涨') {
      suggestion = '积极做多';
    } else if (direction === 'LONG' && trend === '偏多') {
      suggestion = '谨慎做多';
    } else if (direction === 'SHORT') {
      suggestion = '建议观望';
    } else if (direction === 'NEUTRAL') {
      suggestion = '观望等待';
    }

    return {
      avgScore: avgScore.toFixed(1),
      trend,
      direction,
      maSignal,
      volumeSignal,
      wyckoffSignal,
      suggestion,
      bullishCount,
      bearishCount,
      maBullish,
      maBearish
    };
  }

  /**
   * 分析综合建议（返回对象，用于测试）
   * @param {Object} shortAnalysis - 短线分析
   * @param {Object} midAnalysis - 中线分析
   * @param {Object} longAnalysis - 长线分析
   * @returns {Object} 建议对象
   */
  static analyzeComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis) {
    const allLong = shortAnalysis.direction === 'LONG' && midAnalysis.direction === 'LONG' && longAnalysis.direction === 'LONG';
    const allShort = shortAnalysis.direction === 'SHORT' && midAnalysis.direction === 'SHORT' && longAnalysis.direction === 'SHORT';

    // 计算一致性
    const directions = [shortAnalysis.direction, midAnalysis.direction, longAnalysis.direction];
    const longCount = directions.filter(d => d === 'LONG').length;
    const shortCount = directions.filter(d => d === 'SHORT').length;
    const consistency = Math.max(longCount, shortCount) / 3;

    // 计算平均分
    const avgScore = (parseFloat(shortAnalysis.avgScore) + parseFloat(midAnalysis.avgScore) + parseFloat(longAnalysis.avgScore)) / 3;

    // 确定强度
    let strength = 'weak';
    if (consistency >= 0.67 && avgScore >= 6) {
      strength = 'strong';
    } else if (consistency >= 0.33 || avgScore >= 5) {
      strength = 'moderate';
    }

    // 确定方向
    let direction = 'NEUTRAL';
    if (allLong) {
      direction = 'LONG';
    } else if (allShort) {
      direction = 'SHORT';
    } else if (longCount >= 2) {
      direction = 'LONG';
    } else if (shortCount >= 2) {
      direction = 'SHORT';
    }

    // 生成文本
    let text = '';
    if (allLong) {
      text = '🚀 三周期共振看涨，短中长期趋势一致向上，强烈做多！';
    } else if (allShort) {
      text = '⚠️ 三周期共振看跌，短中长期趋势一致向下，空仓观望！';
    } else if (longAnalysis.direction === 'LONG') {
      if (midAnalysis.direction === 'LONG' && shortAnalysis.direction === 'NEUTRAL') {
        text = '✅ 中长线看涨，短线整理，可逢低布局，耐心持有';
      } else if (midAnalysis.direction === 'LONG') {
        text = '✅ 长线向好，短线波动，可考虑波段操作';
      } else {
        text = '⏸️ 长线趋势向上，但中短线转弱，暂时观望，等待企稳';
      }
    } else if (longAnalysis.direction === 'SHORT') {
      text = '❌ 长线转弱，建议控制仓位或离场观望';
    } else {
      text = '⏳ 各周期分歧较大，建议观望等待共振信号出现';
    }

    // 计算信心度
    let confidence = 0.5;
    if (strength === 'strong') {
      confidence = 0.8 + (avgScore - 6) * 0.1;
    } else if (strength === 'moderate') {
      confidence = 0.5 + (avgScore - 5) * 0.1;
    }
    confidence = Math.min(Math.max(confidence, 0.3), 0.95);

    return {
      direction,
      strength,
      text,
      confidence,
      consistency,
      avgScore
    };
  }

  /**
   * 生成综合操作建议HTML（与旧版本一致）
   * 当作为HTML渲染使用时返回HTML，否则返回对象（用于测试）
   * @param {Object} shortAnalysis - 短线分析
   * @param {Object} midAnalysis - 中线分析
   * @param {Object} longAnalysis - 长线分析
   * @param {boolean} isMobile - 是否移动端
   * @param {boolean} compact - 是否紧凑模式
   * @returns {string|Object} HTML字符串或建议对象
   */
  static generateComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis, isMobile = false, compact = false) {
    // 如果是测试调用（只有3个参数），返回对象
    if (arguments.length === 3) {
      return this.analyzeComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis);
    }

    const allLong = shortAnalysis.direction === 'LONG' && midAnalysis.direction === 'LONG' && longAnalysis.direction === 'LONG';
    const allShort = shortAnalysis.direction === 'SHORT' && midAnalysis.direction === 'SHORT' && longAnalysis.direction === 'SHORT';

    let suggestion = '';
    let bgColor = '#1f2937';

    if (allLong) {
      suggestion = '🚀 三周期共振看涨，短中长期趋势一致向上，积极做多！';
      bgColor = 'linear-gradient(135deg, #065f46, #10b981)';
    } else if (allShort) {
      suggestion = '⚠️ 三周期共振看跌，短中长期趋势一致向下，空仓观望！';
      bgColor = 'linear-gradient(135deg, #7f1d1d, #ef4444)';
    } else if (longAnalysis.direction === 'LONG') {
      if (midAnalysis.direction === 'LONG' && shortAnalysis.direction === 'NEUTRAL') {
        suggestion = '✅ 中长线看涨，短线整理，可逢低布局，耐心持有';
        bgColor = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
      } else if (midAnalysis.direction === 'LONG') {
        suggestion = '✅ 长线向好，短线波动，可考虑波段操作';
        bgColor = 'linear-gradient(135deg, #1e3a8a, #3b82f6)';
      } else {
        suggestion = '⏸️ 长线趋势向上，但中短线转弱，暂时观望，等待企稳';
        bgColor = 'linear-gradient(135deg, #78350f, #f59e0b)';
      }
    } else if (longAnalysis.direction === 'SHORT') {
      suggestion = '❌ 长线转弱，建议控制仓位或离场观望';
      bgColor = 'linear-gradient(135deg, #7f1d1d, #ef4444)';
    } else {
      suggestion = '⏳ 各周期分歧较大，建议观望等待共振信号出现';
      bgColor = 'linear-gradient(135deg, #374151, #6b7280)';
    }

    const padding = compact ? (isMobile ? '6px' : '8px') : (isMobile ? '8px' : '10px');
    const margin = compact ? (isMobile ? '8px 0 4px 0' : '10px 0 5px 0') : (isMobile ? '12px 0 6px 0' : '16px 0 8px 0');
    const titleMarginBottom = compact ? '2px' : (isMobile ? '3px' : '4px');
    const titleFontSize = compact ? (isMobile ? '10px' : '11px') : (isMobile ? '11px' : '12px');
    const textFontSize = compact ? (isMobile ? '11px' : '12px') : (isMobile ? '12px' : '13px');
    const lineHeight = compact ? '1.3' : '1.4';

    return `
      <div style="background: ${bgColor}; border-radius: ${isMobile ? '6px' : '8px'}; padding: ${padding}; margin: ${margin}; border: 1px solid rgba(255,255,255,0.1);">
        <div style="color: #fbbf24; font-size: ${titleFontSize}; font-weight: 600; margin-bottom: ${titleMarginBottom};">💡 综合操作建议</div>
        <div style="color: #ffffff; font-size: ${textFontSize}; line-height: ${lineHeight};">${suggestion}</div>
      </div>
    `;
  }

  /**
   * 渲染阶段卡片（与旧版本一致）
   * @param {string} title - 标题
   * @param {Object} analysis - 分析结果
   * @param {string} colorBase - 基础颜色
   * @param {string} timeframes - 时间周期描述
   * @param {boolean} isMobile - 是否移动端
   * @param {boolean} compact - 是否紧凑模式
   * @returns {string} HTML字符串
   */
  static renderPhaseCard(title, analysis, colorBase, timeframes, isMobile = false, compact = false) {
    const scoreColor = analysis.direction === 'LONG' ? '#10b981' :
                         analysis.direction === 'SHORT' ? '#ef4444' : '#9ca3af';

    const padding = compact ? (isMobile ? '6px' : '8px') : (isMobile ? '10px' : '12px');
    const marginBottom = compact ? '4px' : (isMobile ? '6px' : '8px');
    const titleFontSize = compact ? (isMobile ? '11px' : '12px') : (isMobile ? '12px' : '13px');
    const scoreFontSize = compact ? (isMobile ? '14px' : '16px') : (isMobile ? '16px' : '18px');
    const infoFontSize = compact ? (isMobile ? '9px' : '10px') : (isMobile ? '10px' : '11px');
    const infoMarginBottom = compact ? '2px' : (isMobile ? '4px' : '6px');

    // 添加方向文本映射
    const directionText = analysis.direction === 'LONG' ? '做多' :
                          analysis.direction === 'SHORT' ? '做空' : '观望';

    return `
      <div style="background: linear-gradient(135deg, ${colorBase}20, ${colorBase}40); border-radius: ${isMobile ? '6px' : '8px'}; padding: ${padding}; border: 1px solid ${colorBase}60;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${marginBottom};">
          <span style="color: #ffffff; font-size: ${titleFontSize}; font-weight: 600;">${title}</span>
          <span style="color: ${scoreColor}; font-size: ${scoreFontSize}; font-weight: 700;">${analysis.avgScore}</span>
        </div>
        <div style="color: ${colorBase}; font-size: ${infoFontSize}; margin-bottom: ${infoMarginBottom};">${timeframes}</div>
        <div style="color: #d1d5db; font-size: ${infoFontSize}; line-height: 1.3;">${analysis.trend} ${directionText}</div>
      </div>
    `;
  }

  /**
   * 渲染各阶段详细周期卡片（与旧版本一致）
   * @param {string} phaseTitle - 阶段标题
   * @param {Array} phaseData - 阶段数据
   * @param {boolean} isMobile - 是否移动端
   * @param {boolean} compact - 是否紧凑模式
   * @returns {string} HTML字符串
   */
  static renderPhaseDetailCards(phaseTitle, phaseData, isMobile = false, compact = false) {
    let html = '';

    if (!phaseData || phaseData.length === 0) {
      return html;
    }

    // 定义固定顺序：30分、60分、日线、周线、月线
    const order = ['30', '60', 'daily', 'weekly', 'monthly'];

    // 按固定顺序排序
    const sortedData = [...phaseData].sort((a, b) => {
      return order.indexOf(a.timeframe) - order.indexOf(b.timeframe);
    });

    const margin = compact ? '8px 0 4px 0' : '16px 0 8px 0';
    const titleFontSize = compact ? '11px' : '13px';
    const titleMargin = compact ? '4px' : '6px';
    const cardPadding = compact ? '6px 8px' : '8px 10px';
    const cardMinWidth = compact ? '140px' : '180px';
    const priceFontSize = compact ? '15px' : '18px';
    const gap = compact ? '6px' : '8px';

    html += `<div style="margin: ${margin};">`;
    html += `<div style="color: #f9fafb; font-size: ${titleFontSize}; font-weight: 600; margin-bottom: ${titleMargin}; padding-left: 4px;">${phaseTitle}</div>`;
    html += `<div style="display: flex; gap: ${gap}; overflow-x: auto; padding-bottom: 4px;">`;

    sortedData.forEach(data => {
      const tfName = this.TIMEFRAME_NAMES[data.timeframe] || data.timeframe;
      const summary = data.summary || data;
      const quote = data.quote;
      const direction = summary.direction || 'NEUTRAL';
      const score = summary.score || 0;

      let directionColor = '#9ca3af';
      let directionIcon = '→';
      if (direction === 'LONG') {
        directionColor = '#10b981';
        directionIcon = '📈';
      } else if (direction === 'SHORT') {
        directionColor = '#ef4444';
        directionIcon = '📉';
      }

      let scoreColor = '#9ca3af';
      if (score >= 3) scoreColor = '#10b981';
      else if (score >= 1) scoreColor = '#f59e0b';
      else if (score <= -1) scoreColor = '#ef4444';

      html += `
        <div style="background: #111827; border-radius: 6px; padding: ${cardPadding}; border: 1px solid ${directionColor}40; min-width: ${cardMinWidth}; flex-shrink: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #f9fafb; font-size: 11px; font-weight: 600;">${tfName}</span>
            <div style="display: flex; gap: 3px; align-items: center;">
              <span style="font-size: 10px; color: ${directionColor};">${directionIcon}</span>
              <span style="font-size: 10px; font-weight: 600; color: ${scoreColor};">${score}</span>
            </div>
          </div>
          ${quote ? `
          <div style="font-size: ${priceFontSize}; font-weight: 700; color: #f9fafb; margin-bottom: 4px;">
            ${quote.close?.toFixed(2) || '-'}
            ${quote.volume ? `<span style="font-size: 9px; color: #9ca3af; margin-left: 4px;">量${(quote.volume / 10000).toFixed(0)}万</span>` : ''}
          </div>
          ` : ''}
          ${summary.wyckoff_phase ? `
          <div style="color: ${summary.wyckoff_phase.includes('上涨') || summary.wyckoff_phase.includes('U') ? '#10b981' : summary.wyckoff_phase.includes('下跌') || summary.wyckoff_phase.includes('D') ? '#ef4444' : '#9ca3af'}; font-size: 9px; margin-bottom: 3px; font-weight: 500;">${summary.wyckoff_phase}</div>
          ` : ''}
          ${direction ? `
          <div style="color: ${directionColor}; font-size: 9px; margin-bottom: 3px; font-weight: 500;">${direction === 'LONG' ? '做多' : direction === 'SHORT' ? '做空' : '观望'}</div>
          ` : ''}
          ${summary.ma_trend && summary.ma_trend.length > 0 ? `
          <div style="display: flex; gap: 2px; flex-wrap: wrap;">
            ${summary.ma_trend.slice(0, 3).map(trend => `
              <span style="padding: 1px 4px; border-radius: 3px; font-size: 8px; background: ${trend.color}20; color: ${trend.color}; border: 1px solid ${trend.color};">${trend.type}</span>
            `).join('')}
          </div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
    html += '</div>';

    return html;
  }

  /**
   * 在弹窗中渲染多周期分析结果（与旧版本一致）
   * @param {string} code - 股票代码
   * @param {Array} analysisData - 分析数据
   * @param {HTMLElement} container - 容器元素
   */
  static renderInModal(code, analysisData, container) {
    const { shortTerm, midTerm, longTerm } = this.groupTimeframesByType(analysisData);
    const shortAnalysis = this.generatePhaseAnalysis(shortTerm, 'short');
    const midAnalysis = this.generatePhaseAnalysis(midTerm, 'mid');
    const longAnalysis = this.generatePhaseAnalysis(longTerm, 'long');

    // 检测是否为移动端
    const isMobile = window.innerWidth < 768;

    let html = '<div style="text-align: left;">';

    // 1. 三个阶段综合卡片
    html += `<div style="display: grid; grid-template-columns: ${isMobile ? '1fr' : 'repeat(3, 1fr)'}; gap: ${isMobile ? '6px' : '8px'}; margin-bottom: 8px;">`;
    html += this.renderPhaseCard('⚡ 短线', shortAnalysis, '#3b82f6', '30分/60分/日线', isMobile, true);
    html += this.renderPhaseCard('📈 中线', midAnalysis, '#8b5cf6', '60分/日线/周线', isMobile, true);
    html += this.renderPhaseCard('🎯 长线', longAnalysis, '#10b981', '日线/周线/月线', isMobile, true);
    html += '</div>';

    // 2. 综合建议
    html += this.generateComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis, isMobile, true);

    // 3. 各阶段详细周期卡片
    html += '<div style="margin-top: 12px; border-top: 1px solid #374151; padding-top: 8px;">';
    html += this.renderPhaseDetailCards('⚡ 短线分析', shortTerm, isMobile, true);
    html += this.renderPhaseDetailCards('📈 中线分析', midTerm, isMobile, true);
    html += this.renderPhaseDetailCards('🎯 长线分析', longTerm, isMobile, true);
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // 异步加载历史信号
    setTimeout(() => this.loadAndDisplaySignals(code, container), 100);
  }

  /**
   * 加载并显示历史信号记录（与旧版本一致）
   * @param {string} code - 股票代码
   * @param {HTMLElement} container - 容器元素
   */
  static async loadAndDisplaySignals(code, container) {
    try {
      const response = await apiClient.get(`/api/v1/stocks/${code}/signals?limit=20`);

      if (!response || !response.signals || response.signals.length === 0) {
        return;
      }

      const signals = response.signals;
      const validSignals = signals.filter(s => s && s.date && s.score !== null);

      if (validSignals.length === 0) {
        return;
      }

      const isMobile = window.innerWidth < 768;

      // 创建信号卡片HTML
      let signalsHtml = `
        <div style="margin-top: 12px; padding: 10px; background: #1f2937; border-radius: 6px; border: 1px solid #374151;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="color: #fbbf24; font-size: 12px; font-weight: 600;">📡 历史信号记录</div>
            <div style="color: #9ca3af; font-size: 10px;">最近 ${validSignals.length} 条</div>
          </div>
          <div style="display: grid; grid-template-columns: ${isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))'}; gap: 8px;">
      `;

      validSignals.slice(0, 6).forEach(signal => {
        const signalDate = formatDateString(signal.date, signal.timeframe);

        const scoreColor = signal.score >= 5 ? '#10b981' : signal.score >= 4 ? '#f59e0b' : '#9ca3af';
        const directionIcon = signal.direction === 'LONG' ? '📈' : signal.direction === 'SHORT' ? '📉' : '➡️';
        const directionColor = signal.direction === 'LONG' ? '#10b981' : signal.direction === 'SHORT' ? '#ef4444' : '#9ca3af';

        signalsHtml += `
          <div style="background: #111827; padding: 8px; border-radius: 4px; border-left: 2px solid ${scoreColor};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: ${directionColor}; font-size: 11px;">${directionIcon} ${signal.direction === 'LONG' ? '做多' : signal.direction === 'SHORT' ? '做空' : '中性'}</span>
              <span style="color: ${scoreColor}; font-size: 13px; font-weight: 600;">${signal.score}分</span>
            </div>
            <div style="color: #9ca3af; font-size: 10px; margin-bottom: 3px;">
              📅 ${signalDate} · 📊 ${signal.timeframe || '-'}
            </div>
            ${signal.reason ? `<div style="color: #d1d5db; font-size: 10px; line-height: 1.3; margin-top: 3px;">${signal.reason.substring(0, 60)}${signal.reason.length > 60 ? '...' : ''}</div>` : ''}
          </div>
        `;
      });

      signalsHtml += `
          </div>
        </div>
      `;

      container.insertAdjacentHTML('beforeend', signalsHtml);

    } catch (error) {
      logger.error('加载历史信号失败:', error);
    }
  }

  /**
   * 渲染多周期分析（主页面版本）
   * @param {Array} analysisData - 分析数据
   * @returns {string} 完整HTML
   */
  static render(analysisData) {
    if (!analysisData || analysisData.length === 0) {
      return this.generateEmptyStateHTML();
    }

    // 按短线、中线、长线分组
    const { shortTerm, midTerm, longTerm } = this.groupTimeframesByType(analysisData);

    // 生成各阶段分析
    const shortAnalysis = this.generatePhaseAnalysis(shortTerm, 'short');
    const midAnalysis = this.generatePhaseAnalysis(midTerm, 'mid');
    const longAnalysis = this.generatePhaseAnalysis(longTerm, 'long');

    // 检测是否为移动端
    const isMobile = window.innerWidth < 768;

    let html = '<div class="mtf-container">';

    // 1. 三个阶段综合卡片
    html += `<div style="display: grid; grid-template-columns: ${isMobile ? '1fr' : 'repeat(3, 1fr)'}; gap: ${isMobile ? '8px' : '8px'}; margin: 16px 0 8px 0;">`;
    html += this.renderPhaseCard('⚡ 短线', shortAnalysis, '#3b82f6', '30分/60分/日线', isMobile, false);
    html += this.renderPhaseCard('📈 中线', midAnalysis, '#8b5cf6', '60分/日线/周线', isMobile, false);
    html += this.renderPhaseCard('🎯 长线', longAnalysis, '#10b981', '日线/周线/月线', isMobile, false);
    html += '</div>';

    // 2. 综合建议
    html += this.generateComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis, isMobile, false);

    // 3. 各阶段详细周期卡片
    html += '<div style="margin-top: 12px;">';
    html += this.renderPhaseDetailCards('⚡ 短线分析', shortTerm, isMobile, false);
    html += this.renderPhaseDetailCards('📈 中线分析', midTerm, isMobile, false);
    html += this.renderPhaseDetailCards('🎯 长线分析', longTerm, isMobile, false);
    html += '</div>';

    html += '</div>';

    return html;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="mtf-empty" style="text-align: center; padding: 40px; color: #9ca3af;">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div style="font-size: 16px; margin-bottom: 8px;">多周期分析</div>
        <div style="font-size: 14px; color: #6b7280;">暂无数据，请先分析股票</div>
      </div>
    `;
  }

  /**
   * 加载多个时间周期数据
   * @param {string} code - 股票代码
   * @param {Array} timeframes - 时间周期数组
   * @returns {Promise<Array>} 分析数据数组
   */
  static async loadMultipleTimeframes(code, timeframes = ['30', '60', 'daily', 'weekly', 'monthly']) {
    try {
      logger.info(`Loading multiple timeframes for ${code}: ${timeframes.join(', ')}`);

      const result = await apiClient.post(`/api/v1/stocks/${code}/analyze-multi`, { timeframes });

      // 转换为组件需要的格式
      const timeframesData = result?.timeframes || {};
      const analysisData = Object.entries(timeframesData).map(([tf, data]) => ({
        timeframe: tf,
        ...data
      }));

      logger.info(`Loaded ${analysisData.length}/${timeframes.length} timeframes`);

      return analysisData;
    } catch (error) {
      logger.error('Failed to load multiple timeframes:', error);
      throw error;
    }
  }

  /**
   * 刷新多周期数据
   * @param {string} code - 股票代码
   * @returns {Promise<Array>} 分析数据数组
   */
  static async refresh(code) {
    return this.loadMultipleTimeframes(code);
  }

  // ========== 测试辅助方法 ==========

  /**
   * 按周期类型分组（兼容旧API）
   * @param {Array} analysisData - 分析数据
   * @param {string} term - 周期类型: short/mid/long
   * @returns {Array} 分组后的数据
   */
  static groupByTerm(analysisData, term) {
    const grouped = this.groupTimeframesByType(analysisData);
    const termMap = { short: 'shortTerm', mid: 'midTerm', long: 'longTerm' };
    return grouped[termMap[term]] || [];
  }

  /**
   * 获取周期名称（兼容旧API）
   * @param {string} timeframe - 周期代码
   * @returns {string} 周期名称
   */
  static getTimeframeName(timeframe) {
    return this.TIMEFRAME_NAMES[timeframe] || timeframe;
  }

  /**
   * 判断趋势（兼容旧API）
   * @param {Object} analysis - 分析结果
   * @returns {string} 趋势: 上涨/下跌/震荡
   */
  static determineTrend(analysis) {
    if (analysis.bullishCount > analysis.bearishCount && analysis.avgScore >= 6) {
      return '上涨';
    } else if (analysis.bearishCount > analysis.bullishCount && analysis.avgScore <= 4) {
      return '下跌';
    }
    return '震荡';
  }

  /**
   * 生成阶段卡片HTML（兼容旧API）
   * @param {string} title - 标题
   * @param {Object} analysis - 分析结果
   * @param {string} colorBase - 颜色基值
   * @param {string} timeframes - 周期描述
   * @returns {string} HTML字符串
   */
  static generatePhaseCardHTML(title, analysis, colorBase, timeframes) {
    return this.renderPhaseCard(title, analysis, colorBase, timeframes, false, false);
  }

  /**
   * 生成综合建议HTML（兼容旧API）
   * @param {Object} suggestion - 建议对象
   * @returns {string} HTML字符串
   */
  static generateSuggestionHTML(suggestion) {
    const percentage = (val) => Math.round(val * 100);
    return `
      <div class="mtf-suggestion" style="
        background: ${suggestion.direction === 'LONG' ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))' :
                    suggestion.direction === 'SHORT' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))' :
                    'linear-gradient(135deg, rgba(107, 114, 128, 0.1), rgba(75, 85, 99, 0.1))'};
        border-left: 4px solid ${suggestion.direction === 'LONG' ? '#10b981' : suggestion.direction === 'SHORT' ? '#ef4444' : '#6b7280'};
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      ">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #f9fafb;">${suggestion.text}</div>
        <div style="display: flex; gap: 16px; font-size: 13px; color: #9ca3af;">
          <span>信心: ${percentage(suggestion.confidence)}%</span>
          <span>一致性: ${percentage(suggestion.consistency)}%</span>
          <span>均分: ${suggestion.avgScore.toFixed(1)}</span>
        </div>
      </div>
    `;
  }

  /**
   * 生成周期详情卡片HTML（兼容旧API）
   * @param {string} phaseTitle - 阶段标题
   * @param {Array} phaseData - 阶段数据
   * @returns {string} HTML字符串
   */
  static generatePhaseDetailCardsHTML(phaseTitle, phaseData) {
    return this.renderPhaseDetailCards(phaseTitle, phaseData, false, false);
  }

  /**
   * 获取趋势颜色
   * @param {string} trend - 趋势
   * @returns {string} CSS颜色值
   */
  static getTrendColor(trend) {
    const colors = {
      '上涨': 'var(--color-success)',
      '下跌': 'var(--color-error)',
      '震荡': 'var(--color-tertiary)',
      '中性': 'var(--color-tertiary)'
    };
    return colors[trend] || 'var(--color-tertiary)';
  }

  /**
   * 获取方向图标
   * @param {string} direction - 方向
   * @returns {string} 图标
   */
  static getDirectionIcon(direction) {
    const icons = {
      'LONG': '📈',
      'SHORT': '📉',
      'NEUTRAL': '➡️'
    };
    return icons[direction] || '➡️';
  }

  /**
   * 获取评分等级
   * @param {number} score - 分数
   * @returns {string} 等级
   */
  static getScoreGrade(score) {
    if (score >= 8) return '优秀';
    if (score >= 6) return '良好';
    if (score >= 4) return '中等';
    return '较差';
  }

  /**
   * 获取评分等级颜色
   * @param {number} score - 分数
   * @returns {string} CSS颜色值
   */
  static getScoreGradeColor(score) {
    if (score >= 8) return 'var(--color-success)';
    if (score >= 6) return 'var(--color-primary)';
    if (score >= 4) return 'var(--color-warning)';
    return 'var(--color-error)';
  }
}

export default MultiTimeframe;
