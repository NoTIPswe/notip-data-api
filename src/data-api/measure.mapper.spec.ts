import { firstValueFrom, of } from 'rxjs';
import { MeasureMapper } from './measure.mapper';
import { MeasureEntity } from './entity/measure.entity';
import { EncryptedEnvelopeModel } from './models/encrypted-envelope.model';

describe('MeasureMapper', () => {
  const entity: MeasureEntity = {
    time: '2026-03-23T09:58:00.000Z',
    tenantId: 'tenant-1',
    gatewayId: 'gw-1',
    sensorId: 'sensor-1',
    sensorType: 'temperature',
    encryptedData: 'enc',
    iv: 'iv',
    authTag: 'tag',
    keyVersion: 1,
  };

  const model: EncryptedEnvelopeModel = {
    gatewayId: 'gw-1',
    sensorId: 'sensor-1',
    sensorType: 'temperature',
    timestamp: '2026-03-23T09:58:00.000Z',
    encryptedData: 'enc',
    iv: 'iv',
    authTag: 'tag',
    keyVersion: 1,
  };

  it('maps an encrypted envelope model to dto', () => {
    expect(MeasureMapper.toEncryptedEnvelopeDto(model)).toEqual(model);
  });

  it('maps a paginated query model to dto', () => {
    expect(
      MeasureMapper.toQueryResponseDto({
        data: [model],
        nextCursor: 'cursor-1',
        hasMore: true,
      }),
    ).toEqual({
      data: [model],
      nextCursor: 'cursor-1',
      hasMore: true,
    });
  });

  it('maps paginated query models to dto array', () => {
    expect(
      MeasureMapper.toQueryResponseDtos([
        {
          data: [model],
          nextCursor: 'cursor-1',
          hasMore: true,
        },
      ]),
    ).toEqual([
      {
        data: [model],
        nextCursor: 'cursor-1',
        hasMore: true,
      },
    ]);
  });

  it('maps a paginated query model with no data to dto', () => {
    expect(
      MeasureMapper.toQueryResponseDto({
        nextCursor: 'cursor-1',
        hasMore: false,
      }),
    ).toEqual({
      data: undefined,
      nextCursor: 'cursor-1',
      hasMore: false,
    });
  });

  it('maps export models to dto array', () => {
    expect(MeasureMapper.toExportResponseDto([model])).toEqual([model]);
  });

  it('maps stream item and stream response', async () => {
    expect(MeasureMapper.toStreamItemResponseDto(model)).toEqual(model);

    await expect(
      firstValueFrom(MeasureMapper.toStreamResponseDto(of(model))),
    ).resolves.toEqual(model);
  });

  it('maps an entity to encrypted envelope model', () => {
    expect(MeasureMapper.toEncryptedEnvelopeModel(entity)).toEqual(model);
    expect(MeasureMapper.toEncryptedEnvelopeModels([entity])).toEqual([model]);
  });

  it('maps a paginated persistence result to paginated query model', () => {
    expect(
      MeasureMapper.toPaginatedQueryModel({
        data: [entity],
        nextCursor: 'cursor-1',
        hasMore: true,
      }),
    ).toEqual({
      data: [model],
      nextCursor: 'cursor-1',
      hasMore: true,
    });
  });

  it('maps sensor models to dto', () => {
    const sensorModel = {
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      lastSeen: '2026-03-23T09:58:00.000Z',
    };

    expect(MeasureMapper.toSensorDto(sensorModel)).toEqual(sensorModel);
    expect(MeasureMapper.toSensorDtos([sensorModel])).toEqual([sensorModel]);
  });
});
