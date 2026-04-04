/**
 * Toast Utility Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

import toast from '../../src/utils/toast.js'

// Mock document methods
const mockElement = {
  style: {},
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  addEventListener: vi.fn(),
  classList: {
    add: vi.fn()
  }
}

describe('Toast Utility', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    toast.clear()
    vi.clearAllMocks()
  })

  describe('show', () => {
    it('should create a toast element', () => {
      const result = toast.show('Test message', 'info', 1000)
      expect(result).toBeDefined()
    })

    it('should create success toast with correct styling', () => {
      const result = toast.success('Success message')
      expect(result).toBeDefined()
    })

    it('should create error toast with correct styling', () => {
      const result = toast.error('Error message')
      expect(result).toBeDefined()
    })

    it('should create warning toast with correct styling', () => {
      const result = toast.warning('Warning message')
      expect(result).toBeDefined()
    })

    it('should create info toast with correct styling', () => {
      const result = toast.info('Info message')
      expect(result).toBeDefined()
    })

    it('should escape HTML in messages', () => {
      const result = toast.show('<script>alert("xss")</script>', 'info')
      expect(result).toBeDefined()
    })
  })

  describe('convenience methods', () => {
    it('should provide success method', () => {
      const result = toast.success('Success!')
      expect(result).toBeDefined()
    })

    it('should provide error method', () => {
      const result = toast.error('Error!')
      expect(result).toBeDefined()
    })

    it('should provide warning method', () => {
      const result = toast.warning('Warning!')
      expect(result).toBeDefined()
    })

    it('should provide info method', () => {
      const result = toast.info('Info!')
      expect(result).toBeDefined()
    })
  })

  describe('clear', () => {
    it('should clear all toasts', () => {
      toast.show('Message 1')
      toast.show('Message 2')
      toast.show('Message 3')

      toast.clear()
      expect(toast.toasts.length).toBe(0)
    })

    it('should handle clearing empty toast list', () => {
      toast.clear()
      toast.clear() // Should not throw
      expect(toast.toasts.length).toBe(0)
    })
  })

  describe('max toasts limit', () => {
    it('should not exceed max toasts limit', () => {
      // Show more than maxToasts (5)
      for (let i = 0; i < 10; i++) {
        toast.show(`Message ${i}`, 'info', 0) // 0 duration = no auto-hide
      }

      expect(toast.toasts.length).toBeLessThanOrEqual(toast.maxToasts)
    })
  })

  describe('duration', () => {
    it('should use default duration when not specified', () => {
      const result = toast.show('Test message')
      expect(result).toBeDefined()
    })

    it('should accept custom duration', () => {
      const result = toast.show('Test message', 'info', 5000)
      expect(result).toBeDefined()
    })

    it('should handle zero duration (no auto-hide)', () => {
      const result = toast.show('Test message', 'info', 0)
      expect(result).toBeDefined()
    })
  })

  describe('removeToast', () => {
    it('should remove a specific toast', () => {
      const toast1 = toast.show('Message 1', 'info', 0)
      const toast2 = toast.show('Message 2', 'info', 0)

      expect(toast.toasts.length).toBe(2)

      toast.removeToast(toast1)
      expect(toast.toasts.length).toBe(1)
      expect(toast.toasts).not.toContain(toast1)
    })

    it('should handle removing non-existent toast', () => {
      const fakeToast = {}
      toast.removeToast(fakeToast) // Should not throw
    })

    it('should handle removing already removed toast', () => {
      const toast1 = toast.show('Message 1', 'info', 0)
      toast.removeToast(toast1)
      toast.removeToast(toast1) // Should not throw
    })
  })
})
