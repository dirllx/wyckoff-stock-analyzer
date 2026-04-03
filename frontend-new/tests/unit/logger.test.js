import { describe, it, expect, vi } from 'vitest';
import Logger from '../../src/utils/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // 重置日志级别
    Logger.setLevel('INFO');
  });

  it('should respect log level', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    Logger.setLevel('ERROR');
    Logger.info('test message');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should format message correctly', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    Logger.info('test message', { key: 'value' });

    expect(consoleSpy).toHaveBeenCalled();
    const callArgs = consoleSpy.mock.calls[0][0];
    expect(callArgs).toContain('[INFO]');
    expect(callArgs).toContain('test message');

    consoleSpy.mockRestore();
  });

  it('should support different log levels', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    Logger.setLevel('DEBUG');
    Logger.debug('debug message');
    Logger.info('info message');
    Logger.warn('warn message');
    Logger.error('error message');

    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
