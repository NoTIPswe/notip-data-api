import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MeasureEntity } from './../entity/measure.entity';
import { NpQueryPersistenceInput } from './../interfaces/np-query-persistence.input';
import { PQueryPersistenceInput } from './../interfaces/p-query-persistence.input';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedQuery } from './../interfaces/paginated-query';
import { NpQueryPersistenceService } from '../interfaces/np-query-persistence.service';

const CURSOR_SEPARATOR = '|';

function applyScalarFilter(
  qb: SelectQueryBuilder<MeasureEntity>,
  column: string,
  parameterName: string,
  value?: string,
): void {
  if (!value) {
    return;
  }

  qb.andWhere(`${column} = :${parameterName}`, {
    [parameterName]: value,
  });
}

function applyArrayFilter(
  qb: SelectQueryBuilder<MeasureEntity>,
  column: string,
  parameterName: string,
  values?: string[],
): void {
  if (!values?.length) {
    return;
  }

  qb.andWhere(`${column} IN (:...${parameterName})`, {
    [parameterName]: values,
  });
}

function parseCompositeCursor(
  cursor: string,
): { time: string; sensorId: string } | undefined {
  const separatorIndex = cursor.lastIndexOf(CURSOR_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex >= cursor.length - 1) {
    return undefined;
  }

  return {
    time: cursor.slice(0, separatorIndex),
    sensorId: cursor.slice(separatorIndex + 1),
  };
}

function toCompositeCursor(time: string, sensorId: string): string {
  return `${time}${CURSOR_SEPARATOR}${sensorId}`;
}

@Injectable()
export class MeasurePersistenceService implements NpQueryPersistenceService {
  constructor(
    @InjectRepository(MeasureEntity)
    private readonly r: Repository<MeasureEntity>,
  ) {}

  async paginatedQuery(p: PQueryPersistenceInput): Promise<PaginatedQuery> {
    const qb = this.r.createQueryBuilder('m');

    applyScalarFilter(qb, 'm.tenantId', 'tenantId', p.tenantId);
    applyArrayFilter(qb, 'm.gatewayId', 'gatewayIds', p.gatewayId);
    applyArrayFilter(qb, 'm.sensorId', 'sensorIds', p.sensorId);
    applyArrayFilter(qb, 'm.sensorType', 'sensorTypes', p.sensorType);

    qb.andWhere('m.time >= :from', { from: p.from });
    qb.andWhere('m.time <= :to', { to: p.to });

    if (p.cursor) {
      const cursor = parseCompositeCursor(p.cursor);

      if (cursor) {
        qb.andWhere(
          '(m.time < :cursorTime OR (m.time = :cursorTime AND m.sensorId < :cursorSensorId))',
          {
            cursorTime: cursor.time,
            cursorSensorId: cursor.sensorId,
          },
        );
      } else {
        // Backward compatibility for old timestamp-only cursors.
        qb.andWhere('m.time < :cursor', { cursor: p.cursor });
      }
    }

    qb.orderBy('m.time', 'DESC');
    qb.addOrderBy('m.sensorId', 'DESC');
    qb.take(p.limit + 1);

    const rows = await qb.getMany();

    const hasMore = rows.length > p.limit;
    const data = hasMore ? rows.slice(0, p.limit) : rows;
    const lastRow = data.at(-1);
    const nextCursor =
      hasMore && lastRow
        ? toCompositeCursor(
            typeof lastRow.time === 'object' && lastRow.time !== null
              ? (lastRow.time as Date).toISOString()
              : String(lastRow.time),
            lastRow.sensorId,
          )
        : undefined;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async nonPaginatedQuery(
    n: NpQueryPersistenceInput,
  ): Promise<MeasureEntity[]> {
    const qb = this.r.createQueryBuilder('m');

    applyScalarFilter(qb, 'm.tenantId', 'tenantId', n.tenantId);
    applyArrayFilter(qb, 'm.gatewayId', 'gatewayIds', n.gatewayId);
    applyArrayFilter(qb, 'm.sensorId', 'sensorIds', n.sensorId);
    applyArrayFilter(qb, 'm.sensorType', 'sensorTypes', n.sensorType);

    qb.andWhere('m.time >= :from', { from: n.from });
    qb.andWhere('m.time <= :to', { to: n.to });

    qb.orderBy('m.time', 'DESC');

    return qb.getMany();
  }

  async getTenantDataSizeAtRest(_tenantId: string): Promise<number> {
    const rows: Array<{ data_size_at_rest?: number | string }> =
      await this.r.query(
        `
          SELECT pg_database_size(current_database())::bigint AS data_size_at_rest
        `,
      );

    const rawSize = rows[0]?.data_size_at_rest;
    if (typeof rawSize === 'number') {
      return Number.isFinite(rawSize) ? rawSize : 0;
    }

    if (typeof rawSize === 'string') {
      const parsed = Number(rawSize);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
  }
}
