import { describe, it, expect } from 'vitest';

describe('Formatting Import Test', () => {
  it('should import formatting', async () => {
    const mod = await import('../../src/utils/formatting.js');
    expect(mod).toBeDefined();
    expect(typeof mod.formatNumber).toBe('function');
  });
});
