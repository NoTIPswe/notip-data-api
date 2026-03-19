export class EncryptedEnvelopeModel {
  gatewayId: string[];
  sensorId: string[];
  sensorType: string[];
  timestamp: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}