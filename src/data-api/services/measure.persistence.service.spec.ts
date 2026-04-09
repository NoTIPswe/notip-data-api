import { MeasurePersistenceService } from './measure.persistence.service';
import { MeasureEntity } from '../entity/measure.entity';

describe('MeasurePersistenceService', () => {
  const createQueryBuilder = () => {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    return qb;
  };

  it('builds a paginated query with all filters and returns a composite next cursor', async () => {
    const qb = createQueryBuilder();
    const rows: MeasureEntity[] = [
      {
        time: '2026-03-23T09:58:00.000Z',
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        encryptedData: 'enc-1',
        iv: 'iv-1',
        authTag: 'tag-1',
        keyVersion: 1,
      },
      {
        time: '2026-03-23T09:55:00.000Z',
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        encryptedData: 'enc-2',
        iv: 'iv-2',
        authTag: 'tag-2',
        keyVersion: 1,
      },
      {
        time: '2026-03-23T09:54:00.000Z',
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        encryptedData: 'enc-3',
        iv: 'iv-3',
        authTag: 'tag-3',
        keyVersion: 1,
      },
    ];
    qb.getMany.mockResolvedValue(rows);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    const result = await service.paginatedQuery({
      gatewayId: ['gw-1'],
      sensorId: ['sensor-1'],
      sensorType: ['temperature'],
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
      cursor: '2026-03-23T09:59:00.000Z|sensor-9',
      limit: 2,
    });

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('m');
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      'm.gatewayId IN (:...gatewayIds)',
      {
        gatewayIds: ['gw-1'],
      },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      'm.sensorId IN (:...sensorIds)',
      {
        sensorIds: ['sensor-1'],
      },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      'm.sensorType IN (:...sensorTypes)',
      {
        sensorTypes: ['temperature'],
      },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(4, 'm.time >= :from', {
      from: '2026-03-23T09:50:00.000Z',
    });
    expect(qb.andWhere).toHaveBeenNthCalledWith(5, 'm.time <= :to', {
      to: '2026-03-23T10:00:00.000Z',
    });
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      6,
      '(m.time < :cursorTime OR (m.time = :cursorTime AND m.sensorId < :cursorSensorId))',
      {
        cursorTime: '2026-03-23T09:59:00.000Z',
        cursorSensorId: 'sensor-9',
      },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('m.time', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('m.sensorId', 'DESC');
    expect(qb.take).toHaveBeenCalledWith(3);
    expect(result).toEqual({
      data: rows.slice(0, 2),
      nextCursor: '2026-03-23T09:55:00.000Z|sensor-1',
      hasMore: true,
    });
  });

  it('supports tenant filter and Date instances when building next cursor', async () => {
    const qb = createQueryBuilder();
    const rows: MeasureEntity[] = [
      {
        time: new Date('2026-03-23T09:58:00.000Z') as unknown as string,
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-3',
        sensorType: 'temperature',
        encryptedData: 'enc-1',
        iv: 'iv-1',
        authTag: 'tag-1',
        keyVersion: 1,
      },
      {
        time: new Date('2026-03-23T09:55:00.000Z') as unknown as string,
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-2',
        sensorType: 'temperature',
        encryptedData: 'enc-2',
        iv: 'iv-2',
        authTag: 'tag-2',
        keyVersion: 1,
      },
      {
        time: new Date('2026-03-23T09:54:00.000Z') as unknown as string,
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        encryptedData: 'enc-3',
        iv: 'iv-3',
        authTag: 'tag-3',
        keyVersion: 1,
      },
    ];
    qb.getMany.mockResolvedValue(rows);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    const result = await service.paginatedQuery({
      tenantId: 'tenant-1',
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
      limit: 2,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(1, 'm.tenantId = :tenantId', {
      tenantId: 'tenant-1',
    });
    expect(result).toEqual({
      data: rows.slice(0, 2),
      nextCursor: '2026-03-23T09:55:00.000Z|sensor-2',
      hasMore: true,
    });
  });

  it('supports legacy timestamp-only cursor values', async () => {
    const qb = createQueryBuilder();
    qb.getMany.mockResolvedValue([]);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    await service.paginatedQuery({
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
      cursor: '2026-03-23T09:59:00.000Z',
      limit: 2,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(3, 'm.time < :cursor', {
      cursor: '2026-03-23T09:59:00.000Z',
    });
  });

  it('falls back to legacy cursor condition when composite cursor is malformed', async () => {
    const qb = createQueryBuilder();
    qb.getMany.mockResolvedValue([]);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    await service.paginatedQuery({
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
      cursor: '2026-03-23T09:59:00.000Z|',
      limit: 2,
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(3, 'm.time < :cursor', {
      cursor: '2026-03-23T09:59:00.000Z|',
    });
  });

  it('builds a non paginated query with array filters', async () => {
    const qb = createQueryBuilder();
    qb.getMany.mockResolvedValue([]);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    await service.nonPaginatedQuery({
      gatewayId: ['gw-1', 'gw-2'],
      sensorId: ['sensor-1'],
      sensorType: ['temperature', 'humidity'],
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(
      1,
      'm.gatewayId IN (:...gatewayIds)',
      {
        gatewayIds: ['gw-1', 'gw-2'],
      },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      2,
      'm.sensorId IN (:...sensorIds)',
      {
        sensorIds: ['sensor-1'],
      },
    );
    expect(qb.andWhere).toHaveBeenNthCalledWith(
      3,
      'm.sensorType IN (:...sensorTypes)',
      {
        sensorTypes: ['temperature', 'humidity'],
      },
    );
  });

  it('builds a non paginated query without optional filters', async () => {
    const qb = createQueryBuilder();
    const rows: MeasureEntity[] = [
      {
        time: '2026-03-23T09:58:00.000Z',
        tenantId: 'tenant-1',
        gatewayId: 'gw-1',
        sensorId: 'sensor-1',
        sensorType: 'temperature',
        encryptedData: 'enc-1',
        iv: 'iv-1',
        authTag: 'tag-1',
        keyVersion: 1,
      },
    ];
    qb.getMany.mockResolvedValue(rows);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    const result = await service.nonPaginatedQuery({
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
    });

    expect(qb.andWhere).toHaveBeenCalledTimes(2);
    expect(qb.andWhere).toHaveBeenNthCalledWith(1, 'm.time >= :from', {
      from: '2026-03-23T09:50:00.000Z',
    });
    expect(qb.andWhere).toHaveBeenNthCalledWith(2, 'm.time <= :to', {
      to: '2026-03-23T10:00:00.000Z',
    });
    expect(qb.orderBy).toHaveBeenCalledWith('m.time', 'DESC');
    expect(result).toEqual(rows);
  });

  it('applies tenant filter for non paginated queries when tenantId is provided', async () => {
    const qb = createQueryBuilder();
    qb.getMany.mockResolvedValue([]);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const service = new MeasurePersistenceService(repository as never);

    await service.nonPaginatedQuery({
      tenantId: 'tenant-1',
      from: '2026-03-23T09:50:00.000Z',
      to: '2026-03-23T10:00:00.000Z',
    });

    expect(qb.andWhere).toHaveBeenNthCalledWith(1, 'm.tenantId = :tenantId', {
      tenantId: 'tenant-1',
    });
  });

  it('returns tenant measures occupied size in bytes', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const repository = {
      query: jest.fn().mockResolvedValue([{ data_size_at_rest: '2048' }]),
    };

    const service = new MeasurePersistenceService(repository as never);

    const result = await service.getTenantDataSizeAtRest(tenantId);

    expect(repository.query).toHaveBeenCalledWith(
      expect.stringContaining('SUM(pg_column_size(t))'),
      [tenantId],
    );
    expect(result).toBe(2048);
  });

  it('returns tenant measures occupied size when driver returns a finite number', async () => {
    const repository = {
      query: jest.fn().mockResolvedValue([{ data_size_at_rest: 1024 }]),
    };

    const service = new MeasurePersistenceService(repository as never);

    await expect(
      service.getTenantDataSizeAtRest('00000000-0000-0000-0000-000000000001'),
    ).resolves.toBe(1024);
  });

  it('falls back to zero when tenant data size is a non-finite number', async () => {
    const repository = {
      query: jest
        .fn()
        .mockResolvedValue([{ data_size_at_rest: Number.POSITIVE_INFINITY }]),
    };

    const service = new MeasurePersistenceService(repository as never);

    await expect(
      service.getTenantDataSizeAtRest('00000000-0000-0000-0000-000000000001'),
    ).resolves.toBe(0);
  });

  it('falls back to zero when tenant data size cannot be parsed', async () => {
    const repository = {
      query: jest.fn().mockResolvedValue([{ data_size_at_rest: 'invalid' }]),
    };

    const service = new MeasurePersistenceService(repository as never);

    const result = await service.getTenantDataSizeAtRest(
      '00000000-0000-0000-0000-000000000001',
    );

    expect(result).toBe(0);
  });

  it('falls back to zero when tenant data size query returns no rows', async () => {
    const repository = {
      query: jest.fn().mockResolvedValue([]),
    };

    const service = new MeasurePersistenceService(repository as never);

    await expect(
      service.getTenantDataSizeAtRest('00000000-0000-0000-0000-000000000001'),
    ).resolves.toBe(0);
  });
});
