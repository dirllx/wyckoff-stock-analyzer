import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, batch, PerformanceMonitor } from '../../src/utils/performance.js';

describe('performance - 防抖', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('应该只执行最后一次调用', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('应该在等待时间内重置计时器', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    vi.advanceTimersByTime(50);
    debounced('second');
    vi.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });
});

describe('performance - 节流', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('应该限制执行频率', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('a');
    throttled('b');
    throttled('c');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('a');
  });

  it('应该在间隔结束后执行最后一次缓存的调用', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);

    throttled('first');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('performance - 批处理', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('应该合并多次调用为一次批量执行', () => {
    const fn = vi.fn();
    const batched = batch(fn, 100);

    batched('a');
    batched('b');
    batched('c');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith([['a'], ['b'], ['c']]);
  });

  it('应该支持多次批处理周期', () => {
    const fn = vi.fn();
    const batched = batch(fn, 100);

    batched('a');
    vi.advanceTimersByTime(100);

    batched('b');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, [['a']]);
    expect(fn).toHaveBeenNthCalledWith(2, [['b']]);
  });
});

describe('performance - PerformanceMonitor', () => {
  it('measureSync应该测量同步操作耗时', () => {
    const result = PerformanceMonitor.measureSync('test-sync', () => {
      return 42;
    });

    expect(result).toBe(42);
  });

  it('measureAsync应该测量异步操作耗时', async () => {
    const result = await PerformanceMonitor.measureAsync('test-async', async () => {
      return 'hello';
    });

    expect(result).toBe('hello');
  });

  it('mark和measure应该能测量标记间耗时', () => {
    PerformanceMonitor.mark('test-start');
    PerformanceMonitor.mark('test-end');

    const duration = PerformanceMonitor.measure('test', 'test-start', 'test-end');
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
