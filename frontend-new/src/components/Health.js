/**
 * 系统健康检查组件
 */
import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { healthApi } from '../api/health.js';

export class Health {
  /**
   * 生成健康检查HTML
   * @param {Object} healthData - 健康数据
   * @param {Object} testData - 测试数据
   * @returns {string} HTML字符串
   */
  static generateHealthHTML(healthData = {}, testData = {}) {
    const {
      status = 'unknown',
      timestamp = new Date().toISOString(),
      services = {},
      version = 'unknown'
    } = healthData;

    const {
      total_tests = 0,
      passed_tests = 0,
      failed_tests = 0,
      last_run = null,
      test_results = []
    } = testData;

    const statusColor = this.getStatusColor(status);
    const statusIcon = this.getStatusIcon(status);
    const testSuccessRate = total_tests > 0 ? Math.round((passed_tests / total_tests) * 100) : 0;

    return `
      <div class="health-container">
        <div class="health-header">
          <h2 class="health-title">🏥 系统健康检查</h2>
          <div class="health-actions">
            <button id="refresh-health-btn" class="health-btn health-btn-primary">
              🔄 刷新状态
            </button>
            <button id="run-tests-btn" class="health-btn health-btn-secondary">
              🧪 运行测试
            </button>
          </div>
        </div>

        <div class="health-content">
          <!-- 系统状态概览 -->
          <section class="health-section">
            <h3 class="health-section-title">📊 系统状态</h3>
            <div class="health-status-overview">
              <div class="health-status-card ${statusColor}">
                <div class="health-status-icon">${statusIcon}</div>
                <div class="health-status-info">
                  <div class="health-status-label">系统状态</div>
                  <div class="health-status-value">${this.getStatusDisplayName(status)}</div>
                </div>
              </div>

              <div class="health-info-card">
                <div class="health-info-label">版本</div>
                <div class="health-info-value">${version}</div>
              </div>

              <div class="health-info-card">
                <div class="health-info-label">最后更新</div>
                <div class="health-info-value">${this.formatTimestamp(timestamp)}</div>
              </div>
            </div>
          </section>

          <!-- 服务状态 -->
          <section class="health-section">
            <h3 class="health-section-title">🔧 服务状态</h3>
            <div class="health-services-grid">
              ${this.generateServiceStatusHTML(services)}
            </div>
          </section>

          <!-- 测试状态 -->
          <section class="health-section">
            <h3 class="health-section-title">🧪 测试状态</h3>
            <div class="health-test-overview">
              <div class="health-test-card">
                <div class="health-test-icon">📋</div>
                <div class="health-test-info">
                  <div class="health-test-label">总测试数</div>
                  <div class="health-test-value">${total_tests}</div>
                </div>
              </div>

              <div class="health-test-card health-test-pass">
                <div class="health-test-icon">✅</div>
                <div class="health-test-info">
                  <div class="health-test-label">通过</div>
                  <div class="health-test-value">${passed_tests}</div>
                </div>
              </div>

              <div class="health-test-card health-test-fail">
                <div class="health-test-icon">❌</div>
                <div class="health-test-info">
                  <div class="health-test-label">失败</div>
                  <div class="health-test-value">${failed_tests}</div>
                </div>
              </div>

              <div class="health-test-card">
                <div class="health-test-icon">📊</div>
                <div class="health-test-info">
                  <div class="health-test-label">通过率</div>
                  <div class="health-test-value">${testSuccessRate}%</div>
                </div>
              </div>
            </div>

            ${last_run ? `
              <div class="health-test-meta">
                <span>最后运行: ${this.formatTimestamp(last_run)}</span>
              </div>
            ` : ''}

            ${test_results && test_results.length > 0 ? `
              <div class="health-test-results">
                <h4>测试详情</h4>
                <div class="health-test-list">
                  ${test_results.map(test => this.generateTestResultHTML(test)).join('')}
                </div>
              </div>
            ` : ''}
          </section>
        </div>
      </div>
    `;
  }

  /**
   * 生成服务状态HTML
   * @param {Object} services - 服务状态对象
   * @returns {string} HTML字符串
   */
  static generateServiceStatusHTML(services) {
    const defaultServices = {
      api: { status: 'unknown', response_time: null },
      database: { status: 'unknown', response_time: null },
      cache: { status: 'unknown', response_time: null },
      data_source: { status: 'unknown', response_time: null }
    };

    const allServices = { ...defaultServices, ...services };

    return Object.entries(allServices).map(([name, info]) => {
      const { status = 'unknown', response_time = null } = info;
      const statusColor = this.getServiceStatusColor(status);
      const statusIcon = this.getServiceStatusIcon(status);
      const displayName = this.getServiceDisplayName(name);

      return `
        <div class="health-service-card ${statusColor}">
          <div class="health-service-header">
            <div class="health-service-icon">${statusIcon}</div>
            <div class="health-service-info">
              <div class="health-service-name">${displayName}</div>
              <div class="health-service-status">${this.getServiceStatusDisplayName(status)}</div>
            </div>
          </div>
          ${response_time !== null ? `
            <div class="health-service-response-time">
              响应时间: ${response_time}ms
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  /**
   * 生成测试结果HTML
   * @param {Object} test - 测试结果对象
   * @returns {string} HTML字符串
   */
  static generateTestResultHTML(test) {
    const { name = 'Unknown', status = 'unknown', duration = 0, error = null } = test;
    const statusClass = status === 'passed' ? 'test-pass' : 'test-fail';
    const statusIcon = status === 'passed' ? '✅' : '❌';

    return `
      <div class="health-test-result ${statusClass}">
        <div class="health-test-result-header">
          <span class="health-test-result-icon">${statusIcon}</span>
          <span class="health-test-result-name">${name}</span>
          <span class="health-test-result-duration">${duration}ms</span>
        </div>
        ${error ? `
          <div class="health-test-result-error">
            <strong>错误:</strong> ${error}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 生成空状态HTML
   * @returns {string} HTML字符串
   */
  static generateEmptyStateHTML() {
    return `
      <div class="health-empty">
        <div class="health-empty-icon">🏥</div>
        <h3 class="health-empty-title">健康检查加载中...</h3>
      </div>
    `;
  }

  /**
   * 生成错误状态HTML
   * @param {string} message - 错误消息
   * @returns {string} HTML字符串
   */
  static generateErrorHTML(message = '健康检查加载失败') {
    return `
      <div class="health-error">
        <div class="health-error-icon">⚠️</div>
        <h3 class="health-error-title">${message}</h3>
        <button id="retry-health-btn" class="health-btn health-btn-primary">
          🔄 重试
        </button>
      </div>
    `;
  }

  /**
   * 渲染健康检查
   * @param {string} containerId - 容器ID
   * @param {Object} healthData - 健康数据
   * @param {Object} testData - 测试数据
   */
  static render(containerId, healthData, testData) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.error(`Health: Container ${containerId} not found`);
      return;
    }

    container.innerHTML = this.generateHealthHTML(healthData, testData);
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  static bindEvents() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refresh-health-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshHealth());
    }

    // 运行测试按钮
    const runTestsBtn = document.getElementById('run-tests-btn');
    if (runTestsBtn) {
      runTestsBtn.addEventListener('click', () => this.runTests());
    }

    // 重试按钮
    const retryBtn = document.getElementById('retry-health-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.refreshHealth());
    }
  }

  /**
   * 刷新健康状态
   */
  static async refreshHealth() {
    try {
      logger.info('Refreshing health status...');

      const [healthData, testData] = await Promise.all([
        healthApi.getHealthStatus(),
        healthApi.getTestStatus()
      ]);

      this.render('health', healthData, testData);

      toast.success('健康状态已更新');
    } catch (error) {
      logger.error('Failed to refresh health status:', error);

      const container = document.getElementById('health');
      if (container) {
        container.innerHTML = this.generateErrorHTML(error.message);
        this.bindEvents();
      }

      toast.error('健康状态刷新失败');
    }
  }

  /**
   * 运行测试
   */
  static async runTests() {
    try {
      logger.info('Running tests...');

      toast.info('正在运行测试...');

      const testData = await healthApi.runTests('all');

      // 刷新健康状态以获取最新测试结果
      await this.refreshHealth();

      const { passed_tests, total_tests } = testData;
      if (passed_tests === total_tests) {
        toast.success(`所有测试通过 (${passed_tests}/${total_tests})`);
      } else {
        toast.warning(`部分测试失败 (${passed_tests}/${total_tests})`);
      }
    } catch (error) {
      logger.error('Failed to run tests:', error);
      toast.error('测试运行失败');
    }
  }

  /**
   * 获取状态颜色
   * @param {string} status - 状态
   * @returns {string} 颜色类名
   */
  static getStatusColor(status) {
    const colors = {
      healthy: 'status-healthy',
      degraded: 'status-degraded',
      unhealthy: 'status-unhealthy',
      unknown: 'status-unknown'
    };
    return colors[status] || colors.unknown;
  }

  /**
   * 获取状态图标
   * @param {string} status - 状态
   * @returns {string} 图标
   */
  static getStatusIcon(status) {
    const icons = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
      unknown: '❓'
    };
    return icons[status] || icons.unknown;
  }

  /**
   * 获取状态显示名称
   * @param {string} status - 状态
   * @returns {string} 显示名称
   */
  static getStatusDisplayName(status) {
    const names = {
      healthy: '健康',
      degraded: '降级',
      unhealthy: '不健康',
      unknown: '未知'
    };
    return names[status] || names.unknown;
  }

  /**
   * 获取服务状态颜色
   * @param {string} status - 状态
   * @returns {string} 颜色类名
   */
  static getServiceStatusColor(status) {
    const colors = {
      healthy: 'service-healthy',
      degraded: 'service-degraded',
      unhealthy: 'service-unhealthy',
      unknown: 'service-unknown'
    };
    return colors[status] || colors.unknown;
  }

  /**
   * 获取服务状态图标
   * @param {string} status - 状态
   * @returns {string} 图标
   */
  static getServiceStatusIcon(status) {
    return this.getStatusIcon(status);
  }

  /**
   * 获取服务状态显示名称
   * @param {string} status - 状态
   * @returns {string} 显示名称
   */
  static getServiceStatusDisplayName(status) {
    return this.getStatusDisplayName(status);
  }

  /**
   * 获取服务显示名称
   * @param {string} name - 服务名称
   * @returns {string} 显示名称
   */
  static getServiceDisplayName(name) {
    const names = {
      api: 'API服务',
      database: '数据库',
      cache: '缓存',
      data_source: '数据源'
    };
    return names[name] || name;
  }

  /**
   * 格式化时间戳
   * @param {string} timestamp - ISO时间戳
   * @returns {string} 格式化的时间
   */
  static formatTimestamp(timestamp) {
    if (!timestamp) return '未知';

    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      // 小于1分钟
      if (diff < 60000) {
        return '刚刚';
      }

      // 小于1小时
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
      }

      // 小于1天
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
      }

      // 格式化为日期时间
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }
}
