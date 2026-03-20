import { Controller, Get, Query } from '@nestjs/common';
import { MeasureService } from './../services/measure.service';
import { QueryResponseDto } from './../dto/query.response.dto';
import { EncryptedEnvelopeDto } from './../dto/encrypted-envelope.dto';
import { MeasureMapper } from './../measure.mapper';
import { QueryInput } from './../interfaces/query.input';
import { ExportInput } from './../interfaces/export.input';
import { Observable } from 'rxjs';
import { StreamInput } from '../interfaces/stream.input';
import { StreamListenerService } from '../services/stream-listener.service';


@Controller('measures')
export class MeasureController {
  constructor(private readonly ms: MeasureService, private readonly sl: StreamListenerService) {}

  @Get('query')
  async query(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit: string,
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
    @Query('cursor') cursor?: string,
  ): Promise<QueryResponseDto> {

    const input: QueryInput = {
      from,
      to,
      limit: limit ? Number(limit) : 1000,
      gatewayId,
      sensorId,
      sensorType,
      cursor,
    };
    const queryModel = await this.ms.query(input);
    return MeasureMapper.toQueryResponseDto(queryModel);
  }


  @Get('stream')
  stream(
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
  ): Observable<EncryptedEnvelopeDto>{

    const input : StreamInput ={
      gatewayId,
      sensorId,
      sensorType,
    };
    const streamModel = this.sl.stream(input);
    return MeasureMapper.toStreamResponseDto(streamModel);
  }


  @Get('export')
  async export(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
  ): Promise<EncryptedEnvelopeDto[]>{

    const input: ExportInput = {
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
    };
    const exportModel = await this.ms.export(input);
    return MeasureMapper.toExportResponseDto(exportModel);
  }

  
}