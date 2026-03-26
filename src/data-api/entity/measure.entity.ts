export class MeasureEntity {
  time: string;
  tenantId: string;
  gatewayId: string;
  sensorId: string;
  sensorType: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}
