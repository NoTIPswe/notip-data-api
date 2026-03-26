import { firstValueFrom, take } from 'rxjs';
import { StreamListenerService } from './stream-listener.service';

describe('StreamListenerService', () => {
  let service: StreamListenerService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00.000Z'));
    service = new StreamListenerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits sample events that match the requested filters', async () => {
    const eventPromise = firstValueFrom(
      service
        .stream({
          gatewayId: ['gw-1'],
          sensorId: ['sensor-1'],
          sensorType: ['temperature'],
        })
        .pipe(take(1)),
    );

    jest.advanceTimersByTime(1000);

    await expect(eventPromise).resolves.toEqual({
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: '2026-03-23T10:00:01.000Z',
      encryptedData: 'encrypted',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    });
  });

  it('filters out events that do not match the requested filters', () => {
    const next = jest.fn();
    const subscription = service
      .stream({
        gatewayId: ['gw-2'],
      })
      .subscribe(next);

    jest.advanceTimersByTime(1000);

    expect(next).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
