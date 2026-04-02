import { Controller, Query, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SensorService } from '../services/sensor.service';
import { SensorDto } from '../dto/sensor.dto';
import { MeasureMapper } from '../measure.mapper';
import { GetSensorsInput } from '../interfaces/get-sensors.input';
import { ApiSensorListDocs } from '../openapi.decorators';

@ApiTags('sensors')
@Controller('sensor')
export class SensorController {
  constructor(private readonly ss: SensorService) {}

  @ApiSensorListDocs()
  @Get()
  @ApiOperation({ summary: 'Get list of sensors with optional gateway filter' })
  @ApiResponse({
    status: 200,
    description: 'List of sensors',
    type: [SensorDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - invalid gatewayId format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async getSensors(
    @Query('gatewayId') gatewayId?: string,
  ): Promise<SensorDto[]> {
    const input: GetSensorsInput = {
      gatewayId,
    };
    const sensorModel = await this.ss.getSensors(input);
    return MeasureMapper.toSensorDtos(sensorModel);
  }
}
