import { ApiProperty } from '@nestjs/swagger';

export class EncryptedEnvelopeDto {
  @ApiProperty({
    description: 'Gateway identifier that produced the measure',
    example: 'gw-1',
  })
  gatewayId: string;
  @ApiProperty({
    description: 'Sensor identifier inside the gateway',
    example: 'sensor-1',
  })
  sensorId: string;
  @ApiProperty({
    description: 'Sensor type',
    example: 'temperature',
  })
  sensorType: string;
  @ApiProperty({
    description: 'Time when the encrypted measure was recorded',
    example: '2026-03-23T09:58:00.000Z',
    format: 'date-time',
  })
  timestamp: string;
  @ApiProperty({
    description: 'Encrypted payload',
    example: 'enc-3',
  })
  encryptedData: string;
  @ApiProperty({
    description: 'Initialization vector used for encryption',
    example: 'iv-3',
  })
  iv: string;
  @ApiProperty({
    description: 'Authentication tag used for encryption',
    example: 'tag-3',
  })
  authTag: string;
  @ApiProperty({
    description: 'Encryption key version',
    example: 1,
    type: Number,
  })
  keyVersion: number;
}
