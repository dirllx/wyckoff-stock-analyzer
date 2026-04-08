/**
 * UI 管理模块
 * 负责标签页切换和主题管理
 */

import { logger } from '../utils/logger.js';
import { toast } from '../utils/toast.js';
import { AppConfig, AppState, Events, eventBus } from '../config.js';
import { DOM } from './dom.js';

/**
 * 切换标签页
 * @param {string} tabName - 标签页名称
 */
function switchTab(tabName) {
  // 更新标签按钮状态
  const buttons = DOM.tabNav.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // 更新面板显示
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  logger.info(`Switched to tab: ${tabName}`);
}

/**
 * 初始化主题
 */
function initTheme() {
  const theme = AppState.theme;
  document.documentElement.setAttribute('data-theme', theme);

  logger.info(`Theme initialized: ${theme}`);
}

/**
 * 切换主题
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  document.documentElement.setAttribute('data-theme', newTheme);
  AppState.theme = newTheme;

  // 保存到 localStorage
  localStorage.setItem(AppConfig.UI.THEME.STORAGE_KEY, newTheme);

  // 触发主题变更事件
  eventBus.emit(Events.THEME_CHANGE, { theme: newTheme });

  logger.info(`Theme changed to: ${newTheme}`);
  toast.success(`已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`);
}

export { switchTab, initTheme, toggleTheme };
