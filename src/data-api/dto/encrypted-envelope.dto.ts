import { ApiProperty } from '@nestjs/swagger';

export class EncryptedEnvelopeDto {
  @ApiProperty({ name: 'gateway_id' })
  gatewayId: string;
  @ApiProperty({ name: 'sensor_id' })
  sensorId: string;
  @ApiProperty({ name: 'sensor_type' })
  sensorType: string;
  @ApiProperty({ name: 'timestamp' })
  timestamp: string;
  @ApiProperty({ name: 'encrypted_data' })
  encryptedData: string;
  @ApiProperty({ name: 'iv' })
  iv: string;
  @ApiProperty({ name: 'auth_tag' })
  authTag: string;
  @ApiProperty({ name: 'key_version', type: Number })
  keyVersion: number;
}
