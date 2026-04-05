import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MeasureEntity } from './../entity/measure.entity';
import { NpQueryPersistenceInput } from './../interfaces/np-query-persistence.input';
import { PQueryPersistenceInput } from './../interfaces/p-query-persistence.input';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { PaginatedQuery } from './../interfaces/paginated-query';
import { NpQueryPersistenceService } from '../interfaces/np-query-persistence.service';

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
      qb.andWhere('m.time < :cursor', { cursor: p.cursor });
    }

    qb.orderBy('m.time', 'DESC');
    qb.take(p.limit + 1);

    const rows = await qb.getMany();

    const hasMore = rows.length > p.limit;
    const data = hasMore ? rows.slice(0, p.limit) : rows;
    const nextCursor = hasMore ? data.at(-1)?.time : undefined;

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

  async getTenantDataSizeAtRest(tenantId: string): Promise<number> {
    const rows: Array<{ data_size_at_rest?: number | string }> =
      await this.r.query(
        `
          SELECT COALESCE(SUM(pg_column_size(td)), 0)::bigint AS data_size_at_rest
          FROM telemetry td
          WHERE td.tenant_id = $1
        `,
        [tenantId],
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
