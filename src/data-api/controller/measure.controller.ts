import { Controller, Get, Query, Sse, MessageEvent, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MeasureService } from './../services/measure.service';
import { QueryResponseDto } from './../dto/query.response.dto';
import { EncryptedEnvelopeDto } from './../dto/encrypted-envelope.dto';
import { MeasureMapper } from './../measure.mapper';
import { QueryInput } from './../interfaces/query.input';
import { ExportInput } from './../interfaces/export.input';
import { Observable, map } from 'rxjs';
import { StreamInput } from '../interfaces/stream.input';
import {
  StreamEmission,
  StreamListenerService,
} from '../services/stream-listener.service';
import type { Request } from 'express';
import {
  ApiMeasureExportDocs,
  ApiMeasureQueryDocs,
  ApiMeasureStreamDocs,
} from '../openapi.decorators';

const DEFAULT_QUERY_LIMIT = 999;

function normalizeLimit(value?: number | string): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_QUERY_LIMIT;
  }

  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? DEFAULT_QUERY_LIMIT : parsed;
}

function normalizeArrayParam(value?: string | string[]): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

function parseBearerToken(authorization?: string): string | undefined {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice('Bearer '.length);
}

function decodeBase64Url(value: string): string | undefined {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padding = (4 - (normalized.length % 4)) % 4;

  try {
    return Buffer.from(normalized + '='.repeat(padding), 'base64').toString(
      'utf8',
    );
  } catch {
    return undefined;
  }
}

function extractJwtContext(authorization?: string): {
  tenantId?: string;
  tokenExpiresAt?: number;
} {
  const token = parseBearerToken(authorization);

  if (!token) {
    return {};
  }

  const [, payload] = token.split('.');

  if (!payload) {
    return {};
  }

  const decoded = decodeBase64Url(payload);

  if (!decoded) {
    return {};
  }

  try {
    const parsed = JSON.parse(decoded) as {
      tenantId?: string;
      tenant_id?: string;
      exp?: number;
    };

    return {
      tenantId: parsed.tenantId ?? parsed.tenant_id,
      tokenExpiresAt:
        typeof parsed.exp === 'number' ? parsed.exp * 1000 : undefined,
    };
  } catch {
    return {};
  }
}

@ApiTags('measures')
@Controller('measures')
export class MeasureController {
  constructor(
    private readonly ms: MeasureService,
    private readonly sl: StreamListenerService,
  ) {}

  @ApiMeasureQueryDocs()
  @ApiOperation({ summary: 'Query encrypted measures with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated query results',
    type: QueryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - windows larger than 24h or limit greater than or equal to 1000',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  @Get('query')
  async query(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit?: number | string,
    @Query('gatewayId') gatewayId?: string | string[],
    @Query('sensorId') sensorId?: string | string[],
    @Query('sensorType') sensorType?: string | string[],
    @Query('cursor') cursor?: string,
  ): Promise<QueryResponseDto[]> {
    const input: QueryInput = {
      from,
      to,
      limit: normalizeLimit(limit),
      gatewayId: normalizeArrayParam(gatewayId),
      sensorId: normalizeArrayParam(sensorId),
      sensorType: normalizeArrayParam(sensorType),
      cursor,
    };

    const queryModel = await this.ms.query(input);
    return MeasureMapper.toQueryResponseDtos(queryModel);
  }

  @ApiMeasureStreamDocs()
  @Sse('stream')
  @ApiOperation({ summary: 'Stream encrypted measures in real-time' })
  @ApiResponse({
    status: 200,
    description: 'Stream of encrypted measures',
    type: EncryptedEnvelopeDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  stream(
    @Req() request: Request,
    @Query('gatewayId') gatewayId?: string | string[],
    @Query('sensorId') sensorId?: string | string[],
    @Query('sensorType') sensorType?: string | string[],
    @Query('since') since?: string,
  ): Observable<MessageEvent> {
    const jwtContext = extractJwtContext(request.headers.authorization);
    const input: StreamInput = {
      gatewayId: normalizeArrayParam(gatewayId),
      sensorId: normalizeArrayParam(sensorId),
      sensorType: normalizeArrayParam(sensorType),
      since,
      tenantId: jwtContext.tenantId,
      tokenExpiresAt: jwtContext.tokenExpiresAt,
    };

    return this.sl.stream(input).pipe(
      map((event: StreamEmission) =>
        event.kind === 'error'
          ? {
              data: {
                type: 'error',
                reason: event.reason,
              },
            }
          : {
              data: MeasureMapper.toEncryptedEnvelopeDto(event.data),
            },
      ),
    );
  }

  @ApiMeasureExportDocs()
  @Get('export')
  @ApiOperation({ summary: 'Export encrypted measures without pagination' })
  @ApiResponse({
    status: 200,
    description: 'Exported encrypted measures',
    type: [EncryptedEnvelopeDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - windows larger than 24h',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async export(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('gatewayId') gatewayId?: string | string[],
    @Query('sensorId') sensorId?: string | string[],
    @Query('sensorType') sensorType?: string | string[],
  ): Promise<EncryptedEnvelopeDto[]> {
    const input: ExportInput = {
      from,
      to,
      gatewayId: normalizeArrayParam(gatewayId),
      sensorId: normalizeArrayParam(sensorId),
      sensorType: normalizeArrayParam(sensorType),
    };

    const exportModel = await this.ms.export(input);
    return MeasureMapper.toExportResponseDto(exportModel);
  }
}
