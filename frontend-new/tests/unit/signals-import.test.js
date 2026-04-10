/**
 * 简单的Signals导入测试
 */

import { describe, it, expect } from 'vitest';

describe('Signals Import Test', () => {
  it('should import Signals class', async () => {
    const { Signals } = await import('../../src/components/Signals.js');
    expect(Signals).toBeDefined();
    expect(typeof Signals.getDirectionDisplayName).toBe('function');
  });

  it('should call static methods', async () => {
    const { Signals } = await import('../../src/components/Signals.js');
    expect(Signals.getDirectionDisplayName('LONG')).toBe('做多');
  });
});
