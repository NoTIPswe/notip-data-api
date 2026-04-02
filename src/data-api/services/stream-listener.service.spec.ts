import { firstValueFrom, take } from 'rxjs';
import { StreamListenerService } from './stream-listener.service';
import { MeasurePersistenceService } from './measure.persistence.service';
import { MeasureEntity } from '../entity/measure.entity';

describe('StreamListenerService', () => {
  let service: StreamListenerService;
  let persistence: jest.Mocked<MeasurePersistenceService>;

  const historicalMeasure: MeasureEntity = {
    time: '2026-03-23T09:58:00.000Z',
    tenantId: 'tenant-1',
    gatewayId: 'gw-1',
    sensorId: 'sensor-1',
    sensorType: 'temperature',
    encryptedData: 'enc-1',
    iv: 'iv-1',
    authTag: 'tag-1',
    keyVersion: 1,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-23T10:00:00.000Z'));

    persistence = {
      paginatedQuery: jest.fn(),
      nonPaginatedQuery: jest.fn(),
    } as unknown as jest.Mocked<MeasurePersistenceService>;

    service = new StreamListenerService(persistence);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('replays historical measures when since is provided', async () => {
    persistence.nonPaginatedQuery.mockResolvedValue([historicalMeasure]);

    await expect(
      firstValueFrom(
        service.stream({
          tenantId: 'tenant-1',
          since: '2026-03-23T09:50:00.000Z',
          gatewayId: ['gw-1'],
        }),
      ),
    ).resolves.toEqual({
      kind: 'data',
      data: {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        timestamp: '2026-03-23T09:58:00.000Z',
        encryptedData: 'enc-1',
        iv: 'iv-1',
        authTag: 'tag-1',
        keyVersion: 1,
      },
    });

    expect(persistence.nonPaginatedQuery.mock.calls[0]?.[0]).toEqual({
      tenantId: 'tenant-1',
      gatewayId: ['gw-1'],
      sensorId: undefined,
      sensorType: undefined,
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
    });
  });

  it('fan-outs live measures only to the matching tenant stream', async () => {
    persistence.nonPaginatedQuery.mockResolvedValue([]);

    const eventPromise = firstValueFrom(
      service.stream({ tenantId: 'tenant-1' }).pipe(take(1)),
    );

    service.publishLiveMeasure('tenant-2', {
      gatewayId: 'gw-2',
      sensorId: 'sensor-2',
      sensorType: 'humidity',
      timestamp: '2026-03-23T10:00:01.000Z',
      encryptedData: 'enc-2',
      iv: 'iv-2',
      authTag: 'tag-2',
      keyVersion: 2,
    });

    service.publishLiveMeasure('tenant-1', {
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: '2026-03-23T10:00:02.000Z',
      encryptedData: 'enc-live',
      iv: 'iv-live',
      authTag: 'tag-live',
      keyVersion: 3,
    });

    await expect(eventPromise).resolves.toEqual({
      kind: 'data',
      data: {
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        timestamp: '2026-03-23T10:00:02.000Z',
        encryptedData: 'enc-live',
        iv: 'iv-live',
        authTag: 'tag-live',
        keyVersion: 3,
      },
    });
  });

  it('emits token_expired immediately when the JWT is already expired', async () => {
    await expect(
      firstValueFrom(
        service.stream({
          tenantId: 'tenant-1',
          tokenExpiresAt: Date.now() - 1,
        }),
      ),
    ).resolves.toEqual({
      kind: 'error',
      reason: 'token_expired',
    });
  });

  it('emits token_expired when the JWT expires during the live stream', async () => {
    const eventPromise = firstValueFrom(
      service
        .stream({
          tenantId: 'tenant-1',
          tokenExpiresAt: Date.now() + 1000,
        })
        .pipe(take(1)),
    );

    jest.advanceTimersByTime(1000);

    await expect(eventPromise).resolves.toEqual({
      kind: 'error',
      reason: 'token_expired',
    });
  });
});
