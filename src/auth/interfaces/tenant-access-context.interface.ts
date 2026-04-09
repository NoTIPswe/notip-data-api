import { Request } from 'express';

export type TenantStatus = 'active' | 'suspended';

export interface TenantAccessContext {
  tenantId: string;
  status: TenantStatus;
  readOnly: boolean;
}

export interface TenantAwareRequest extends Request {
  tenantAccess?: TenantAccessContext;
}
