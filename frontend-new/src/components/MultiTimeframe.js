/**
 * 多周期分析组件
 * 同时分析多个时间周期并生成综合建议
 */

import { stocksApi } from '../api/stocks.js';
import apiClient from '../api/client.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import {
  generatePhaseCardHTML,
  generateSuggestionHTML,
  generatePhaseDetailCardsHTML,
  generateEmptyStateHTML
} from './MultiTimeframeTemplate.js';

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
   * 按时间周期类型分组
   * @param {Array} analysisData - 分析数据数组
   * @param {string} term - 周期类型 ('short' | 'mid' | 'long')
   * @returns {Array} 分组后的数据
   */
  static groupByTerm(analysisData, term) {
    if (!analysisData || analysisData.length === 0) return [];

    const timeframeMap = {
      'short': ['30', '60', 'daily'],
      'mid': ['60', 'daily', 'weekly'],
      'long': ['daily', 'weekly', 'monthly']
    };

    const timeframes = timeframeMap[term] || [];
    return analysisData.filter(d => timeframes.includes(d.timeframe));
  }

  /**
   * 生成阶段分析
   * @param {Array} phaseData - 阶段数据
   * @returns {Object} 阶段分析结果
   */
  static generatePhaseAnalysis(phaseData) {
    if (!phaseData || phaseData.length === 0) {
      return {
        avgScore: 0,
        trend: '中性',
        direction: 'NEUTRAL',
        bullishCount: 0,
        bearishCount: 0,
        maSignal: '无信号',
        volumeSignal: '无明显量能',
        wyckoffSignal: '震荡',
        maBullish: 0,
        maBearish: 0,
        suggestion: '数据不足'
      };
    }

    let totalScore = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let maBullish = 0;
    let maBearish = 0;
    const volumeSignals = [];
    const wyckoffSignals = [];

    phaseData.forEach(data => {
      // 兼容嵌套summary和扁平结构
      const src = data.summary || data;
      const score = src.score || 0;
      totalScore += score;

      // 统计方向
      const direction = src.direction || 'NEUTRAL';
      if (direction === 'LONG') bullishCount++;
      if (direction === 'SHORT') bearishCount++;

      // 统计MA信号
      if (src.ma_trend && Array.isArray(src.ma_trend)) {
        src.ma_trend.forEach(trend => {
          if (trend.type && trend.type.includes('多头')) maBullish++;
          if (trend.type && trend.type.includes('空头')) maBearish++;
          if (trend.type && trend.type.includes('金叉')) maBullish++;
          if (trend.type && trend.type.includes('死叉')) maBearish++;
        });
      }

      // 收集成交量信号
      if (src.volume_signal) {
        volumeSignals.push(src.volume_signal);
      }

      // 收集威科夫信号
      if (src.wyckoff_phase) {
        wyckoffSignals.push(src.wyckoff_phase);
      }
    });

    const avgScore = totalScore / phaseData.length;
    const trend = this.determineTrend({ bullishCount, bearishCount, avgScore });
    const direction = this.determineDirection(bullishCount, bearishCount, avgScore);

    // 生成MA信号描述
    let maSignal = '中性';
    if (maBullish > maBearish) {
      maSignal = maBullish >= 2 ? '强烈多头' : '偏多';
    } else if (maBearish > maBullish) {
      maSignal = maBearish >= 2 ? '强烈空头' : '偏空';
    }

    // 生成成交量信号描述
    const volumeSignal = this.generateVolumeSignal(volumeSignals);

    // 生成威科夫信号描述
    const wyckoffSignal = this.generateWyckoffSignal(wyckoffSignals);

    // 生成建议
    const suggestion = this.generateSuggestion(avgScore, direction, trend);

    return {
      avgScore,
      trend,
      direction,
      bullishCount,
      bearishCount,
      maSignal,
      volumeSignal,
      wyckoffSignal,
      maBullish,
      maBearish,
      suggestion
    };
  }

  /**
   * 判断趋势
   * @param {Object} analysis - 分析数据
   * @returns {string} 趋势
   */
  static determineTrend(analysis) {
    const { bullishCount, bearishCount, avgScore } = analysis;

    if (avgScore >= 7) return '上涨';
    if (avgScore <= 3) return '下跌';
    if (bullishCount > bearishCount) return '偏多';
    if (bearishCount > bullishCount) return '偏空';
    return '震荡';
  }

  /**
   * 判断方向
   * @param {number} bullishCount - 做多数量
   * @param {number} bearishCount - 做空数量
   * @param {number} avgScore - 平均评分
   * @returns {string} 方向
   */
  static determineDirection(bullishCount, bearishCount, avgScore) {
    if (avgScore >= 6) return 'LONG';
    if (avgScore <= 4) return 'SHORT';
    if (bullishCount > bearishCount) return 'LONG';
    if (bearishCount > bullishCount) return 'SHORT';
    return 'NEUTRAL';
  }

  /**
   * 生成成交量信号描述
   * @param {Array} signals - 信号数组
   * @returns {string} 信号描述
   */
  static generateVolumeSignal(signals) {
    if (!signals || signals.length === 0) return '无明显量能';

    const bullish = signals.filter(s => s.includes('放量') || s.includes('放大')).length;
    const bearish = signals.filter(s => s.includes('缩量')).length;

    if (bullish >= 2) return '持续放量';
    if (bullish === 1) return '温和放量';
    if (bearish >= 2) return '持续缩量';
    if (bearish === 1) return '温和缩量';
    return '量能平稳';
  }

  /**
   * 生成威科夫信号描述
   * @param {Array} signals - 信号数组
   * @returns {string} 信号描述
   */
  static generateWyckoffSignal(signals) {
    if (!signals || signals.length === 0) return '震荡';

    const phases = signals.filter(s => s);
    if (phases.length === 0) return '震荡';

    // 统计各阶段出现次数
    const phaseCount = {};
    phases.forEach(p => {
      phaseCount[p] = (phaseCount[p] || 0) + 1;
    });

    // 返回出现最多的阶段
    const maxPhase = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])[0];
    return maxPhase ? maxPhase[0] : '震荡';
  }

  /**
   * 生成建议
   * @param {number} score - 评分
   * @param {string} direction - 方向
   * @param {string} trend - 趋势
   * @returns {string} 建议
   */
  static generateSuggestion(score, direction, trend) {
    if (score >= 7 && direction === 'LONG') return '积极做多';
    if (score >= 7 && direction === 'SHORT') return '积极做空';
    if (score >= 5 && score < 7) return '谨慎参与';
    if (score <= 3) return '建议观望';
    if (direction === 'NEUTRAL') return '观望等待';
    return '中性持有';
  }

  /**
   * 生成综合建议
   * @param {Object} shortAnalysis - 短线分析
   * @param {Object} midAnalysis - 中线分析
   * @param {Object} longAnalysis - 长线分析
   * @returns {Object} 综合建议
   */
  static generateComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis) {
    // 计算一致性分数
    const directions = [shortAnalysis.direction, midAnalysis.direction, longAnalysis.direction];
    const longCount = directions.filter(d => d === 'LONG').length;
    const shortCount = directions.filter(d => d === 'SHORT').length;

    const consistency = Math.max(longCount, shortCount) / 3;
    const avgScore = (shortAnalysis.avgScore + midAnalysis.avgScore + longAnalysis.avgScore) / 3;

    // 判断方向
    let direction = 'NEUTRAL';
    if (longCount >= 2) direction = 'LONG';
    else if (shortCount >= 2) direction = 'SHORT';

    // 判断强度
    let strength = 'weak';
    if (consistency >= 0.67 && avgScore >= 6) strength = 'strong';
    else if (consistency >= 0.33 && avgScore >= 5) strength = 'moderate';

    // 生成建议文本
    let text = '';
    if (strength === 'strong' && direction === 'LONG') {
      text = '三线共振，强烈做多信号';
    } else if (strength === 'strong' && direction === 'SHORT') {
      text = '三线共振，强烈做空信号';
    } else if (strength === 'moderate' && direction === 'LONG') {
      text = '偏多信号，可谨慎做多';
    } else if (strength === 'moderate' && direction === 'SHORT') {
      text = '偏空信号，可谨慎做空';
    } else {
      text = '信号不一致，建议观望等待';
    }

    // 计算置信度
    const confidence = Math.round(consistency * 100);

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
   * 获取周期名称
   * @param {string} timeframe - 时间周期
   * @returns {string} 周期名称
   */
  static getTimeframeName(timeframe) {
    return this.TIMEFRAME_NAMES[timeframe] || timeframe;
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
      '偏多': 'var(--color-primary)',
      '偏空': 'var(--color-warning)'
    };
    return colors[trend] || colors['震荡'];
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
    return icons[direction] || icons['NEUTRAL'];
  }

  /**
   * 获取评分等级
   * @param {number} score - 评分
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
   * @param {number} score - 评分
   * @returns {string} CSS颜色值
   */
  static getScoreGradeColor(score) {
    if (score >= 8) return 'var(--color-success)';
    if (score >= 6) return 'var(--color-primary)';
    if (score >= 4) return 'var(--color-warning)';
    return 'var(--color-error)';
  }

  /**
   * 获取方向显示名称
   * @param {string} direction - 方向代码
   * @returns {string} 显示名称
   */
  static getDirectionDisplayName(direction) {
    const names = {
      'LONG': '做多',
      'SHORT': '做空',
      'NEUTRAL': '中性'
    };
    return names[direction] || direction;
  }

  /**
   * 生成阶段卡片HTML（委托给模板模块）
   * @param {string} title - 标题
   * @param {Object} analysis - 分析结果
   * @param {string} color - 主题颜色
   * @param {string} description - 描述
   * @returns {string} 卡片HTML
   */
  static generatePhaseCardHTML(title, analysis, color, description) {
    return generatePhaseCardHTML(this, title, analysis, color, description);
  }

  /**
   * 生成综合建议HTML（委托给模板模块）
   * @param {Object} suggestion - 综合建议
   * @returns {string} 建议HTML
   */
  static generateSuggestionHTML(suggestion) {
    return generateSuggestionHTML(this, suggestion);
  }

  /**
   * 生成周期详情卡片HTML（委托给模板模块）
   * @param {string} title - 标题
   * @param {Array} phaseData - 阶段数据
   * @returns {string} 详情卡片HTML
   */
  static generatePhaseDetailCardsHTML(title, phaseData) {
    return generatePhaseDetailCardsHTML(this, title, phaseData);
  }

  /**
   * 生成空状态HTML（委托给模板模块）
   * @returns {string} 空状态HTML
   */
  static generateEmptyStateHTML() {
    return generateEmptyStateHTML();
  }

  /**
   * 渲染多周期分析
   * @param {Array} analysisData - 分析数据
   * @returns {string} 完整HTML
   */
  static render(analysisData) {
    if (!analysisData || analysisData.length === 0) {
      return this.generateEmptyStateHTML();
    }

    // 按短线、中线、长线分组
    const shortTerm = this.groupByTerm(analysisData, 'short');
    const midTerm = this.groupByTerm(analysisData, 'mid');
    const longTerm = this.groupByTerm(analysisData, 'long');

    // 生成各阶段分析
    const shortAnalysis = this.generatePhaseAnalysis(shortTerm);
    const midAnalysis = this.generatePhaseAnalysis(midTerm);
    const longAnalysis = this.generatePhaseAnalysis(longTerm);

    let html = '<div class="mtf-container">';

    // 1. 三个阶段综合卡片
    html += '<div class="mtf-phase-cards">';
    html += this.generatePhaseCardHTML('⚡ 短线', shortAnalysis, '#3b82f6', '30分/60分/日线');
    html += this.generatePhaseCardHTML('📈 中线', midAnalysis, '#8b5cf6', '60分/日线/周线');
    html += this.generatePhaseCardHTML('🎯 长线', longAnalysis, '#10b981', '日线/周线/月线');
    html += '</div>';

    // 2. 综合建议
    const suggestion = this.generateComprehensiveSuggestion(shortAnalysis, midAnalysis, longAnalysis);
    html += this.generateSuggestionHTML(suggestion);

    // 3. 各阶段详细周期卡片
    html += '<div class="mtf-details-section">';
    html += this.generatePhaseDetailCardsHTML('⚡ 短线分析详情', shortTerm);
    html += this.generatePhaseDetailCardsHTML('📈 中线分析详情', midTerm);
    html += this.generatePhaseDetailCardsHTML('🎯 长线分析详情', longTerm);
    html += '</div>';

    html += '</div>';

    return html;
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
}

export default MultiTimeframe;
