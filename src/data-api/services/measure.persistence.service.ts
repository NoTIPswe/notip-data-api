import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MeasureEntity } from './../entity/measure.entity';
import { NpQueryPersistenceInput } from './../interfaces/np-query-persistence.input';
import { PQueryPersistenceInput } from './../interfaces/p-query-persistence.input';
import { Repository } from 'typeorm';
import { PaginatedQuery } from './../interfaces/paginated-query';
import { NpQueryPersistenceService } from '../interfaces/np-query-persistence.service';

@Injectable()
export class MeasurePersistenceService implements NpQueryPersistenceService{
  constructor(@InjectRepository(MeasureEntity) private readonly r: Repository<MeasureEntity>,) {}

  async paginatedQuery(p: PQueryPersistenceInput): Promise<PaginatedQuery> {
    const qb = this.r.createQueryBuilder('m');

    if (p.gatewayId) {
      qb.andWhere('m.gatewayId = :gatewayId', { gatewayId: p.gatewayId });
    }

    if (p.sensorId) {
      qb.andWhere('m.sensorId = :sensorId', { sensorId: p.sensorId });
    }

    if (p.sensorType) {
      qb.andWhere('m.sensorType = :sensorType', { sensorType: p.sensorType });
    }

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
    const nextCursor =
      hasMore && data.length > 0 ? data[data.length - 1].time : undefined;

    return {
      data,
      nextCursor,
      hasMore,
    };
  }

  async nonPaginatedQuery(n: NpQueryPersistenceInput,): Promise<MeasureEntity[]> {
    const qb = this.r.createQueryBuilder('m');

    if (n.gatewayId) {
      qb.andWhere('m.gatewayId = :gatewayId', { gatewayId: n.gatewayId });
    }

    if (n.sensorId) {
      qb.andWhere('m.sensorId = :sensorId', { sensorId: n.sensorId });
    }

    if (n.sensorType) {
      qb.andWhere('m.sensorType = :sensorType', { sensorType: n.sensorType });
    }

    qb.andWhere('m.time >= :from', { from: n.from });
    qb.andWhere('m.time <= :to', { to: n.to });

    qb.orderBy('m.time', 'DESC');

    return qb.getMany();
  }
}