import { Controller, Get, Query } from '@nestjs/common';
import { MeasureService } from './measure.service';
import { QueryResponseDto } from './dto/query.response.dto';
import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { MeasureMapper } from './measure.mapper';
import { QueryInput } from './query.input';
import { ExportInput } from './export.input';



@Controller('measures')
export class MeasureController {
  constructor(private readonly ms: MeasureService) {}

  @Get('query')
  async query(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<QueryResponseDto> {

    const input: QueryInput = {
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
      cursor,
      limit: limit ? Number(limit) : 100,
    };
    const queryModel = await this.ms.query(input);
    return MeasureMapper.toQueryResponseDto(queryModel);
  }


  @Get('stream')
  async stream(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
  ): Promise<EncryptedEnvelopeDto>{

    const input: ExportInput = {
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
    };
    const streamModel = await this.ms.stream(input);
    return MeasureMapper.toStreamResponseDto(streamModel);
  }


  @Get('export')
  async export(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
  ): Promise<EncryptedEnvelopeDto>{

    const input: ExportInput = {
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
    };
    const exportModel = await this.ms.export(input);
    return MeasureMapper.toStreamResponseDto(exportModel);
  }

  
}