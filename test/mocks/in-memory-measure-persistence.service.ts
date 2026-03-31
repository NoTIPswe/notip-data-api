import { Injectable } from '@nestjs/common';
import { MeasureEntity } from '../../src/data-api/entity/measure.entity';
import { NpQueryPersistenceInput } from '../../src/data-api/interfaces/np-query-persistence.input';
import { PQueryPersistenceInput } from '../../src/data-api/interfaces/p-query-persistence.input';
import { PaginatedQuery } from '../../src/data-api/interfaces/paginated-query';

const MEASURES: MeasureEntity[] = [
  {
    tenantId: 'tenant-1',
    gatewayId: 'gw-1',
    sensorId: 'sensor-1',
    sensorType: 'temperature',
    time: '2026-03-23T09:58:00.000Z',
    encryptedData: 'enc-3',
    iv: 'iv-3',
    authTag: 'tag-3',
    keyVersion: 1,
  },
  {
    tenantId: 'tenant-1',
    gatewayId: 'gw-1',
    sensorId: 'sensor-1',
    sensorType: 'temperature',
    time: '2026-03-23T09:55:00.000Z',
    encryptedData: 'enc-2',
    iv: 'iv-2',
    authTag: 'tag-2',
    keyVersion: 1,
  },
  {
    tenantId: 'tenant-1',
    gatewayId: 'gw-1',
    sensorId: 'sensor-2',
    sensorType: 'humidity',
    time: '2026-03-23T09:54:00.000Z',
    encryptedData: 'enc-1',
    iv: 'iv-1',
    authTag: 'tag-1',
    keyVersion: 2,
  },
  {
    tenantId: 'tenant-1',
    gatewayId: 'gw-2',
    sensorId: 'sensor-9',
    sensorType: 'pressure',
    time: '2026-03-23T09:40:00.000Z',
    encryptedData: 'enc-0',
    iv: 'iv-0',
    authTag: 'tag-0',
    keyVersion: 3,
  },
];

@Injectable()
export class InMemoryMeasurePersistenceService {
  paginatedQuery(input: PQueryPersistenceInput): Promise<PaginatedQuery> {
    const rows = this.filterMeasures(input);
    const data = rows.slice(0, input.limit);

    return Promise.resolve({
      data,
      hasMore: rows.length > input.limit,
      nextCursor:
        rows.length > input.limit && data.length > 0
          ? data[data.length - 1].time
          : undefined,
    });
  }

  nonPaginatedQuery(input: NpQueryPersistenceInput): Promise<MeasureEntity[]> {
    return Promise.resolve(this.filterMeasures(input));
  }

  private filterMeasures(
    input: NpQueryPersistenceInput & { cursor?: string },
  ): MeasureEntity[] {
    return MEASURES.filter((measure) => {
      const matchesGateway =
        !input.gatewayId?.length || input.gatewayId.includes(measure.gatewayId);
      const matchesSensor =
        !input.sensorId?.length || input.sensorId.includes(measure.sensorId);
      const matchesSensorType =
        !input.sensorType?.length ||
        input.sensorType.includes(measure.sensorType);
      const matchesFrom = measure.time >= input.from;
      const matchesTo = measure.time <= input.to;
      const matchesCursor = !input.cursor || measure.time < input.cursor;

      return (
        matchesGateway &&
        matchesSensor &&
        matchesSensorType &&
        matchesFrom &&
        matchesTo &&
        matchesCursor
      );
    }).sort((left, right) => right.time.localeCompare(left.time));
  }
}
