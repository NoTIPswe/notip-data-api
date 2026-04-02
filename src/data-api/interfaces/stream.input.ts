export interface StreamInput {
  gatewayId?: string[];
  sensorId?: string[];
  sensorType?: string[];
  since?: string;
  tenantId?: string;
  tokenExpiresAt?: number;
}
