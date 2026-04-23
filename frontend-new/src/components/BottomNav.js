/**
 * 底部导航组件
 * 移动端5个核心功能入口
 */

import { eventBus, Events } from '../config.js';
import { logger } from '../utils/logger.js';

export class BottomNav {
  constructor() {
    this.currentPage = 'chart';
    this.longPressTimer = null;
    this.longPressDuration = 500;
  }

  /**
   * 导航配置
   */
  get navItems() {
    return [
      { id: 'chart', icon: '📊', label: '分析', hash: '#chart' },
      { id: 'watchlist', icon: '⭐', label: '关注', hash: '#watchlist' },
      { id: 'multi', icon: '📈', label: '多周期', hash: '#multi' },
      { id: 'logs', icon: '📋', label: '日志', hash: '#logs' },
      { id: 'settings', icon: '⚙️', label: '设置', hash: '#settings' }
    ];
  }

  /**
   * 生成HTML
   */
  generateHTML() {
    const items = this.navItems.map(item => `
      <button class="bottom-nav-item ${item.id === this.currentPage ? 'active' : ''}"
              data-page="${item.id}"
              data-hash="${item.hash}"
              aria-label="${item.label}">
        <span class="bottom-nav-icon">${item.icon}</span>
        <span class="bottom-nav-label">${item.label}</span>
      </button>
    `).join('');

    return `
      <nav class="bottom-nav mobile-only" id="bottomNav" role="navigation">
        ${items}
      </nav>
    `;
  }

  /**
   * 渲染到指定容器
   */
  render(containerId = 'bottom-nav-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      logger.warn(`BottomNav container not found: ${containerId}`);
      return;
    }

    container.innerHTML = this.generateHTML();
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const nav = document.getElementById('bottomNav');
    if (!nav) return;

    const items = nav.querySelectorAll('.bottom-nav-item');

    items.forEach(item => {
      // 点击事件
      item.addEventListener('click', (e) => {
        this.handleClick(item);
      });

      // 触摸事件（长按刷新）
      item.addEventListener('touchstart', (e) => {
        this.handleTouchStart(e, item);
      }, { passive: true });

      item.addEventListener('touchend', (e) => {
        this.handleTouchEnd(e);
      }, { passive: true });

      item.addEventListener('touchmove', (e) => {
        this.handleTouchMove(e);
      }, { passive: true });
    });
  }

  /**
   * 处理点击
   */
  handleClick(item) {
    const page = item.dataset.page;
    const hash = item.dataset.hash;

    logger.info(`BottomNav clicked: ${page}`);

    // 更新当前页面
    this.setCurrentPage(page);

    // 页面ID映射（底部导航ID -> 标签页内容ID）
    const pageToTabId = {
      'chart': 'tab-analyze',
      'watchlist': 'tab-watchlist',
      'multi': 'tab-multi',
      'settings': 'tab-config',
      'logs': 'tab-status'
    };

    // 切换标签页内容
    this.switchTabContent(pageToTabId[page]);

    // 更新URL hash
    window.location.hash = hash;

    // 触发页面切换事件
    eventBus.emit(Events.TAB_CHANGE, { tab: page, hash });
  }

  /**
   * 切换标签页内容（参考旧版本 showTab 函数）
   */
  switchTabContent(targetTabId) {
    if (!targetTabId) return;

    // 顶部标签按钮ID映射
    const tabIdToButtonId = {
      'tab-analyze': 'tabAnalyze',
      'tab-watchlist': 'btnWatchlist',
      'tab-multi': 'tabMulti',
      'tab-config': 'tabConfig',
      'tab-status': 'tabStatus'
    };

    // 隐藏所有标签页内容
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
      tab.style.display = 'none';
    });

    // 移除所有标签按钮的active状态
    const allButtons = document.querySelectorAll('.tab-btn');
    allButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // 显示目标标签页
    const targetTab = document.getElementById(targetTabId);
    if (targetTab) {
      targetTab.classList.add('active');
      targetTab.style.display = 'block';
    }

    // 激活对应的标签按钮
    const targetButtonId = tabIdToButtonId[targetTabId];
    if (targetButtonId) {
      const targetButton = document.getElementById(targetButtonId);
      if (targetButton) {
        targetButton.classList.add('active');
      }
    }

    logger.debug(`Switched to tab: ${targetTabId}`);
  }

  /**
   * 处理触摸开始（长按检测）
   */
  handleTouchStart(event, item) {
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(item);
    }, this.longPressDuration);
  }

  /**
   * 处理触摸结束
   */
  handleTouchEnd(event) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * 处理触摸移动（取消长按）
   */
  handleTouchMove(event) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  /**
   * 处理长按（刷新当前页面）
   */
  handleLongPress(item) {
    const page = item.dataset.page;
    logger.info(`BottomNav long press: ${page}, triggering refresh`);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 触发刷新事件
    eventBus.emit(`mobile:refresh:${page}`, { source: 'longPress' });
  }

  /**
   * 设置当前页面
   */
  setCurrentPage(page) {
    this.currentPage = page;

    // 更新激活状态
    const items = document.querySelectorAll('.bottom-nav-item');
    items.forEach(item => {
      if (item.dataset.page === page) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  /**
   * 根据URL hash更新当前页面
   */
  updateFromHash() {
    const hash = window.location.hash.slice(1) || 'chart';

    const matchingItem = this.navItems.find(item => item.hash === `#${hash}`);
    if (matchingItem) {
      this.setCurrentPage(matchingItem.id);
    }
  }
}

// 导出单例
export default new BottomNav();
