/**
 * 移动端刷新工具
 * 支持下拉刷新、按钮刷新、长按刷新
 */

import { apiCache } from './cache.js';
import { toast } from './toast.js';
import { logger } from './logger.js';
import { eventBus, Events } from '../config.js';

export class MobileRefresh {
  constructor() {
    this.isRefreshing = false;
    this.pullStartY = 0;
    this.pullCurrentY = 0;
    this.isPulling = false;
    this.pullThreshold = 60; // 触发刷新的拉动距离
  }

  /**
   * 强制刷新指定页面
   * @param {string} page - 页面名称
   * @param {Object} options - 选项
   */
  async forceRefresh(page, options = {}) {
    if (this.isRefreshing) {
      logger.warn('Refresh already in progress');
      return;
    }

    this.isRefreshing = true;
    const { showLoading = true, showMessage = true } = options;

    try {
      if (showMessage) {
        toast.info('正在刷新...', { duration: 0 });
      }

      // 清除该页面缓存
      const cleared = apiCache.clearPageCache(page);
      logger.debug(`Cleared ${cleared} cache entries for ${page}`);

      // 触发刷新事件
      eventBus.emit(`mobile:refresh:${page}`, {
        forceRefresh: true,
        timestamp: Date.now()
      });

      if (showMessage) {
        toast.success('已更新');
      }

      logger.info(`Refresh completed for page: ${page}`);
    } catch (error) {
      logger.error(`Refresh failed for page ${page}:`, error);
      if (showMessage) {
        toast.error('刷新失败');
      }
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 初始化下拉刷新
   * @param {string} containerId - 容器ID
   * @param {string} page - 页面名称
   */
  initPullToRefresh(containerId, page) {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.warn(`PullToRefresh container not found: ${containerId}`);
      return;
    }

    // 创建下拉指示器
    const indicator = this.createIndicator();
    container.parentNode.insertBefore(indicator, container);

    // 绑定触摸事件
    container.addEventListener('touchstart', (e) => {
      this.handleTouchStart(e, container);
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      this.handleTouchMove(e, container, indicator);
    }, { passive: false });

    container.addEventListener('touchend', () => {
      this.handleTouchEnd(container, indicator, page);
    }, { passive: true });
  }

  /**
   * 创建下拉指示器
   */
  createIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = '<span class="refresh-icon">🔄</span> <span class="refresh-text">下拉刷新</span>';
    document.body.appendChild(indicator);
    return indicator;
  }

  /**
   * 处理触摸开始
   */
  handleTouchStart(event, container) {
    // 只有当滚动到顶部时才启用下拉刷新
    if (container.scrollTop === 0) {
      this.pullStartY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  /**
   * 处理触摸移动
   */
  handleTouchMove(event, container, indicator) {
    if (!this.isPulling) return;

    this.pullCurrentY = event.touches[0].clientY;
    const pullDistance = this.pullCurrentY - this.pullStartY;

    // 只有向下拉动时才响应
    if (pullDistance > 0 && container.scrollTop === 0) {
      // 阻止默认滚动行为
      event.preventDefault();

      // 限制最大拉动距离
      const clampedDistance = Math.min(pullDistance * 0.5, 120);

      // 更新指示器
      indicator.style.transform = `translateY(${clampedDistance}px)`;

      if (clampedDistance >= this.pullThreshold) {
        indicator.querySelector('.refresh-text').textContent = '释放刷新';
        indicator.classList.add('ready');
      } else {
        indicator.querySelector('.refresh-text').textContent = '下拉刷新';
        indicator.classList.remove('ready');
      }
    }
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(container, indicator, page) {
    if (!this.isPulling) return;

    const pullDistance = (this.pullCurrentY - this.pullStartY) * 0.5;

    if (pullDistance >= this.pullThreshold) {
      // 触发刷新
      indicator.classList.add('visible');
      indicator.querySelector('.refresh-text').textContent = '正在刷新...';
      indicator.querySelector('.refresh-icon').classList.add('spinning');

      this.forceRefresh(page).finally(() => {
        // 重置指示器
        setTimeout(() => {
          indicator.classList.remove('visible');
          indicator.querySelector('.refresh-icon').classList.remove('spinning');
        }, 500);
      });
    } else {
      // 回弹
      indicator.style.transform = '';
    }

    // 重置状态
    this.isPulling = false;
    this.pullStartY = 0;
    this.pullCurrentY = 0;
  }

  /**
   * 创建刷新按钮
   * @param {string} page - 页面名称
   */
  createRefreshButton(page) {
    const button = document.createElement('button');
    button.className = 'refresh-button mobile-only';
    button.innerHTML = '🔄';
    button.ariaLabel = '刷新';

    button.addEventListener('click', () => {
      button.classList.add('spinning');
      this.forceRefresh(page).finally(() => {
        button.classList.remove('spinning');
      });
    });

    return button;
  }

  /**
   * 初始化长按刷新
   * @param {string} elementId - 元素ID
   * @param {string} page - 页面名称
   */
  initLongPressRefresh(elementId, page) {
    const element = document.getElementById(elementId);
    if (!element) {
      logger.warn(`LongPressRefresh element not found: ${elementId}`);
      return;
    }

    let longPressTimer = null;
    const longPressDuration = 500;

    element.addEventListener('touchstart', () => {
      longPressTimer = setTimeout(() => {
        // 触觉反馈
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        // 触发刷新
        this.forceRefresh(page);
      }, longPressDuration);
    }, { passive: true });

    element.addEventListener('touchend', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    }, { passive: true });

    element.addEventListener('touchmove', () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    }, { passive: true });
  }
}

// 导出单例
export default new MobileRefresh();
