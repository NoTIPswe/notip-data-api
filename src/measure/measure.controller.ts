import { Controller, Get, Query } from '@nestjs/common';
import { MeasureService } from './measure.service';
import { QueryResponseDto } from './dto/query.response.dto';
import { EncryptedEnvelopeDto } from './dto/encrypted-envelope.dto';
import { MeasureMapper } from './measure.mapper';


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

    const parsedLimit = limit ? Number(limit) : undefined;

    const queryModel = await this.ms.query(
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
      cursor,
      parsedLimit,
    );

    return MeasureMapper.toQueryResponseDto(queryModel);
  }


  @Get('stream')
  async stream(
    @Query('gatewayId') gatewayId?: string[],
    @Query('sensorId') sensorId?: string[],
    @Query('sensorType') sensorType?: string[],
  ): Promise<EncryptedEnvelopeDto>{
    const streamModel = await this.ms.stream(
      gatewayId,
      sensorId,
      sensorType,
    );
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
    const exportModel = await  this.ms.export(
      from,
      to,
      gatewayId,
      sensorId,
      sensorType,
    );
    return MeasureMapper.toExportResponseDto(exportModel);
  }

  
}