import { ApiProperty } from '@nestjs/swagger';

export class SensorDto {
  @ApiProperty({
    description: 'Sensor identifier',
    example: 'sensor-1',
  })
  sensorId: string;
  @ApiProperty({
    description: 'Sensor type',
    example: 'temperature',
  })
  sensorType: string;
  @ApiProperty({
    description: 'Gateway identifier',
    example: 'gw-1',
  })
  gatewayId: string;
  @ApiProperty({
    description: 'Timestamp of the latest measure seen for the sensor',
    example: '2026-03-23T09:58:00.000Z',
    format: 'date-time',
  })
  lastSeen: string;
}
