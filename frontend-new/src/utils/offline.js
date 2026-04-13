/**
 * 离线检测工具
 */

import { toast } from './toast.js';
import { logger } from './logger.js';

export class OfflineDetector {
  constructor() {
    this.isOnline = navigator.onLine;
    this.offlineBanner = null;
  }

  /**
   * 初始化离线检测
   */
  init() {
    // 监听在线状态
    window.addEventListener('online', () => this.handleOnline());

    // 监听离线状态
    window.addEventListener('offline', () => this.handleOffline());

    // 创建离线横幅
    this.createBanner();

    // 初始状态检查
    this.updateStatus();

    logger.info('Offline detector initialized');
  }

  /**
   * 创建离线横幅
   */
  createBanner() {
    const banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.className = 'offline-banner';
    banner.innerHTML = `
      <span class="offline-icon">📡</span>
      <span class="offline-text">当前处于离线模式，部分功能受限</span>
    `;

    document.body.appendChild(banner);
    this.offlineBanner = banner;
  }

  /**
   * 处理上线
   */
  handleOnline() {
    this.isOnline = true;
    this.updateStatus();

    toast.success('网络已连接');
    logger.info('Network status: online');
  }

  /**
   * 处理离线
   */
  handleOffline() {
    this.isOnline = false;
    this.updateStatus();

    toast.warning('网络已断开，进入离线模式');
    logger.warn('Network status: offline');
  }

  /**
   * 更新状态显示
   */
  updateStatus() {
    if (this.offlineBanner) {
      if (this.isOnline) {
        this.offlineBanner.classList.remove('visible');
      } else {
        this.offlineBanner.classList.add('visible');
      }
    }
  }

  /**
   * 检查是否在线
   */
  checkOnline() {
    return this.isOnline;
  }
}

// 导出单例
export default new OfflineDetector();
