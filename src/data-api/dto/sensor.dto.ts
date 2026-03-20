import { ApiProperty } from '@nestjs/swagger';

export class SensorDto {
  @ApiProperty({ name: 'sensor_id' })
  sensorId: string;
  @ApiProperty({ name: 'sensor_type' })
  sensorType: string;
  @ApiProperty({ name: 'gateway_id' })
  gatewayId: string;
  @ApiProperty({ name: 'last_seen' })
  lastSeen: string;
}
