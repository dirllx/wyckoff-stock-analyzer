/**
 * 行情看板组件
 * 显示大盘指数、涨跌统计、热点板块
 */
import { marketApi } from '../api/market.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';

export class MarketOverview {
  constructor() {
    this.data = null;
    this.refreshInterval = null;
  }

  /**
   * 生成行情看板HTML
   */
  generateHTML() {
    return `
      <div class="market-overview-container">
        <div class="market-overview-header">
          <h2 class="market-overview-title">📈 行情看板</h2>
          <div class="market-overview-actions">
            <button id="refresh-market-btn" class="market-btn market-btn-secondary">
              🔄 刷新
            </button>
            <span class="market-update-time" id="market-update-time">--:--:--</span>
          </div>
        </div>

        <!-- 大盘指数 -->
        <section class="market-section">
          <h3 class="market-section-title">📊 大盘指数</h3>
          <div id="market-indices" class="market-indices-grid">
            <div class="loading">加载中...</div>
          </div>
        </section>

        <!-- 涨跌统计 -->
        <section class="market-section">
          <h3 class="market-section-title">📈 涨跌统计</h3>
          <div id="market-statistics" class="market-statistics-grid">
            <div class="loading">加载中...</div>
          </div>
        </section>

        <!-- 热点板块 -->
        <section class="market-section">
          <h3 class="market-section-title">🔥 热点板块</h3>
          <div id="market-sectors" class="market-sectors-list">
            <div class="loading">加载中...</div>
          </div>
        </section>

        <!-- 市场情绪 -->
        <section class="market-section">
          <h3 class="market-section-title">💚 市场情绪</h3>
          <div id="market-sentiment" class="market-sentiment-container">
            <div class="loading">加载中...</div>
          </div>
        </section>
      </div>
    `;
  }

  /**
   * 渲染行情看板
   */
  async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`MarketOverview: Container ${containerId} not found`);
      return;
    }

    container.innerHTML = this.generateHTML();
    this.bindEvents();
    await this.loadData();

    // 启动自动刷新（每分钟）
    this.startAutoRefresh();
  }

  /**
   * 加载行情数据
   */
  async loadData() {
    try {
      logger.info('加载行情数据...');
      this.data = await marketApi.getOverview();

      this.renderIndices();
      this.renderStatistics();
      this.renderSectors();
      this.renderSentiment();
      this.updateTime();

      logger.info('行情数据加载完成');
    } catch (error) {
      logger.error('加载行情数据失败:', error);
      toast.error('加载行情数据失败');
      this.renderError();
    }
  }

  /**
   * 渲染大盘指数
   */
  renderIndices() {
    const container = document.getElementById('market-indices');
    if (!container) return;

    const indices = this.data.indices || [];
    if (indices.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无指数数据</div>';
      return;
    }

    let html = '';
    indices.forEach(index => {
      const change = index.change_percent || 0;
      const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      const changeIcon = change > 0 ? '↑' : change < 0 ? '↓' : '-';

      html += `
        <div class="index-card ${changeClass}">
          <div class="index-name">${index.name || index.code}</div>
          <div class="index-price">${this.formatNumber(index.current || index.price, 2)}</div>
          <div class="index-change">
            <span class="change-icon">${changeIcon}</span>
            <span class="change-value">${Math.abs(change).toFixed(2)}%</span>
          </div>
          <div class="index-details">
            <span>涨: ${index.high || '-'}</span>
            <span>跌: ${index.low || '-'}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * 渲染涨跌统计
   */
  renderStatistics() {
    const container = document.getElementById('market-statistics');
    if (!container) return;

    const stats = this.data.statistics || {};
    if (Object.keys(stats).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无统计数据</div>';
      return;
    }

    html = `
      <div class="stat-item stat-up">
        <div class="stat-label">上涨</div>
        <div class="stat-value">${stats.up || 0}</div>
        <div class="stat-percent">${this.formatPercent(stats.up_percent || 0)}</div>
      </div>
      <div class="stat-item stat-down">
        <div class="stat-label">下跌</div>
        <div class="stat-value">${stats.down || 0}</div>
        <div class="stat-percent">${this.formatPercent(stats.down_percent || 0)}</div>
      </div>
      <div class="stat-item stat-flat">
        <div class="stat-label">平盘</div>
        <div class="stat-value">${stats.flat || 0}</div>
        <div class="stat-percent">${this.formatPercent(stats.flat_percent || 0)}</div>
      </div>
      <div class="stat-item stat-limit-up">
        <div class="stat-label">涨停</div>
        <div class="stat-value">${stats.limit_up || 0}</div>
      </div>
      <div class="stat-item stat-limit-down">
        <div class="stat-label">跌停</div>
        <div class="stat-value">${stats.limit_down || 0}</div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * 渲染热点板块
   */
  renderSectors() {
    const container = document.getElementById('market-sectors');
    if (!container) return;

    const sectors = this.data.hotSectors || [];
    if (sectors.length === 0) {
      container.innerHTML = '<div class="empty-state">暂无板块数据</div>';
      return;
    }

    let html = '<div class="sectors-grid">';
    sectors.forEach((sector, index) => {
      const change = sector.change_percent || 0;
      const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
      const rankClass = index < 3 ? 'sector-rank-top' : '';

      html += `
        <div class="sector-item ${rankClass}">
          <div class="sector-rank">${index + 1}</div>
          <div class="sector-info">
            <div class="sector-name">${sector.name}</div>
            <div class="sector-leaders">领涨: ${sector.leaders || '-'}</div>
          </div>
          <div class="sector-change ${changeClass}">
            ${change > 0 ? '+' : ''}${change.toFixed(2)}%
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  /**
   * 渲染市场情绪
   */
  renderSentiment() {
    const container = document.getElementById('market-sentiment');
    if (!container) return;

    const sentiment = this.data.sentiment || {};
    if (Object.keys(sentiment).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无情绪数据</div>';
      return;
    }

    const score = sentiment.score || 50;
    const level = sentiment.level || '中性';
    const sentimentClass = score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral';

    html = `
      <div class="sentiment-gauge ${sentimentClass}">
        <div class="sentiment-score">${score.toFixed(0)}</div>
        <div class="sentiment-level">${level}</div>
        <div class="sentiment-bar">
          <div class="sentiment-fill" style="width: ${score}%"></div>
        </div>
      </div>
      <div class="sentiment-details">
        <div class="sentiment-detail">
          <span class="detail-label">强弱指标:</span>
          <span class="detail-value ${sentiment.strength > 0 ? 'positive' : 'negative'}">
            ${sentiment.strength > 0 ? '+' : ''}${(sentiment.strength || 0).toFixed(2)}
          </span>
        </div>
        <div class="sentiment-detail">
          <span class="detail-label">成交量:</span>
          <span class="detail-value">${sentiment.volume_change || '-'}%</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * 渲染错误状态
   */
  renderError() {
    const containers = ['market-indices', 'market-statistics', 'market-sectors', 'market-sentiment'];
    containers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = '<div class="error-state">加载失败</div>';
      }
    });
  }

  /**
   * 更新时间显示
   */
  updateTime() {
    const timeEl = document.getElementById('market-update-time');
    if (timeEl) {
      const now = new Date();
      timeEl.textContent = `更新 ${now.toLocaleTimeString('zh-CN')}`;
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const refreshBtn = document.getElementById('refresh-market-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }
  }

  /**
   * 启动自动刷新
   */
  startAutoRefresh() {
    // 每分钟刷新一次
    this.refreshInterval = setInterval(() => {
      this.loadData();
    }, 60000);
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * 格式化数字
   */
  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return '-';
    return parseFloat(num).toFixed(decimals);
  }

  /**
   * 格式化百分比
   */
  formatPercent(value) {
    if (value === null || value === undefined) return '-';
    return `${parseFloat(value).toFixed(1)}%`;
  }

  /**
   * 销毁组件
   */
  destroy() {
    this.stopAutoRefresh();
  }

  /**
   * 生成空状态HTML
   */
  static generateEmptyStateHTML() {
    return `
      <div class="market-overview-empty">
        <div class="empty-icon">📈</div>
        <h3>行情看板</h3>
        <p>点击刷新获取最新行情数据</p>
      </div>
    `;
  }
}

export default MarketOverview;
