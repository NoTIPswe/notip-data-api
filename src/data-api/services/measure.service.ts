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

const MAX_QUERY_LIMIT = 999;
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

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

type ErrorDetails = {
  status?: number;
  code?: string;
  message?: string;
  responseData?: unknown;
};

function extractErrorDetails(error: ServiceError): ErrorDetails {
  const responseData = error.response?.data;

  return {
    status: error.status ?? error.response?.status,
    code:
      error.code ??
      (typeof responseData === 'object' &&
      responseData !== null &&
      'code' in responseData
        ? (responseData as { code?: string }).code
        : undefined),
    message: error.message,
    responseData,
  };
}

function throwHttpException(
  ExceptionType: typeof BadRequestException,
  details: ErrorDetails,
  fallbackMessage: string,
): never;
function throwHttpException(
  ExceptionType: typeof UnauthorizedException,
  details: ErrorDetails,
  fallbackMessage: string,
): never;
function throwHttpException(
  ExceptionType: typeof ForbiddenException,
  details: ErrorDetails,
  fallbackMessage: string,
): never;
function throwHttpException(
  ExceptionType:
    | typeof BadRequestException
    | typeof UnauthorizedException
    | typeof ForbiddenException,
  details: ErrorDetails,
  fallbackMessage: string,
): never {
  throw new ExceptionType(
    details.responseData ?? details.message ?? fallbackMessage,
  );
}

@Injectable()
export class MeasureService {
  constructor(private readonly mps: MeasurePersistenceService) {}

  async query(input: QueryInput): Promise<PaginatedQueryModel[]> {
    this.validateQueryInput(input);

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
      return [MeasureMapper.toPaginatedQueryModel(result)];
    } catch (error: unknown) {
      if (isServiceError(error)) {
        this.handleQueryError(error);
      }

      throw error;
    }
  }

  async export(input: ExportInput): Promise<EncryptedEnvelopeModel[]> {
    this.validateExportInput(input);

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
        this.handleExportError(error);
      }

      throw error;
    }
  }

  private handleQueryError(error: ServiceError): never | void {
    const details = extractErrorDetails(error);

    if (details.status === 400 || this.isQueryLimitError(details.code)) {
      throwHttpException(BadRequestException, details, 'Bad request');
    }

    if (details.status === 401) {
      throwHttpException(UnauthorizedException, details, 'Unauthorized');
    }

    if (details.status === 403) {
      throwHttpException(ForbiddenException, details, 'Forbidden');
    }
  }

  private handleExportError(error: ServiceError): never | void {
    const details = extractErrorDetails(error);

    if (details.status === 400 || details.code === 'EXPORT_WINDOW_EXCEEDED') {
      throwHttpException(BadRequestException, details, 'Bad request');
    }

    if (details.status === 401) {
      throwHttpException(UnauthorizedException, details, 'Unauthorized');
    }

    if (details.status === 403) {
      throwHttpException(ForbiddenException, details, 'Forbidden');
    }
  }

  private isQueryLimitError(code?: string): boolean {
    return code === 'QUERY_WINDOW_EXCEEDED' || code === 'QUERY_LIMIT_EXCEEDED';
  }

  private validateQueryInput(input: QueryInput): void {
    if (input.limit > MAX_QUERY_LIMIT) {
      throw new BadRequestException({
        code: 'QUERY_LIMIT_EXCEEDED',
        message: 'limit must be less than 1000',
      });
    }

    this.validateWindow(input.from, input.to, 'QUERY_WINDOW_EXCEEDED');
  }

  private validateExportInput(input: ExportInput): void {
    this.validateWindow(input.from, input.to, 'EXPORT_WINDOW_EXCEEDED');
  }

  private validateWindow(
    from: string,
    to: string,
    code: 'QUERY_WINDOW_EXCEEDED' | 'EXPORT_WINDOW_EXCEEDED',
  ): void {
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();

    if (Number.isNaN(fromTime) || Number.isNaN(toTime)) {
      return;
    }

    if (toTime - fromTime > MAX_WINDOW_MS) {
      throw new BadRequestException({
        code,
        message: 'time window must be less than or equal to 24 hours',
      });
    }
  }
}
