import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { ErrorResponseDto } from './dto/error-response.dto';
import { QueryResponseDto } from './dto/query.response.dto';
import { SensorDto } from './dto/sensor.dto';

function apiGatewayIdQuery(description: string) {
  return ApiQuery({
    name: 'gatewayId',
    required: false,
    isArray: true,
    type: String,
    description,
    example: ['gw-1', 'gw-2'],
  });
}

function apiSensorIdQuery(description: string) {
  return ApiQuery({
    name: 'sensorId',
    required: false,
    isArray: true,
    type: String,
    description,
    example: ['sensor-1', 'sensor-2'],
  });
}

function apiSensorTypeQuery(description: string) {
  return ApiQuery({
    name: 'sensorType',
    required: false,
    isArray: true,
    type: String,
    description,
    example: ['temperature', 'humidity'],
  });
}

function apiTimeRangeQueries() {
  return applyDecorators(
    ApiQuery({
      name: 'from',
      required: true,
      description: 'Inclusive start timestamp in ISO 8601 format',
      schema: { type: 'string', format: 'date-time' },
      example: '2026-03-23T09:50:00.000Z',
    }),
    ApiQuery({
      name: 'to',
      required: true,
      description: 'Inclusive end timestamp in ISO 8601 format',
      schema: { type: 'string', format: 'date-time' },
      example: '2026-03-23T10:00:00.000Z',
    }),
  );
}

function apiMeasureFilterQueries(context: 'query' | 'stream' | 'export') {
  const gatewayDescription =
    context === 'stream'
      ? 'Repeat the parameter to filter the stream by multiple gateways, for example ?gatewayId=gw-1&gatewayId=gw-2'
      : 'Repeat the parameter to filter by multiple gateways, for example ?gatewayId=gw-1&gatewayId=gw-2';
  const sensorDescription =
    context === 'stream'
      ? 'Repeat the parameter to filter the stream by multiple sensors'
      : 'Repeat the parameter to filter by multiple sensors, for example ?sensorId=sensor-1&sensorId=sensor-2';
  const sensorTypeDescription =
    context === 'stream'
      ? 'Repeat the parameter to filter the stream by multiple sensor types'
      : 'Repeat the parameter to filter by multiple sensor types, for example ?sensorType=temperature&sensorType=humidity';

  return applyDecorators(
    apiGatewayIdQuery(gatewayDescription),
    apiSensorIdQuery(sensorDescription),
    apiSensorTypeQuery(sensorTypeDescription),
  );
}

function apiMeasureErrorResponses(badRequestDescription: string) {
  return applyDecorators(
    ApiBadRequestResponse({
      description: badRequestDescription,
      type: ErrorResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication failed',
      type: ErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Access to measures is forbidden',
      type: ErrorResponseDto,
    }),
  );
}

export function ApiMeasureQueryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Query measures with pagination',
      description:
        'Returns a single paginated page of encrypted measures in the requested time window.',
    }),
    apiTimeRangeQueries(),
    ApiQuery({
      name: 'limit',
      required: false,
      description: 'Page size. Defaults to 999 and must be less than 1000.',
      schema: { type: 'integer', minimum: 1, maximum: 999, default: 999 },
      example: 100,
    }),
    apiMeasureFilterQueries('query'),
    ApiQuery({
      name: 'cursor',
      required: false,
      description: 'Opaque cursor returned by a previous query page',
      schema: { type: 'string' },
      example: '2026-03-23T09:58:00.000Z',
    }),
    ApiOkResponse({
      description: 'Paginated measure page',
      type: QueryResponseDto,
      isArray: true,
    }),
    apiMeasureErrorResponses(
      'Invalid query parameters or time window too large',
    ),
  );
}

export function ApiMeasureStreamDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Open a live measure stream',
      description:
        'Streams matching encrypted measures as server-sent events using the text/event-stream media type.',
    }),
    ApiProduces('text/event-stream'),
    ApiQuery({
      name: 'since',
      required: false,
      description:
        'Optional timestamp used to replay historical measures before switching to real-time events',
      schema: { type: 'string', format: 'date-time' },
      example: '2026-03-23T09:50:00.000Z',
    }),
    apiMeasureFilterQueries('stream'),
    ApiOkResponse({
      description: 'Server-sent event stream containing encrypted measures',
      content: {
        'text/event-stream': {
          schema: { type: 'string' },
          example:
            'data: {"gatewayId":"gw-1","sensorId":"sensor-1","sensorType":"temperature","timestamp":"2026-03-23T09:58:00.000Z","encryptedData":"enc-3","iv":"iv-3","authTag":"tag-3","keyVersion":1}\n\ndata: {"type":"error","reason":"token_expired"}\n\n',
        },
      },
    }),
  );
}

export function ApiMeasureExportDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Export measures without pagination',
      description:
        'Returns all encrypted measures in the requested time window, up to the export limits enforced by the service.',
    }),
    apiTimeRangeQueries(),
    apiMeasureFilterQueries('export'),
    ApiOkResponse({
      description: 'Full list of matching encrypted measures',
      type: EncryptedEnvelopeDto,
      isArray: true,
    }),
    apiMeasureErrorResponses(
      'Invalid export parameters or time window too large',
    ),
  );
}

export function ApiSensorListDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List sensors seen in the last ten minutes',
      description:
        'Returns unique sensors observed recently, optionally filtered by a gateway identifier.',
    }),
    ApiQuery({
      name: 'gatewayId',
      required: false,
      description: 'Gateway identifier used to restrict the sensor list',
      schema: { type: 'string' },
      example: 'gw-1',
    }),
    ApiOkResponse({
      description: 'Unique sensors with their latest observation timestamp',
      type: SensorDto,
      isArray: true,
    }),
    ApiUnauthorizedResponse({
      description: 'Authentication failed',
      type: ErrorResponseDto,
    }),
    ApiForbiddenResponse({
      description: 'Access to sensors is forbidden',
      type: ErrorResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'Gateway or resource not found',
      type: ErrorResponseDto,
    }),
  );
}
