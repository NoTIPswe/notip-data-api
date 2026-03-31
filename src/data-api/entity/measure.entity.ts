import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'telemetry_data' })
export class MeasureEntity {
  @PrimaryColumn({ name: 'time', type: 'timestamptz' })
  time: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
  @Column({ name: 'gateway_id', type: 'uuid' })
  gatewayId: string;
  @Column({ name: 'sensor_id', type: 'uuid' })
  sensorId: string;
  @Column({ name: 'sensor_type', type: 'varchar', length: 255 })
  sensorType: string;
  @Column({ name: 'encrypted_data', type: 'varchar', length: 255 })
  encryptedData: string;
  @Column({ name: 'iv', type: 'varchar', length: 255 })
  iv: string;
  @Column({ name: 'auth_tag', type: 'varchar', length: 255 })
  authTag: string;
  @Column({ name: 'key_version', type: 'integer' })
  keyVersion: number;
}
