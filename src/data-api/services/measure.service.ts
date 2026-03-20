import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EncryptedEnvelopeModel } from './../models/encrypted-envelope.model';
import { MeasurePersistenceService } from './measure.persistence.service';
import { PaginatedQueryModel } from './../models/paginated-query.model';
import { ExportInput } from './../interfaces/export.input';
import { QueryInput } from './../interfaces/query.input';
import { PQueryPersistenceInput } from './../interfaces/p-query-persistence.input';
import { MeasureMapper } from './../measure.mapper';
import { NpQueryPersistenceInput } from './../interfaces/np-query-persistence.input';

@Injectable()
export class MeasureService {
  constructor(private readonly mps: MeasurePersistenceService) {}

  async query(input: QueryInput): Promise<PaginatedQueryModel> {
    const pInput: PQueryPersistenceInput = {
      gatewayId: input.gatewayId,
      sensorId: input.sensorId,
      sensorType: input.sensorType,
      from: input.from,
      to: input.to,
      cursor: input.cursor,
      limit: input.limit,
    };

    try {
      const result = await this.mps.paginatedQuery(pInput);
      return MeasureMapper.toPaginatedQueryModel(result);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const code = error?.code ?? error?.response?.data?.code;

      if (status === 400) {
        throw new BadRequestException(
          error?.response?.data ?? error?.message ?? 'Bad request',
        );
      }

      if (status === 401) {
        throw new UnauthorizedException(
          error?.response?.data ?? error?.message ?? 'Unauthorized',
        );
      }

      if (status === 403) {
        throw new ForbiddenException(
          error?.response?.data ?? error?.message ?? 'Forbidden',
        );
      }

      if (code === 'QUERY_WINDOW_EXCEEDED' || code === 'QUERY_LIMIT_EXCEEDED') {
        throw new BadRequestException(
          error?.response?.data ?? error?.message ?? 'Bad request',
        );
      }

      throw error;
    }
  }

  async export(input: ExportInput): Promise<EncryptedEnvelopeModel[]> {
    const pInput: NpQueryPersistenceInput = {
      gatewayId: input.gatewayId,
      sensorId: input.sensorId,
      sensorType: input.sensorType,
      from: input.from,
      to: input.to,
    };

    try {
      const result = await this.mps.nonPaginatedQuery(pInput);
      return MeasureMapper.toEncryptedEnvelopeModels(result);
    } catch (error: any) {
      const status = error?.status ?? error?.response?.status;
      const code = error?.code ?? error?.response?.data?.code;

      if (status === 400 || code === 'EXPORT_WINDOW_EXCEEDED') {
        throw new BadRequestException(
          error?.response?.data ?? error?.message ?? 'Bad request',
        );
      }

      if (status === 401) {
        throw new UnauthorizedException(
          error?.response?.data ?? error?.message ?? 'Unauthorized',
        );
      }

      if (status === 403) {
        throw new ForbiddenException(
          error?.response?.data ?? error?.message ?? 'Forbidden',
        );
      }

      throw error;
    }
  }
}
