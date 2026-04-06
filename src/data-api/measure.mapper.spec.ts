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

  it('normalizes base64 envelope fields to hex and timestamp to ISO Z', () => {
    const normalized = MeasureMapper.toEncryptedEnvelopeDto({
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: '2026-04-06T16:41:58.10169+00:00',
      encryptedData: 'sJfpJlOKzE8TjcIngGnBw2DjBYL5H6e7qNdzk2ftcVWhONhdqqiVLA==',
      iv: 'KwLL8TQSYAAr98Ww',
      authTag: 'O9dM93uOH4GifyJNayKghA==',
      keyVersion: 1,
    });

    expect(normalized).toEqual({
      gatewayId: 'gw-1',
      sensorId: 'sensor-1',
      sensorType: 'temperature',
      timestamp: '2026-04-06T16:41:58.101Z',
      encryptedData:
        'b097e926538acc4f138dc2278069c1c360e30582f91fa7bba8d7739367ed7155a138d85daaa8952c',
      iv: '2b02cbf1341260002bf7c5b0',
      authTag: '3bd74cf77b8e1f81a27f224d6b22a084',
      keyVersion: 1,
    });
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
