import { Controller, Get, Query, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
import {
  ApiMeasureExportDocs,
  ApiMeasureQueryDocs,
  ApiMeasureStreamDocs,
} from '../openapi.decorators';

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

  @ApiMeasureQueryDocs()
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

  @ApiMeasureStreamDocs()
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

  @ApiMeasureExportDocs()
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
