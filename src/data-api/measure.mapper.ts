import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { QueryResponseDto } from './dto/query.response.dto';
import { EncryptedEnvelopeModel } from './models/encrypted-envelope.model';
import { PaginatedQueryModel } from './models/paginated-query.model';
import { MeasureEntity } from './entity/measure.entity';
import { PaginatedQuery } from './interfaces/paginated-query';
import { Observable, map } from 'rxjs';
import { SensorDto } from './dto/sensor.dto';
import { sensorModel } from './models/sensor.model';

export class MeasureMapper {
  static toEncryptedEnvelopeDto(
    model: EncryptedEnvelopeModel,
  ): EncryptedEnvelopeDto {
    return {
      gatewayId: model.gatewayId,
      sensorId: model.sensorId,
      sensorType: model.sensorType,
      timestamp: model.timestamp,
      encryptedData: model.encryptedData,
      iv: model.iv,
      authTag: model.authTag,
      keyVersion: model.keyVersion,
    };
  }

  static toQueryResponseDto(model: PaginatedQueryModel): QueryResponseDto {
    return {
      data: model.data?.map((item) => this.toEncryptedEnvelopeDto(item)),
      nextCursor: model.nextCursor,
      hasMore: model.hasMore,
    };
  }

  static toQueryResponseDtos(
    models: PaginatedQueryModel[],
  ): QueryResponseDto[] {
    return models.map((model) => this.toQueryResponseDto(model));
  }

  static toExportResponseDto(
    models: EncryptedEnvelopeModel[],
  ): EncryptedEnvelopeDto[] {
    return models.map((item) => this.toEncryptedEnvelopeDto(item));
  }

  static toStreamItemResponseDto(
    model: EncryptedEnvelopeModel,
  ): EncryptedEnvelopeDto {
    return this.toEncryptedEnvelopeDto(model);
  }

  static toStreamResponseDto(
    stream$: Observable<EncryptedEnvelopeModel>,
  ): Observable<EncryptedEnvelopeDto> {
    return stream$.pipe(map((model) => this.toStreamItemResponseDto(model)));
  }

  static toEncryptedEnvelopeModel(
    entity: MeasureEntity,
  ): EncryptedEnvelopeModel {
    return {
      gatewayId: entity.gatewayId,
      sensorId: entity.sensorId,
      sensorType: entity.sensorType,
      timestamp: entity.time,
      encryptedData: entity.encryptedData,
      iv: entity.iv,
      authTag: entity.authTag,
      keyVersion: entity.keyVersion,
    };
  }

  static toEncryptedEnvelopeModels(
    entities: MeasureEntity[],
  ): EncryptedEnvelopeModel[] {
    return entities.map((entity) => this.toEncryptedEnvelopeModel(entity));
  }

  static toPaginatedQueryModel(result: PaginatedQuery): PaginatedQueryModel {
    return {
      data: result.data?.map((entity) => this.toEncryptedEnvelopeModel(entity)),
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }

  static toSensorDto(model: sensorModel): SensorDto {
    return {
      sensorId: model.sensorId,
      sensorType: model.sensorType,
      gatewayId: model.gatewayId,
      lastSeen: model.lastSeen,
    };
  }

  static toSensorDtos(models: sensorModel[]): SensorDto[] {
    return models.map((model) => this.toSensorDto(model));
  }
}
