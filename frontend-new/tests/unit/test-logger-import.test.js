import { describe, it, expect } from 'vitest';

describe('Logger Import Test', () => {
  it('should import logger', async () => {
    const { logger } = await import('../../src/utils/logger.js');
    expect(logger).toBeDefined();
  });
});
