/**
 * Error Handler Utility
 * Provides centralized error handling and user-friendly error messages
 */

import { logger } from './logger.js'
import toast from './toast.js'

/**
 * Error types classification
 */
export const ErrorType = {
  NETWORK: 'NETWORK',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  TIMEOUT: 'TIMEOUT',
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  UNKNOWN: 'UNKNOWN'
}

/**
 * User-friendly error messages (Chinese)
 */
const errorMessages = {
  [ErrorType.NETWORK]: '网络连接失败，请检查您的网络设置',
  [ErrorType.NOT_FOUND]: '请求的资源不存在',
  [ErrorType.SERVER]: '服务器错误，请稍后再试',
  [ErrorType.TIMEOUT]: '请求超时，请稍后再试',
  [ErrorType.VALIDATION]: '输入数据格式不正确',
  [ErrorType.AUTHENTICATION]: '登录已过期，请重新登录',
  [ErrorType.AUTHORIZATION]: '您没有权限执行此操作',
  [ErrorType.UNKNOWN]: '发生未知错误，请稍后再试'
}

/**
 * HTTP status code to error type mapping
 */
const statusCodeToErrorType = {
  400: ErrorType.VALIDATION,
  401: ErrorType.AUTHENTICATION,
  403: ErrorType.AUTHORIZATION,
  404: ErrorType.NOT_FOUND,
  408: ErrorType.TIMEOUT,
  500: ErrorType.SERVER,
  502: ErrorType.SERVER,
  503: ErrorType.SERVER,
  504: ErrorType.TIMEOUT
}

/**
 * Error Handler Class
 */
class ErrorHandler {
  /**
   * Classify error based on error object or status code
   */
  classifyError(error) {
    // Network error (no response)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return ErrorType.TIMEOUT
      }
      return ErrorType.NETWORK
    }

    // Server responded with error status
    const status = error.response.status
    return statusCodeToErrorType[status] || ErrorType.UNKNOWN
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error, customMessage = null) {
    const errorType = this.classifyError(error)

    if (customMessage) {
      return customMessage
    }

    // Try to get message from response
    if (error.response?.data?.message) {
      return error.response.data.message
    }

    return errorMessages[errorType] || errorMessages[ErrorType.UNKNOWN]
  }

  /**
   * Handle error with logging and toast notification
   */
  handle(error, options = {}) {
    const {
      customMessage = null,
      showToast = true,
      toastDuration = 5000,
      context = null,
      silent = false
    } = options

    const errorType = this.classifyError(error)
    const userMessage = this.getUserMessage(error, customMessage)

    // Log error
    if (!silent) {
      logger.error('Error handled', {
        type: errorType,
        message: error.message,
        userMessage,
        status: error.response?.status,
        context
      })
    }

    // Show toast notification
    if (showToast && typeof toast !== 'undefined') {
      toast.error(userMessage, toastDuration)
    }

    return {
      type: errorType,
      message: userMessage,
      originalError: error
    }
  }

  /**
   * Handle network error specifically
   */
  handleNetworkError(error, options = {}) {
    return this.handle(error, {
      ...options,
      customMessage: options.customMessage || errorMessages[ErrorType.NETWORK]
    })
  }

  /**
   * Handle API error specifically
   */
  handleApiError(error, options = {}) {
    const errorType = this.classifyError(error)

    // Special handling for authentication errors
    if (errorType === ErrorType.AUTHENTICATION) {
      // Could trigger logout logic here
      logger.warn('Authentication error - user may need to re-login')
    }

    return this.handle(error, options)
  }

  /**
   * Wrap an async function with error handling
   */
  async wrap(asyncFn, options = {}) {
    try {
      return await asyncFn()
    } catch (error) {
      this.handle(error, options)
      throw error
    }
  }

  /**
   * Wrap an async function to return a wrapped version
   */
  wrapAsync(asyncFn, options = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        this.handle(error, options)
        throw error
      }
    }
  }

  /**
   * Wrap a sync function with error handling (for event listeners, etc.)
   */
  wrapSync(fn, options = {}) {
    return (...args) => {
      try {
        return fn(...args)
      } catch (error) {
        this.handle(error, options)
        throw error
      }
    }
  }

  /**
   * Create a safe version of an async function that catches errors
   */
  safe(asyncFn, options = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args)
      } catch (error) {
        this.handle(error, options)
        return null
      }
    }
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler()

// Convenience functions
export const handleError = (error) => errorHandler.handle(error);
export const classifyError = (error) => errorHandler.classifyError(error);
export const withAsyncErrorHandling = (fn, context) => errorHandler.wrapAsync(fn, { context });
export const withSyncErrorHandling = (fn, context) => errorHandler.wrapSync(fn, { context });
// Keep old name for backwards compatibility, but map to async version
export const withErrorHandling = (fn, context) => errorHandler.wrapAsync(fn, { context });

export { errorHandler }
export default errorHandler
