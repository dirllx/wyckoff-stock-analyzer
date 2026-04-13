/**
 * Toast Notification System
 * Provides non-blocking feedback to users
 */

import { logger } from './logger.js'

class ToastManager {
  constructor() {
    this.toasts = []
    this.container = null
    this.maxToasts = 5
    this.defaultDuration = 3000
    this.init()
  }

  init() {
    if (typeof document === 'undefined') return

    // Create toast container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.className = 'toast-container'
      document.body.appendChild(this.container)
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (0 for no auto-hide)
   * @param {Object} options - Additional options
   */
  show(message, type = 'info', duration = this.defaultDuration, options = {}) {
    if (typeof document === 'undefined') return null

    const toast = this.createToast(message, type, options)
    this.container.appendChild(toast)
    this.toasts.push(toast)

    // Remove oldest toast if we exceed max
    if (this.toasts.length > this.maxToasts) {
      const oldestToast = this.toasts.shift()
      if (oldestToast && oldestToast.parentNode) {
        oldestToast.parentNode.removeChild(oldestToast)
      }
    }

    // Auto-hide after duration
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast)
      }, duration)
    }

    logger.debug('Toast shown', { message, type, duration })
    return toast
  }

  /**
   * Create a toast element
   */
  createToast(message, type, options = {}) {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    // 图标和渐变色
    const styles = {
      success: {
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="white"/></svg>'
      },
      error: {
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="white"/></svg>'
      },
      warning: {
        bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M1 17H19L10 2L1 17ZM11 14H9V12H11V14ZM11 10H9V6H11V10Z" fill="white"/></svg>'
      },
      info: {
        bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z" fill="white"/></svg>'
      }
    }

    const style = styles[type] || styles.info

    // Toast样式 - 使用CSS变量
    toast.innerHTML = `
      <div class="toast-icon">${style.icon}</div>
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <button class="toast-close" aria-label="关闭">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12.207 4.793a1 1 0 010 1.414L9.414 9l2.793 2.793a1 1 0 01-1.414 1.414L8 10.414l-2.793 2.793a1 1 0 01-1.414-1.414L6.586 9 3.793 6.207a1 1 0 011.414-1.414L8 7.586l2.793-2.793a1 1 0 011.414 0z" fill="white"/>
        </svg>
      </button>
      ${options.progress ? '<div class="toast-progress"></div>' : ''}
    `

    // 添加点击关闭事件
    const closeBtn = toast.querySelector('.toast-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.removeToast(toast)
      })
    }

    // 整个toast也可点击关闭
    toast.addEventListener('click', () => {
      this.removeToast(toast)
    })

    return toast
  }

  /**
   * Remove a toast with animation
   */
  removeToast(toast) {
    if (!toast) return

    // Remove from array immediately
    const index = this.toasts.indexOf(toast)
    if (index > -1) {
      this.toasts.splice(index, 1)
    }

    // Remove from DOM with animation
    if (toast.parentNode) {
      toast.classList.add('toast-removing')

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Convenience methods
  success(message, duration, options) {
    haptic.success();
    return this.show(message, 'success', duration, options)
  }

  error(message, duration, options) {
    haptic.error();
    return this.show(message, 'error', duration, options)
  }

  warning(message, duration, options) {
    haptic.heavy();
    return this.show(message, 'warning', duration, options)
  }

  info(message, duration, options) {
    haptic.light();
    return this.show(message, 'info', duration, options)
  }

  /**
   * Clear all toasts
   */
  clear() {
    this.toasts.forEach(toast => this.removeToast(toast))
    this.toasts = []
    logger.debug('All toasts cleared')
  }
}

/**
 * 触觉反馈工具
 */
export const haptic = {
  /**
   * 轻微震动（点击反馈）
   */
  light() {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /**
   * 中等震动（确认反馈）
   */
  medium() {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  },

  /**
   * 重度震动（警告/错误）
   */
  heavy() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  },

  /**
   * 成功震动模式
   */
  success() {
    if (navigator.vibrate) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  /**
   * 错误震动模式
   */
  error() {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  },

  /**
   * 长按触发震动
   */
  longPress() {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
};


// Create singleton instance
const toast = new ToastManager()

// Export as both default and named export
export { toast }
export default toast
