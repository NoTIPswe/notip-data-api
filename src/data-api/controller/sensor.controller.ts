import { Controller, Query, Get } from '@nestjs/common';
import { SensorService } from '../services/sensor.service';
import { SensorDto } from '../dto/sensor.dto';
import { MeasureMapper } from '../measure.mapper';
import { getSensorsInput } from '../interfaces/get-sensors.input';

@Controller('sensor')
export class SensorController {
  constructor(private readonly ss: SensorService) {}

  @Get()
  async getSensors(@Query('gatewayId') gatewayId?: string): Promise<SensorDto> {
    const input: getSensorsInput = {
      gatewayId,
    };
    const sensorModel = await this.ss.getSensors(input);
    return MeasureMapper.toSensorDto(sensorModel);
  }
}
