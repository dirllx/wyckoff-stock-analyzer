/**
 * 骨架屏组件
 * 用于数据加载时显示占位内容
 */

/**
 * 生成卡片骨架屏
 * @param {Object} options - 配置选项
 * @returns {string} HTML字符串
 */
export function generateCardSkeleton(options = {}) {
  const {
    title = true,
    avatar = false,
    lines = 3,
    button = false
  } = options;

  let html = '<div class="skeleton-card">';

  if (title || avatar) {
    html += '<div class="skeleton-card-header">';
    if (avatar) {
      html += '<div class="skeleton skeleton-avatar"></div>';
    }
    if (title) {
      html += '<div class="skeleton skeleton-title"></div>';
    }
    html += '</div>';
  }

  html += '<div class="skeleton-card-body">';
  for (let i = 0; i < lines; i++) {
    const widthClass = i === lines - 1 ? 'skeleton-text' : `skeleton-text ${Math.random() > 0.5 ? '' : 'skeleton-text-lg'}`;
    html += `<div class="skeleton ${widthClass}"></div>`;
  }
  html += '</div>';

  if (button) {
    html += '<div class="skeleton skeleton-button"></div>';
  }

  html += '</div>';
  return html;
}

/**
 * 生成表格骨架屏
 * @param {Object} options - 配置选项
 * @returns {string} HTML字符串
 */
export function generateTableSkeleton(options = {}) {
  const {
    rows = 5,
    columns = 6,
    header = true
  } = options;

  let html = '<div class="skeleton-table-wrapper">';

  if (header) {
    html += '<div class="skeleton-table-row">';
    for (let i = 0; i < columns; i++) {
      html += '<div class="skeleton skeleton-text-lg"></div>';
    }
    html += '</div>';
  }

  for (let i = 0; i < rows; i++) {
    html += '<div class="skeleton-table-row">';
    for (let j = 0; j < columns; j++) {
      html += '<div class="skeleton skeleton-table-cell"></div>';
    }
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * 生成图表骨架屏
 * @returns {string} HTML字符串
 */
export function generateChartSkeleton() {
  return `
    <div class="skeleton-chart">
      <div class="skeleton skeleton-title" style="width: 40%; margin: 0 auto 20px;"></div>
      <div class="skeleton" style="height: 300px; width: 100%;"></div>
      <div class="skeleton" style="height: 60px; width: 100%; margin-top: 12px;"></div>
    </div>
  `;
}

/**
 * 生成列表骨架屏
 * @param {Object} options - 配置选项
 * @returns {string} HTML字符串
 */
export function generateListSkeleton(options = {}) {
  const {
    items = 5,
    avatar = true,
    title = true,
    subtitle = true
  } = options;

  let html = '<div class="skeleton-list">';

  for (let i = 0; i < items; i++) {
    html += '<div class="skeleton-list-item" style="display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid var(--border-color);">';
    if (avatar) {
      html += '<div class="skeleton skeleton-avatar"></div>';
    }
    html += '<div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">';
    if (title) {
      html += '<div class="skeleton skeleton-text"></div>';
    }
    if (subtitle) {
      html += '<div class="skeleton skeleton-text-sm"></div>';
    }
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * 生成分析结果骨架屏
 * @returns {string} HTML字符串
 */
export function generateAnalysisSkeleton() {
  return `
    <div class="analysis-skeleton">
      <!-- 股票信息 -->
      <div class="skeleton-card">
        <div class="skeleton-card-header">
          <div class="skeleton skeleton-title" style="width: 50%;"></div>
        </div>
        <div class="skeleton-card-body">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>

      <!-- 分析摘要 -->
      <div class="skeleton-card">
        <div class="skeleton-card-header">
          <div class="skeleton skeleton-title" style="width: 30%;"></div>
        </div>
        <div class="skeleton-card-body">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="skeleton-card">
        <div class="skeleton-card-header">
          <div class="skeleton skeleton-title" style="width: 40%;"></div>
        </div>
        <div class="skeleton" style="height: 350px;"></div>
      </div>
    </div>
  `;
}

/**
 * 生成关注列表骨架屏
 * @param {number} count - 卡片数量
 * @returns {string} HTML字符串
 */
export function generateWatchlistSkeleton(count = 6) {
  let html = '<div class="watchlist-skeleton" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';

  for (let i = 0; i < count; i++) {
    html += generateCardSkeleton({
      title: true,
      avatar: false,
      lines: 4,
      button: true
    });
  }

  html += '</div>';
  return html;
}

/**
 * 显示骨架屏
 * @param {string} containerId - 容器ID
 * @param {Function} generator - 骨架屏生成函数
 */
export function showSkeleton(containerId, generator) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = generator();
  }
}

/**
 * 隐藏骨架屏并显示内容
 * @param {string} containerId - 容器ID
 * @param {string} content - 实际内容HTML
 */
export function hideSkeleton(containerId, content) {
  const container = document.getElementById(containerId);
  if (container) {
    // 添加淡入动画
    container.style.opacity = '0';
    container.innerHTML = content;
    requestAnimationFrame(() => {
      container.style.transition = 'opacity 0.3s ease-in-out';
      container.style.opacity = '1';
    });
  }
}

export default {
  generateCardSkeleton,
  generateTableSkeleton,
  generateChartSkeleton,
  generateListSkeleton,
  generateAnalysisSkeleton,
  generateWatchlistSkeleton,
  showSkeleton,
  hideSkeleton
};
