/**
 * 顶部状态栏组件
 * 显示系统健康状态
 */

import { healthApi } from '../api/health.js';
import { logger } from '../utils/logger.js';

export class HealthStatusBar {
  constructor() {
    this.status = {
      system: 'unknown',
      database: 'unknown',
      redis: 'unknown'
    };
  }

  /**
   * 生成HTML
   */
  generateHTML() {
    return `
      <div class="health-status-bar mobile-only" id="healthStatusBar">
        <span class="health-status-dot" id="mobileSystemStatus"></span>
        <span class="health-status-dot" id="mobileDbStatus"></span>
        <span class="health-status-dot" id="mobileRedisStatus"></span>
      </div>
    `;
  }

  /**
   * 渲染到指定容器
   */
  render(containerId = 'mobile-health-status') {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.warn(`HealthStatusBar container not found: ${containerId}`);
      return;
    }

    container.innerHTML = this.generateHTML();
    this.bindEvents();
    this.updateStatus();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const statusBar = document.getElementById('healthStatusBar');
    if (statusBar) {
      statusBar.addEventListener('click', () => this.showDetailedStatus());
    }
  }

  /**
   * 更新状态
   */
  async updateStatus() {
    try {
      const healthData = await healthApi.getHealthStatus();

      this.status.system = healthData.status === 'healthy' ? 'healthy' : 'error';
      this.status.database = healthData.database === 'connected' ? 'healthy' : 'error';
      this.status.redis = healthData.redis === 'connected' ? 'healthy' : 'error';

      this.updateDots();
    } catch (error) {
      logger.error('Failed to update health status:', error);
      this.status.system = 'error';
      this.status.database = 'error';
      this.status.redis = 'error';
      this.updateDots();
    }
  }

  /**
   * 更新状态点
   */
  updateDots() {
    const systemDot = document.getElementById('mobileSystemStatus');
    const dbDot = document.getElementById('mobileDbStatus');
    const redisDot = document.getElementById('mobileRedisStatus');

    if (systemDot) {
      systemDot.className = `health-status-dot ${this.status.system}`;
    }
    if (dbDot) {
      dbDot.className = `health-status-dot ${this.status.database}`;
    }
    if (redisDot) {
      redisDot.className = `health-status-dot ${this.status.redis}`;
    }
  }

  /**
   * 显示详细状态
   */
  showDetailedStatus() {
    const messages = {
      healthy: '系统正常',
      error: '系统异常',
      unknown: '检查中'
    };

    alert(`系统状态: ${messages[this.status.system]}\n数据库: ${messages[this.status.database]}\nRedis: ${messages[this.status.redis]}`);
  }
}

// 导出单例
export default new HealthStatusBar();
