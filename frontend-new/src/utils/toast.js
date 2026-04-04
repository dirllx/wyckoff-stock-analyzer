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
      this.container.className = 'toast-container'
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `
      document.body.appendChild(this.container)
    }
  }

  /**
   * Show a toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (0 for no auto-hide)
   */
  show(message, type = 'info', duration = this.defaultDuration) {
    if (typeof document === 'undefined') return null

    const toast = this.createToast(message, type)
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
  createToast(message, type) {
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    const styles = {
      success: {
        bg: '#10b981',
        icon: '✓'
      },
      error: {
        bg: '#ef4444',
        icon: '✕'
      },
      warning: {
        bg: '#f59e0b',
        icon: '⚠'
      },
      info: {
        bg: '#3b82f6',
        icon: 'ℹ'
      }
    }

    const style = styles[type] || styles.info

    toast.style.cssText = `
      background: ${style.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 300px;
      max-width: 500px;
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `

    toast.innerHTML = `
      <span style="font-weight: bold; font-size: 18px;">${style.icon}</span>
      <span style="flex: 1;">${this.escapeHtml(message)}</span>
      <span style="opacity: 0.7; cursor: pointer;">✕</span>
    `

    // Add click to dismiss
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
      toast.style.animation = 'slideOut 0.3s ease-out'

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
  success(message, duration) {
    return this.show(message, 'success', duration)
  }

  error(message, duration) {
    return this.show(message, 'error', duration)
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration)
  }

  info(message, duration) {
    return this.show(message, 'info', duration)
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

// Add CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}

// Create singleton instance
const toast = new ToastManager()

export default toast
