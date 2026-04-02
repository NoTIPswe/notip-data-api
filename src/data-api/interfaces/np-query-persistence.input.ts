export interface NpQueryPersistenceInput {
  tenantId?: string;
  gatewayId?: string[];
  sensorId?: string[];
  sensorType?: string[];
  from: string;
  to: string;
}
