import { serviceOrderStatusLabel, serviceOrderStatusTone } from './status-map';

describe('serviceOrderStatus maps', () => {
  it('should have mapped labels and tones for critical statuses', () => {
    expect(serviceOrderStatusLabel.OPEN).toBe('Open');
    expect(serviceOrderStatusLabel.COMPLETED).toBe('Completed');
    expect(serviceOrderStatusTone.CANCELED).toBe('red');
  });
});
