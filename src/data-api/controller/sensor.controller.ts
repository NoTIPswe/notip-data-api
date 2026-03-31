import { Controller, Query, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SensorService } from '../services/sensor.service';
import { SensorDto } from '../dto/sensor.dto';
import { MeasureMapper } from '../measure.mapper';
import { GetSensorsInput } from '../interfaces/get-sensors.input';
import { ApiSensorListDocs } from '../openapi.decorators';

@ApiTags('sensor')
@Controller('sensor')
export class SensorController {
  constructor(private readonly ss: SensorService) {}

  @ApiSensorListDocs()
  @Get()
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
