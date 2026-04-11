import { BadRequestException } from '@nestjs/common';

import { ServiceOrderStatusPolicy } from './service-order-status-policy.service';

describe('ServiceOrderStatusPolicy', () => {
  let policy: ServiceOrderStatusPolicy;

  beforeEach(() => {
    policy = new ServiceOrderStatusPolicy();
  });

  it('should allow OPEN to UNDER_ANALYSIS', () => {
    expect(policy.canTransition('OPEN', 'UNDER_ANALYSIS')).toBe(true);
  });

  it('should block OPEN to COMPLETED', () => {
    expect(policy.canTransition('OPEN', 'COMPLETED')).toBe(false);
  });

  it('should throw for invalid transition', () => {
    expect(() => policy.ensureTransition('OPEN', 'COMPLETED')).toThrow(BadRequestException);
  });

  it('should allow COMPLETED to REOPENED', () => {
    expect(policy.canTransition('COMPLETED', 'REOPENED')).toBe(true);
  });
});
