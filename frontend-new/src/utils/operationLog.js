/**
 * 操作日志组件
 * 记录和显示用户操作日志
 */


/**
 * HTML转义函数 - 防止XSS攻击
 * 将用户输入中的特殊字符转义为HTML实体
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的安全HTML字符串
 * @example
 * escapeHtml('<script>alert("XSS")</script>')
 * // returns: '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 日志类型
 */
const LogType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  ACTION: 'action',
  API: 'api',
  SYSTEM: 'system'
};

/**
 * 日志级别配置
 */
const LOG_LEVEL_CONFIG = {
  info: { color: '#6366f1', icon: 'ℹ️', label: '信息' },
  success: { color: '#10b981', icon: '✅', label: '成功' },
  warning: { color: '#f59e0b', icon: '⚠️', label: '警告' },
  error: { color: '#ef4444', icon: '❌', label: '错误' },
  action: { color: '#06b6d4', icon: '▶️', label: '操作' },
  api: { color: '#8b5cf6', icon: '🔌', label: 'API' },
  system: { color: '#9ca3af', icon: '⚙️', label: '系统' }
};

/**
 * 操作日志管理类
 */
class OperationLogManager {
  constructor() {
    this.logs = [];
    this.maxLogs = 200;
    this.container = null;
    this.isExpanded = false; // 默认收缩
    this.filter = 'all'; // all, info, success, warning, error, action, api, system
    this.initialized = false;
    this.pendingLogs = [];
    // 延迟初始化，不阻塞主流程
    this.deferInit();
  }

  /**
   * 延迟初始化
   */
  deferInit() {
    if (typeof document === 'undefined') return;

    // 使用setTimeout延迟初始化，确保不阻塞
    setTimeout(() => {
      this.init();
    }, 100);
  }

  /**
   * 初始化
   */
  init() {
    if (this.initialized || typeof document === 'undefined') return;

    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createContainer());
    } else {
      this.createContainer();
    }

    this.initialized = true;

    // 处理等待中的日志
    if (this.pendingLogs.length > 0) {
      this.pendingLogs.forEach(log => {
        this.addLog(log.action, log.detail, log.type);
      });
      this.pendingLogs = [];
    }
  }

  /**
   * 创建日志容器
   */
  createContainer() {
    // 确保document.body存在
    if (!document.body) {
      setTimeout(() => this.createContainer(), 50);
      return;
    }

    // 检查是否已存在
    if (document.getElementById('operationLogContainer')) {
      this.container = document.getElementById('operationLogContainer');
      return;
    }

    const container = document.createElement('div');
    container.id = 'operationLogContainer';
    container.className = 'operation-log-container';
    container.innerHTML = `
      <div class="operation-log-header">
        <div class="operation-log-title">
          <div class="health-status-bar">
            <div class="health-indicator">
              <div class="health-dot" id="overallStatusDot"></div>
              <span class="health-label">System</span>
              <span class="health-value" id="overallStatusText">检查中...</span>
            </div>
            <div class="health-divider"></div>
            <div class="health-indicator">
              <div class="health-dot" id="dbStatusDot"></div>
              <span class="health-label">DB</span>
              <span class="health-value" id="dbStatusText">-</span>
            </div>
            <div class="health-divider"></div>
            <div class="health-indicator">
              <div class="health-dot" id="redisStatusDot"></div>
              <span class="health-label">Cache</span>
              <span class="health-value" id="redisStatusText">-</span>
            </div>
          </div>
          <span class="operation-log-icon">📋</span>
          <span>操作日志</span>
          <span class="operation-log-count" id="logCount">0</span>
        </div>
        <div class="operation-log-controls">
          <select id="logFilter" class="operation-log-filter">
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="success">成功</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
            <option value="action">操作</option>
            <option value="api">API</option>
            <option value="system">系统</option>
          </select>
          <button id="logToggle" class="operation-log-toggle" title="收起/展开">
            <span class="collapse-icon">▲</span>
          </button>
          <button id="logClear" class="operation-log-clear" title="清空日志">
            🗑️
          </button>
        </div>
      </div>
      <div class="operation-log-content" id="logContent" style="display: none;">
        <div class="operation-log-empty">等待操作...</div>
      </div>
    `;

    // 添加到页面底部
    document.body.appendChild(container);
    this.container = container;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    if (!this.container) return;

    // 展开/收起
    const toggleBtn = document.getElementById('logToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    // 筛选
    const filterSelect = document.getElementById('logFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.filter = e.target.value;
        this.render();
      });
    }

    // 清空
    const clearBtn = document.getElementById('logClear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clear());
    }
  }

  /**
   * 添加日志
   * @param {string} action - 操作名称
   * @param {string} detail - 详细信息
   * @param {string} type - 日志类型
   */
  add(action, detail = '', type = LogType.INFO) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });

    const logEntry = {
      id: Date.now() + Math.random(),
      time: timeStr,
      action: action,
      detail: detail,
      type: type
    };

    this.logs.unshift(logEntry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // 如果容器还未创建，暂存日志
    if (!this.container) {
      this.pendingLogs.push(logEntry);
    } else {
      // 更新显示
      this.render();
    }

    // 调试：输出到控制台（生产环境可移除）
    // console.log(`[${timeStr}] ${action}: ${detail}`);

    return logEntry;
  }

  /**
   * 内部方法：直接添加日志（不触发渲染）
   */
  addLog(action, detail = '', type = LogType.INFO) {
    return this.add(action, detail, type);
  }

  /**
   * 便捷方法：信息日志
   */
  info(action, detail) {
    return this.add(action, detail, LogType.INFO);
  }

  /**
   * 便捷方法：成功日志
   */
  success(action, detail) {
    return this.add(action, detail, LogType.SUCCESS);
  }

  /**
   * 便捷方法：警告日志
   */
  warning(action, detail) {
    return this.add(action, detail, LogType.WARNING);
  }

  /**
   * 便捷方法：错误日志
   */
  error(action, detail) {
    return this.add(action, detail, LogType.ERROR);
  }

  /**
   * 便捷方法：操作日志
   */
  action(action, detail) {
    return this.add(action, detail, LogType.ACTION);
  }

  /**
   * 便捷方法：API日志
   */
  api(action, detail) {
    return this.add(action, detail, LogType.API);
  }

  /**
   * 便捷方法：系统日志
   */
  system(action, detail) {
    return this.add(action, detail, LogType.SYSTEM);
  }

  /**
   * 渲染日志
   */
  render() {
    if (!this.container) return;

    const logContent = document.getElementById('logContent');
    const logCount = document.getElementById('logCount');

    if (!logContent) return;

    // 更新计数
    if (logCount) {
      logCount.textContent = this.logs.length;
    }

    // 筛选日志
    const filteredLogs = this.filter === 'all'
      ? this.logs
      : this.logs.filter(log => log.type === this.filter);

    if (filteredLogs.length === 0) {
      logContent.innerHTML = '<div class="operation-log-empty">暂无日志</div>';
      return;
    }

    // 生成HTML（转义用户输入防止XSS）
    const logsHtml = filteredLogs.map(log => {
      const config = LOG_LEVEL_CONFIG[log.type] || LOG_LEVEL_CONFIG.info;
      const safeAction = escapeHtml(log.action);
      const safeDetail = log.detail ? escapeHtml(log.detail) : '';
      return `
        <div class="operation-log-entry log-type-${log.type}">
          <span class="log-time">[${escapeHtml(log.time)}]</span>
          <span class="log-icon">${config.icon}</span>
          <span class="log-action" style="color: ${config.color};">${safeAction}</span>
          ${safeDetail ? `<span class="log-detail">${safeDetail}</span>` : ''}
        </div>
      `;
    }).join('');

    logContent.innerHTML = logsHtml;
  }

  /**
   * 展开/收起日志
   */
  toggle() {
    this.isExpanded = !this.isExpanded;

    const logContent = document.getElementById('logContent');
    const collapseIcon = this.container?.querySelector('.collapse-icon');

    if (logContent) {
      logContent.style.display = this.isExpanded ? 'block' : 'none';
    }

    if (collapseIcon) {
      collapseIcon.textContent = this.isExpanded ? '▼' : '▲';
    }

    // 保存状态到localStorage
    localStorage.setItem('operationLogExpanded', this.isExpanded);
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = [];
    this.render();
  }

  /**
   * 导出日志
   */
  export() {
    const logsText = this.logs.map(log => {
      return `[${log.time}] [${log.type}] ${log.action}${log.detail ? ': ' + log.detail : ''}`;
    }).join('\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operation-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    this.add('日志导出', `导出 ${this.logs.length} 条日志`, LogType.SUCCESS);
  }
}

// 创建单例实例
const operationLog = new OperationLogManager();

// 导出
export { operationLog, LogType, OperationLogManager };
export default operationLog;
