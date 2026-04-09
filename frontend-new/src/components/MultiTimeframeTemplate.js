/**
 * 多周期分析 - HTML模板渲染
 * 从 MultiTimeframe 中提取的HTML生成方法
 */

import { generateResonanceAnalysis } from '../utils/enhancedFormatting.js';

/**
 * 生成阶段卡片HTML
 * @param {Object} helpers - 工具方法对象（包含 getScoreGrade, getScoreGradeColor, getTrendColor, getDirectionIcon）
 * @param {string} title - 标题
 * @param {Object} analysis - 分析结果
 * @param {string} color - 主题颜色
 * @param {string} description - 描述
 * @returns {string} 卡片HTML
 */
export function generatePhaseCardHTML(helpers, title, analysis, color, description) {
  const scoreGrade = helpers.getScoreGrade(analysis.avgScore);
  const scoreColor = helpers.getScoreGradeColor(analysis.avgScore);
  const trendColor = helpers.getTrendColor(analysis.trend);
  const directionIcon = helpers.getDirectionIcon(analysis.direction);

  return `
    <div class="mtf-phase-card" style="border-top: 3px solid ${color}">
      <div class="mtf-phase-header">
        <span class="mtf-phase-title">${title}</span>
        <span class="mtf-phase-score" style="color: ${scoreColor}">
          ${analysis.avgScore.toFixed(1)}分
        </span>
      </div>
      <div class="mtf-phase-trend" style="color: ${trendColor}">
        ${directionIcon} ${analysis.trend}
      </div>
      <div class="mtf-phase-details">
        <div class="mtf-phase-detail">
          <span class="mtf-detail-label">MA信号</span>
          <span class="mtf-detail-value">${analysis.maSignal}</span>
        </div>
        <div class="mtf-phase-detail">
          <span class="mtf-detail-label">量能</span>
          <span class="mtf-detail-value">${analysis.volumeSignal}</span>
        </div>
        <div class="mtf-phase-detail">
          <span class="mtf-detail-label">威科夫</span>
          <span class="mtf-detail-value">${analysis.wyckoffSignal}</span>
        </div>
      </div>
      <div class="mtf-phase-suggestion">
        ${analysis.suggestion}
      </div>
      <div class="mtf-phase-description">
        ${description}
      </div>
    </div>
  `;
}

/**
 * 生成综合建议HTML
 * @param {Object} helpers - 工具方法对象（包含 getDirectionIcon）
 * @param {Object} suggestion - 综合建议
 * @returns {string} 建议HTML
 */
export function generateSuggestionHTML(helpers, suggestion) {
  const directionIcon = helpers.getDirectionIcon(suggestion.direction);
  const directionColor = suggestion.direction === 'LONG'
    ? 'var(--color-success)'
    : suggestion.direction === 'SHORT'
      ? 'var(--color-error)'
      : 'var(--color-tertiary)';

  return `
    <div class="mtf-suggestion-card">
      <div class="mtf-suggestion-header">
        <span class="mtf-suggestion-title">📊 综合建议</span>
      </div>
      <div class="mtf-suggestion-content">
        <div class="mtf-suggestion-direction" style="color: ${directionColor}">
          ${directionIcon} ${suggestion.text}
        </div>
        <div class="mtf-suggestion-metrics">
          <div class="mtf-suggestion-metric">
            <span class="mtf-metric-label">置信度</span>
            <span class="mtf-metric-value">${suggestion.confidence}%</span>
          </div>
          <div class="mtf-suggestion-metric">
            <span class="mtf-metric-label">一致性</span>
            <span class="mtf-metric-value">${Math.round(suggestion.consistency * 100)}%</span>
          </div>
          <div class="mtf-suggestion-metric">
            <span class="mtf-metric-label">平均分</span>
            <span class="mtf-metric-value">${suggestion.avgScore.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 生成周期详情卡片HTML
 * @param {Object} helpers - 工具方法对象（包含 getTimeframeName, getDirectionIcon, getDirectionDisplayName, getScoreGradeColor, getTrendColor）
 * @param {string} title - 标题
 * @param {Array} phaseData - 阶段数据
 * @returns {string} 详情卡片HTML
 */
export function generatePhaseDetailCardsHTML(helpers, title, phaseData) {
  if (!phaseData || phaseData.length === 0) {
    return `
      <div class="mtf-detail-section">
        <div class="mtf-detail-title">${title}</div>
        <div class="mtf-detail-empty">暂无数据</div>
      </div>
    `;
  }

  let html = `<div class="mtf-detail-section">`;
  html += `<div class="mtf-detail-title">${title}</div>`;
  html += `<div class="mtf-detail-cards">`;

  phaseData.forEach(data => {
    const summary = data.summary || {};
    const timeframeName = helpers.getTimeframeName(data.timeframe);
    const score = summary.score || 0;
    const direction = summary.direction || 'NEUTRAL';
    const phase = summary.phase || '震荡';
    const directionIcon = helpers.getDirectionIcon(direction);
    const directionName = helpers.getDirectionDisplayName(direction);
    const scoreColor = helpers.getScoreGradeColor(score);
    const phaseColor = helpers.getTrendColor(phase);

    html += `
      <div class="mtf-detail-card">
        <div class="mtf-detail-header">
          <span class="mtf-detail-timeframe">${timeframeName}</span>
          <span class="mtf-detail-score" style="color: ${scoreColor}">${score}分</span>
        </div>
        <div class="mtf-detail-body">
          <div class="mtf-detail-row">
            <span class="mtf-detail-label">方向</span>
            <span class="mtf-detail-value">${directionIcon} ${directionName}</span>
          </div>
          <div class="mtf-detail-row">
            <span class="mtf-detail-label">阶段</span>
            <span class="mtf-detail-value" style="color: ${phaseColor}">${phase}</span>
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  html += `</div>`;

  return html;
}

/**
 * 生成空状态HTML
 * @returns {string} 空状态HTML
 */
export function generateEmptyStateHTML() {
  return `
    <div class="mtf-empty">
      <div class="mtf-empty-icon">📊</div>
      <div class="mtf-empty-text">暂无数据</div>
      <div class="mtf-empty-hint">请先分析股票获取多周期数据</div>
    </div>
  `;
}

/**
 * 生成周期共振分析HTML
 * @param {Array} analysisData - 分析数据
 * @param {Object} timeframeNames - 周期名称映射
 * @returns {string} 共振分析HTML
 */
export function generateResonanceHTML(analysisData, timeframeNames = {}) {
  const resonance = generateResonanceAnalysis(analysisData, timeframeNames);

  return `
    <div class="mtf-resonance-card">
      <div class="mtf-resonance-header">
        <span class="mtf-resonance-title">🔄 周期共振分析</span>
        <span class="mtf-resonance-score" style="color: ${resonance.consistency.overall >= 0.6 ? '#10b981' : resonance.consistency.overall >= 0.4 ? '#f59e0b' : '#9ca3af'}">
          一致性: ${(resonance.consistency.overall * 100).toFixed(0)}%
        </span>
      </div>
      <div class="mtf-resonance-content">
        ${resonance.summary.map(item => `
          <div class="mtf-resonance-item" style="color: ${item.type === 'bullish' ? '#10b981' : item.type === 'bearish' ? '#ef4444' : '#9ca3af'}">
            ${item.text}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
