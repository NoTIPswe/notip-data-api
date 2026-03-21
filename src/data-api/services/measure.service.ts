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

type ServiceError = {
  status?: number;
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
};

function isServiceError(error: unknown): error is ServiceError {
  return typeof error === 'object' && error !== null;
}

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
    } catch (error: unknown) {
      if (isServiceError(error)) {
        const status = error.status ?? error.response?.status;
        const responseData = error.response?.data;
        const code =
          error.code ??
          (typeof responseData === 'object' &&
          responseData !== null &&
          'code' in responseData
            ? (responseData as { code?: string }).code
            : undefined);

        if (status === 400) {
          throw new BadRequestException(
            responseData ?? error.message ?? 'Bad request',
          );
        }

        if (status === 401) {
          throw new UnauthorizedException(
            responseData ?? error.message ?? 'Unauthorized',
          );
        }

        if (status === 403) {
          throw new ForbiddenException(
            responseData ?? error.message ?? 'Forbidden',
          );
        }

        if (
          code === 'QUERY_WINDOW_EXCEEDED' ||
          code === 'QUERY_LIMIT_EXCEEDED'
        ) {
          throw new BadRequestException(
            responseData ?? error.message ?? 'Bad request',
          );
        }
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
    } catch (error: unknown) {
      if (isServiceError(error)) {
        const status = error.status ?? error.response?.status;
        const responseData = error.response?.data;
        const code =
          error.code ??
          (typeof responseData === 'object' &&
          responseData !== null &&
          'code' in responseData
            ? (responseData as { code?: string }).code
            : undefined);

        if (status === 400 || code === 'EXPORT_WINDOW_EXCEEDED') {
          throw new BadRequestException(
            responseData ?? error.message ?? 'Bad request',
          );
        }

        if (status === 401) {
          throw new UnauthorizedException(
            responseData ?? error.message ?? 'Unauthorized',
          );
        }

        if (status === 403) {
          throw new ForbiddenException(
            responseData ?? error.message ?? 'Forbidden',
          );
        }
      }

      throw error;
    }
  }
}
