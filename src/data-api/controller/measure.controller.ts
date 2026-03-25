import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MeasureService } from './../services/measure.service';
import { QueryResponseDto } from './../dto/query.response.dto';
import { EncryptedEnvelopeDto } from './../dto/encrypted-envelope.dto';
import { MeasureMapper } from './../measure.mapper';
import { QueryInput } from './../interfaces/query.input';
import { ExportInput } from './../interfaces/export.input';
import { Observable, map } from 'rxjs';
import { StreamInput } from '../interfaces/stream.input';
import { StreamListenerService } from '../services/stream-listener.service';
import { EncryptedEnvelopeModel } from '../models/encrypted-envelope.model';
import { ErrorResponseDto } from '../dto/error-response.dto';

function normalizeArrayParam(value?: string | string[]): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}

@ApiTags('measures')
@Controller('measures')
export class MeasureController {
  constructor(
    private readonly ms: MeasureService,
    private readonly sl: StreamListenerService,
  ) {}

  @ApiOperation({
    summary: 'Query measures with pagination',
    description:
      'Returns a single paginated page of encrypted measures in the requested time window.',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Inclusive start timestamp in ISO 8601 format',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-03-23T09:50:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Inclusive end timestamp in ISO 8601 format',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-03-23T10:00:00.000Z',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Page size. Defaults to 1000 and cannot exceed 1000.',
    schema: { type: 'integer', minimum: 1, maximum: 1000, default: 1000 },
    example: 100,
  })
  @ApiQuery({
    name: 'gatewayId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple gateways, for example ?gatewayId=gw-1&gatewayId=gw-2',
    example: ['gw-1', 'gw-2'],
  })
  @ApiQuery({
    name: 'sensorId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple sensors, for example ?sensorId=sensor-1&sensorId=sensor-2',
    example: ['sensor-1', 'sensor-2'],
  })
  @ApiQuery({
    name: 'sensorType',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple sensor types, for example ?sensorType=temperature&sensorType=humidity',
    example: ['temperature', 'humidity'],
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Opaque cursor returned by a previous query page',
    schema: { type: 'string' },
    example: '2026-03-23T09:58:00.000Z',
  })
  @ApiOkResponse({
    description: 'Paginated measure page',
    type: QueryResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters or time window too large',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication failed',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access to measures is forbidden',
    type: ErrorResponseDto,
  })
  @Get('query')
  async query(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit: string,
    @Query('gatewayId') gatewayId?: string | string[],
    @Query('sensorId') sensorId?: string | string[],
    @Query('sensorType') sensorType?: string | string[],
    @Query('cursor') cursor?: string,
  ): Promise<QueryResponseDto[]> {
    const input: QueryInput = {
      from,
      to,
      limit: limit ? Number(limit) : 1000,
      gatewayId: normalizeArrayParam(gatewayId),
      sensorId: normalizeArrayParam(sensorId),
      sensorType: normalizeArrayParam(sensorType),
      cursor,
    };

    const queryModel = await this.ms.query(input);
    return MeasureMapper.toQueryResponseDtos(queryModel);
  }

  @ApiOperation({
    summary: 'Open a live measure stream',
    description:
      'Streams matching encrypted measures as server-sent events using the text/event-stream media type.',
  })
  @ApiProduces('text/event-stream')
  @ApiQuery({
    name: 'gatewayId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter the stream by multiple gateways, for example ?gatewayId=gw-1&gatewayId=gw-2',
    example: ['gw-1', 'gw-2'],
  })
  @ApiQuery({
    name: 'sensorId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter the stream by multiple sensors',
    example: ['sensor-1', 'sensor-2'],
  })
  @ApiQuery({
    name: 'sensorType',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter the stream by multiple sensor types',
    example: ['temperature', 'humidity'],
  })
  @ApiOkResponse({
    description: 'Server-sent event stream containing encrypted measures',
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
        example:
          'data: {"gatewayId":"gw-1","sensorId":"sensor-1","sensorType":"temperature","timestamp":"2026-03-23T09:58:00.000Z","encryptedData":"enc-3","iv":"iv-3","authTag":"tag-3","keyVersion":1}\n\n',
      },
    },
  })
  @Sse('stream')
  stream(
    @Query('gatewayId') gatewayId?: string | string[],
    @Query('sensorId') sensorId?: string | string[],
    @Query('sensorType') sensorType?: string | string[],
  ): Observable<MessageEvent> {
    const input: StreamInput = {
      gatewayId: normalizeArrayParam(gatewayId),
      sensorId: normalizeArrayParam(sensorId),
      sensorType: normalizeArrayParam(sensorType),
    };

    return this.sl.stream(input).pipe(
      map((model: EncryptedEnvelopeModel) => ({
        data: MeasureMapper.toEncryptedEnvelopeDto(model),
      })),
    );
  }

  @ApiOperation({
    summary: 'Export measures without pagination',
    description:
      'Returns all encrypted measures in the requested time window, up to the export limits enforced by the service.',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    description: 'Inclusive start timestamp in ISO 8601 format',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-03-23T09:50:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    description: 'Inclusive end timestamp in ISO 8601 format',
    schema: { type: 'string', format: 'date-time' },
    example: '2026-03-23T10:00:00.000Z',
  })
  @ApiQuery({
    name: 'gatewayId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple gateways, for example ?gatewayId=gw-1&gatewayId=gw-2',
    example: ['gw-1', 'gw-2'],
  })
  @ApiQuery({
    name: 'sensorId',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple sensors, for example ?sensorId=sensor-1&sensorId=sensor-2',
    example: ['sensor-1', 'sensor-2'],
  })
  @ApiQuery({
    name: 'sensorType',
    required: false,
    isArray: true,
    type: String,
    description:
      'Repeat the parameter to filter by multiple sensor types, for example ?sensorType=temperature&sensorType=humidity',
    example: ['temperature', 'humidity'],
  })
  @ApiOkResponse({
    description: 'Full list of matching encrypted measures',
    type: EncryptedEnvelopeDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid export parameters or time window too large',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication failed',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access to measures is forbidden',
    type: ErrorResponseDto,
  })
  @Get('export')
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
