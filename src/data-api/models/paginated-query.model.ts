import { EncryptedEnvelopeModel } from './encrypted-envelope.model';
 
export interface PaginatedQueryModel {
  data: EncryptedEnvelopeModel[];
  nextCursor?: string;
  hasMore: boolean;
}