import { serviceOrderStatusLabel, serviceOrderStatusTone } from './status-map';

describe('serviceOrderStatusLabel', () => {
  it('maps backend status to readable labels', () => {
    expect(serviceOrderStatusLabel.OPEN).toBe('Aberto');
    expect(serviceOrderStatusLabel.COMPLETED).toBe('Concluido');
  });
});

describe('serviceOrderStatusTone', () => {
  it('maps status to alert tone', () => {
    expect(serviceOrderStatusTone.CANCELED).toBe('red');
    expect(serviceOrderStatusTone.COMPLETED).toBe('green');
  });
});
