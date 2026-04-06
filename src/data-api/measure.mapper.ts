import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { QueryResponseDto } from './dto/query.response.dto';
import { EncryptedEnvelopeModel } from './models/encrypted-envelope.model';
import { PaginatedQueryModel } from './models/paginated-query.model';
import { MeasureEntity } from './entity/measure.entity';
import { PaginatedQuery } from './interfaces/paginated-query';
import { Observable, map } from 'rxjs';
import { SensorDto } from './dto/sensor.dto';
import { SensorModel } from './models/sensor.model';

const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const MIN_ENCRYPTED_DATA_BYTES = 8;

function isHexString(value: string): boolean {
  return value.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(value);
}

function decodeBase64(value: string): Buffer | undefined {
  const normalized = value.trim().replaceAll('-', '+').replaceAll('_', '/');

  if (normalized.length === 0 || normalized.length % 4 === 1) {
    return undefined;
  }

  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);

  try {
    const decoded = Buffer.from(padded, 'base64');
    if (decoded.length === 0) {
      return undefined;
    }

    // Guard against false positives (arbitrary strings that happen to decode).
    const roundTrip = decoded.toString('base64').replace(/=+$/u, '');
    const source = normalized.replace(/=+$/u, '');

    return roundTrip === source ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function toHexIfBase64(
  value: string,
  expectedBytes?: number,
  minBytes = 1,
): string {
  if (isHexString(value)) {
    return value.toLowerCase();
  }

  const decoded = decodeBase64(value);

  if (!decoded) {
    return value;
  }

  if (decoded.length < minBytes) {
    return value;
  }

  if (expectedBytes !== undefined && decoded.length !== expectedBytes) {
    return value;
  }

  return decoded.toString('hex');
}

function normalizeTimestamp(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export class MeasureMapper {
  static toEncryptedEnvelopeDto(
    model: EncryptedEnvelopeModel,
  ): EncryptedEnvelopeDto {
    return {
      gatewayId: model.gatewayId,
      sensorId: model.sensorId,
      sensorType: model.sensorType,
      timestamp: normalizeTimestamp(model.timestamp),
      encryptedData: toHexIfBase64(
        model.encryptedData,
        undefined,
        MIN_ENCRYPTED_DATA_BYTES,
      ),
      iv: toHexIfBase64(model.iv, IV_BYTES),
      authTag: toHexIfBase64(model.authTag, AUTH_TAG_BYTES),
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

  static toSensorDto(model: SensorModel): SensorDto {
    return {
      sensorId: model.sensorId,
      sensorType: model.sensorType,
      gatewayId: model.gatewayId,
      lastSeen: model.lastSeen,
    };
  }

  static toSensorDtos(models: SensorModel[]): SensorDto[] {
    return models.map((model) => this.toSensorDto(model));
  }
}
