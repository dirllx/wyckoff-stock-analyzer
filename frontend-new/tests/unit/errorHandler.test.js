/**
 * Error Handler Utility Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock toast
vi.mock('../../src/utils/toast.js', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}))

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn()
  }
}))

import errorHandler, { ErrorType } from '../../src/utils/errorHandler.js'
import toast from '../../src/utils/toast.js'
import { logger } from '../../src/utils/logger.js'

describe('Error Handler Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('classifyError', () => {
    it('should classify network errors', () => {
      const error = new Error('Network Error')
      delete error.response

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.NETWORK)
    })

    it('should classify timeout errors', () => {
      const error = new Error('Timeout')
      error.code = 'ECONNABORTED'
      delete error.response

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.TIMEOUT)
    })

    it('should classify 404 errors', () => {
      const error = {
        response: {
          status: 404
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.NOT_FOUND)
    })

    it('should classify 401 errors', () => {
      const error = {
        response: {
          status: 401
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.AUTHENTICATION)
    })

    it('should classify 403 errors', () => {
      const error = {
        response: {
          status: 403
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.AUTHORIZATION)
    })

    it('should classify 500 errors', () => {
      const error = {
        response: {
          status: 500
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.SERVER)
    })

    it('should classify 504 errors as timeout', () => {
      const error = {
        response: {
          status: 504
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.TIMEOUT)
    })

    it('should classify unknown status codes', () => {
      const error = {
        response: {
          status: 418
        }
      }

      const type = errorHandler.classifyError(error)
      expect(type).toBe(ErrorType.UNKNOWN)
    })
  })

  describe('getUserMessage', () => {
    it('should return custom message when provided', () => {
      const error = { response: { status: 404 } }
      const customMessage = 'Custom error message'

      const message = errorHandler.getUserMessage(error, customMessage)
      expect(message).toBe(customMessage)
    })

    it('should return response data message when available', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed'
          }
        }
      }

      const message = errorHandler.getUserMessage(error)
      expect(message).toBe('Validation failed')
    })

    it('should return default message for network errors', () => {
      const error = new Error('Network Error')
      delete error.response

      const message = errorHandler.getUserMessage(error)
      expect(message).toBe('网络连接失败，请检查您的网络设置')
    })

    it('should return default message for 404 errors', () => {
      const error = {
        response: {
          status: 404
        }
      }

      const message = errorHandler.getUserMessage(error)
      expect(message).toBe('请求的资源不存在')
    })

    it('should return default message for 500 errors', () => {
      const error = {
        response: {
          status: 500
        }
      }

      const message = errorHandler.getUserMessage(error)
      expect(message).toBe('服务器错误，请稍后再试')
    })
  })

  describe('handle', () => {
    it('should handle error with default options', () => {
      const error = { response: { status: 404 } }
      const result = errorHandler.handle(error)

      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('originalError')
    })

    it('should use custom message when provided', () => {
      const error = { response: { status: 404 } }
      const customMessage = 'Custom message'

      const result = errorHandler.handle(error, { customMessage })
      expect(result.message).toBe(customMessage)
    })

    it('should respect silent option', () => {
      const error = { response: { status: 404 } }

      errorHandler.handle(error, { silent: true })
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('should respect showToast option', () => {
      const error = { response: { status: 404 } }

      errorHandler.handle(error, { showToast: false })
      expect(toast.error).not.toHaveBeenCalled()
    })

    it('should include context in error log', () => {
      const error = { response: { status: 404 } }
      const context = { action: 'fetchStockData', symbol: 'AAPL' }

      errorHandler.handle(error, { context })

      expect(logger.error).toHaveBeenCalledWith(
        'Error handled',
        expect.objectContaining({
          context
        })
      )
    })
  })

  describe('handleNetworkError', () => {
    it('should handle network errors', () => {
      const error = new Error('Network Error')
      delete error.response

      const result = errorHandler.handleNetworkError(error)
      expect(result.type).toBe(ErrorType.NETWORK)
    })
  })

  describe('handleApiError', () => {
    it('should handle API errors', () => {
      const error = { response: { status: 500 } }

      const result = errorHandler.handleApiError(error)
      expect(result.type).toBe(ErrorType.SERVER)
    })

    it('should handle authentication errors specially', () => {
      const error = { response: { status: 401 } }

      errorHandler.handleApiError(error)
      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication error - user may need to re-login'
      )
    })
  })

  describe('wrap', () => {
    it('should wrap successful async function', async () => {
      const asyncFn = async () => 'success'

      const result = await errorHandler.wrap(asyncFn)
      expect(result).toBe('success')
    })

    it('should wrap failed async function', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      await expect(errorHandler.wrap(asyncFn)).rejects.toThrow('Test error')
    })

    it('should handle errors in wrapped function', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      try {
        await errorHandler.wrap(asyncFn)
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('safe', () => {
    it('should return result on success', async () => {
      const asyncFn = async () => 'success'

      const safeFn = errorHandler.safe(asyncFn)
      const result = await safeFn()

      expect(result).toBe('success')
    })

    it('should return null on error', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const safeFn = errorHandler.safe(asyncFn)
      const result = await safeFn()

      expect(result).toBeNull()
    })

    it('should handle errors in safe function', async () => {
      const asyncFn = async () => {
        throw new Error('Test error')
      }

      const safeFn = errorHandler.safe(asyncFn)

      await safeFn()

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
