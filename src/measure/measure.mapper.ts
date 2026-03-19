import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { QueryResponseDto } from './dto/query.response.dto';
import { EncryptedEnvelopeModel } from './encrypted-envelope.model';
import { PaginatedQueryModel } from './paginated-query.model';

export class MeasureMapper {
  static toEncryptedEnvelopeDto( model: EncryptedEnvelopeModel,): EncryptedEnvelopeDto {
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
      data: model.data.map((item) => this.toEncryptedEnvelopeDto(item)),
      nextCursor: model.nextCursor,
      hasMore: model.hasMore,
    };
  }

  static toExportResponseDto(models: EncryptedEnvelopeModel[],): EncryptedEnvelopeDto[] {
    return models.map((item) => this.toEncryptedEnvelopeDto(item));
  }

  static toStreamResponseDto(model: EncryptedEnvelopeModel,): EncryptedEnvelopeDto {
    return this.toEncryptedEnvelopeDto(model);
  }
}