/**
 * 数据源管理组件
 */
import { dataSourcesApi } from '../api/dataSources.js';
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';

export class DataSources {
  constructor() {
    this.stats = null;
    this.health = null;
    this.config = null;
    this.currentTest = null;
  }

  /**
   * 生成数据源管理页面HTML
   */
  generateHTML() {
    return `
      <div class="datasources-container">
        <div class="datasources-header">
          <h2 class="datasources-title">📊 数据源管理</h2>
          <div class="datasources-actions">
            <button id="refresh-datasources-btn" class="datasources-btn datasources-btn-secondary">
              🔄 刷新
            </button>
            <button id="speed-test-btn" class="datasources-btn datasources-btn-primary">
              ⚡ 测速
            </button>
          </div>
        </div>

        <!-- 数据源状态概览 -->
        <div class="datasources-overview">
          <div class="datasource-card datasource-card-stats">
            <div class="datasource-card-header">
              <h3>📈 数据源统计</h3>
            </div>
            <div id="datasources-stats-content" class="datasource-card-content">
              <div class="loading">加载中...</div>
            </div>
          </div>

          <div class="datasource-card datasource-card-health">
            <div class="datasource-card-header">
              <h3>💚 健康状态</h3>
            </div>
            <div id="datasources-health-content" class="datasource-card-content">
              <div class="loading">加载中...</div>
            </div>
          </div>
        </div>

        <!-- 数据源优先级配置 -->
        <div class="datasources-priority">
          <h3 class="datasources-section-title">⚙️ 优先级配置</h3>
          <div id="datasources-priority-content" class="datasources-priority-content">
            <div class="loading">加载中...</div>
          </div>
        </div>

        <!-- 数据源详细配置 -->
        <div class="datasources-config">
          <h3 class="datasources-section-title">🔧 数据源配置</h3>
          <div id="datasources-config-content" class="datasources-config-content">
            <div class="loading">加载中...</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染数据源管理页面
   */
  async render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`DataSources: Container ${containerId} not found`);
      return;
    }

    container.innerHTML = this.generateHTML();
    this.bindEvents();

    // 加载数据
    await this.loadData();
  }

  /**
   * 加载所有数据
   */
  async loadData() {
    try {
      // 并行加载数据
      const [stats, health, config] = await Promise.all([
        dataSourcesApi.getStats().catch(() => null),
        dataSourcesApi.getHealth().catch(() => null),
        dataSourcesApi.getConfig().catch(() => null)
      ]);

      this.stats = stats?.data || stats;
      this.health = health?.data || health;
      this.config = config?.data || config;

      // 渲染各部分
      this.renderStats();
      this.renderHealth();
      this.renderPriority();
      this.renderConfig();

    } catch (error) {
      logger.error('加载数据源数据失败:', error);
      toast.error('加载数据失败');
    }
  }

  /**
   * 渲染统计信息
   */
  renderStats() {
    const container = document.getElementById('datasources-stats-content');
    if (!container || !this.stats) return;

    if (Object.keys(this.stats).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无统计数据</div>';
      return;
    }

    let html = '<div class="datasources-stats-grid">';

    for (const [name, stat] of Object.entries(this.stats)) {
      const successRate = parseFloat(stat.success_rate) || 0;
      const statusClass = stat.is_available ? 'status-healthy' : 'status-unhealthy';

      html += `
        <div class="datasource-stat-item">
          <div class="datasource-stat-header">
            <span class="datasource-name">${this.getSourceDisplayName(name)}</span>
            <span class="datasource-status ${statusClass}">
              ${stat.is_available ? '✓ 可用' : '✗ 不可用'}
            </span>
          </div>
          <div class="datasource-stat-metrics">
            <div class="metric">
              <span class="metric-label">成功率</span>
              <span class="metric-value">${stat.success_rate}</span>
            </div>
            <div class="metric">
              <span class="metric-label">响应时间</span>
              <span class="metric-value">${stat.avg_response_time_ms}ms</span>
            </div>
            <div class="metric">
              <span class="metric-label">请求次数</span>
              <span class="metric-value">${stat.total_requests}</span>
            </div>
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 渲染健康状态
   */
  renderHealth() {
    const container = document.getElementById('datasources-health-content');
    if (!container || !this.health) return;

    if (Object.keys(this.health).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无健康数据</div>';
      return;
    }

    let html = '<div class="datasources-health-list">';

    for (const [name, health] of Object.entries(this.health)) {
      const isAvailable = health.available ?? health.is_available ?? false;
      const statusClass = isAvailable ? 'status-healthy' : 'status-unhealthy';
      const lastSuccess = health.last_success ? new Date(health.last_success).toLocaleString('zh-CN') : '无';

      html += `
        <div class="datasource-health-item">
          <div class="health-status ${statusClass}"></div>
          <div class="health-info">
            <div class="health-name">${this.getSourceDisplayName(name)}</div>
            <div class="health-details">
              <span>成功率: ${health.success_rate || 'N/A'}</span>
              <span>响应: ${health.avg_response_time_ms || 0}ms</span>
            </div>
            <div class="health-last">最后成功: ${lastSuccess}</div>
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 渲染优先级配置
   */
  renderPriority() {
    const container = document.getElementById('datasources-priority-content');
    if (!container || !this.config) return;

    const timeframePriority = this.config.timeframe_priority || {};

    if (Object.keys(timeframePriority).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无优先级配置</div>';
      return;
    }

    let html = '<div class="datasources-priority-list">';

    for (const [timeframe, priorityList] of Object.entries(timeframePriority)) {
      html += `
        <div class="priority-item">
          <div class="priority-timeframe">
            <strong>${this.getTimeframeDisplayName(timeframe)}</strong>
          </div>
          <div class="priority-sources">
            ${priorityList.map((source, index) => `
              <div class="priority-source" draggable="true" data-timeframe="${timeframe}" data-source="${source}">
                <span class="priority-rank">${index + 1}</span>
                <span class="priority-name">${this.getSourceDisplayName(source)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 渲染数据源配置
   */
  renderConfig() {
    const container = document.getElementById('datasources-config-content');
    if (!container || !this.config) return;

    const sources = this.config.sources || {};

    if (Object.keys(sources).length === 0) {
      container.innerHTML = '<div class="empty-state">暂无数据源配置</div>';
      return;
    }

    let html = '<div class="datasources-config-list">';

    for (const [name, config] of Object.entries(sources)) {
      const enabled = config.enabled ?? true;
      const priority = config.priority ?? 999;
      const supported = config.supported_timeframes || [];

      html += `
        <div class="datasource-config-item">
          <div class="config-header">
            <span class="config-name">${this.getSourceDisplayName(name)}</span>
            <label class="config-toggle">
              <input type="checkbox" data-source="${name}" class="config-enabled"
                ${enabled ? 'checked' : ''}>
              <span>${enabled ? '已启用' : '已禁用'}</span>
            </label>
          </div>
          <div class="config-details">
            <div class="config-detail">
              <span class="detail-label">优先级:</span>
              <span class="detail-value">${priority}</span>
            </div>
            <div class="config-detail">
              <span class="detail-label">支持周期:</span>
              <span class="detail-value">${supported.map(t => this.getTimeframeDisplayName(t)).join(', ')}</span>
            </div>
          </div>
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-datasources-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadData());
    }

    // 测速按钮
    const speedTestBtn = document.getElementById('speed-test-btn');
    if (speedTestBtn) {
      speedTestBtn.addEventListener('click', () => this.runSpeedTest());
    }

    // 启用/禁用切换
    document.addEventListener('change', async (e) => {
      if (e.target.classList.contains('config-enabled')) {
        const sourceName = e.target.dataset.source;
        const enabled = e.target.checked;
        await this.updateSourceConfig(sourceName, { enabled });
      }
    });
  }

  /**
   * 运行速度测试
   */
  async runSpeedTest() {
    const btn = document.getElementById('speed-test-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ 测速中...';
    }

    try {
      toast.info('开始测速，请稍候...');

      const result = await dataSourcesApi.speedTest({
        code: '000001',
        timeframes: ['daily', 'weekly', 'monthly']
      });

      if (result.success) {
        toast.success('测速完成');

        // 重新加载数据
        await this.loadData();

        // 显示测速结果
        this.showSpeedTestResults(result.results);
      }
    } catch (error) {
      logger.error('测速失败:', error);
      toast.error('测速失败');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '⚡ 测速';
      }
    }
  }

  /**
   * 显示测速结果
   */
  showSpeedTestResults(results) {
    let message = '测速结果:\n';

    for (const [timeframe, sources] of Object.entries(results)) {
      message += `\n${this.getTimeframeDisplayName(timeframe)}:\n`;
      for (const [source, time] of Object.entries(sources)) {
        const status = time > 0 ? `✓ ${time}ms` : '✗ 失败';
        message += `  ${this.getSourceDisplayName(source)}: ${status}\n`;
      }
    }

    logger.info(message);
  }

  /**
   * 更新数据源配置
   */
  async updateSourceConfig(sourceName, config) {
    try {
      await dataSourcesApi.updateConfig({
        source_name: sourceName,
        ...config
      });

      toast.success(`${this.getSourceDisplayName(sourceName)} 配置已更新`);
      await this.loadData();
    } catch (error) {
      logger.error('更新配置失败:', error);
      toast.error('更新配置失败');
    }
  }

  /**
   * 获取数据源显示名称
   */
  getSourceDisplayName(name) {
    const names = {
      'ashare': 'Ashare (新浪/腾讯)',
      'mcp': 'MCP (a-share-mcp)',
      'baostock': 'Baostock',
      'akshare': 'Akshare (东方财富)',
      'easyquotation': 'Easyquotation'
    };
    return names[name] || name;
  }

  /**
   * 获取周期显示名称
   */
  getTimeframeDisplayName(timeframe) {
    const names = {
      'daily': '日线',
      'weekly': '周线',
      'monthly': '月线',
      '30': '30分',
      '60': '60分',
      '15': '15分',
      '5': '5分'
    };
    return names[timeframe] || timeframe;
  }

  /**
   * 生成空状态HTML
   */
  static generateEmptyStateHTML() {
    return `
      <div class="datasources-empty">
        <div class="datasources-empty-icon">📊</div>
        <h3 class="datasources-empty-title">数据源管理</h3>
        <p class="datasources-empty-desc">管理和监控所有数据源的状态</p>
      </div>
    `;
  }

  /**
   * 生成错误HTML
   */
  static generateErrorHTML(error) {
    return `
      <div class="datasources-error">
        <div class="error-icon">⚠️</div>
        <h3>加载失败</h3>
        <p>${error}</p>
      </div>
    `;
  }
}

export default DataSources;
