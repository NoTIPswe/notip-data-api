import { Controller, Query, Get } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SensorService } from '../services/sensor.service';
import { SensorDto } from '../dto/sensor.dto';
import { MeasureMapper } from '../measure.mapper';
import { getSensorsInput } from '../interfaces/get-sensors.input';
import { ErrorResponseDto } from '../dto/error-response.dto';

@ApiTags('sensor')
@Controller('sensor')
export class SensorController {
  constructor(private readonly ss: SensorService) {}

  @ApiOperation({
    summary: 'List sensors seen in the last ten minutes',
    description:
      'Returns unique sensors observed recently, optionally filtered by a gateway identifier.',
  })
  @ApiQuery({
    name: 'gatewayId',
    required: false,
    description: 'Gateway identifier used to restrict the sensor list',
    schema: { type: 'string' },
    example: 'gw-1',
  })
  @ApiOkResponse({
    description: 'Unique sensors with their latest observation timestamp',
    type: SensorDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication failed',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access to sensors is forbidden',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Gateway or resource not found',
    type: ErrorResponseDto,
  })
  @Get()
  async getSensors(
    @Query('gatewayId') gatewayId?: string,
  ): Promise<SensorDto[]> {
    const input: getSensorsInput = {
      gatewayId,
    };
    const sensorModel = await this.ss.getSensors(input);
    return MeasureMapper.toSensorDtos(sensorModel);
  }
}
